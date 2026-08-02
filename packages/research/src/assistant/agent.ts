import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

import { createResearchModel, getModelSettings } from '../model.js';
import type { MassiveClient } from '../tools/massive.js';
import type { MassiveForm4Client } from '../tools/massive-form4.js';
import type { SecEdgarClient } from '../tools/sec-edgar.js';
import type { ResearchAssistantRequest } from './schemas.js';
import { createResearchTools } from './tools/catalog.js';

const MAX_TOOL_CALLS = 4;

type ResearchAssistantRunOptions = {
  request: ResearchAssistantRequest;
  modelEnvironment: Record<string, string | undefined>;
  secClient: Pick<
    SecEdgarClient,
    'getFundamentals' | 'getQuarterlyFundamentals' | 'getRecentFilings'
  >;
  marketClient: Pick<MassiveClient, 'getMarketSnapshot' | 'getPriceHistory'>;
  ownershipClient: Pick<MassiveForm4Client, 'getTransactions'>;
};

function systemPrompt() {
  return `You are a read-only U.S. equity research assistant.
For a company-specific question, infer the most likely U.S. ticker from the company name or symbol and pass that ticker to every tool. If the company is ambiguous, ask the user to clarify instead of guessing. For an obvious follow-up, use the company established by the recent conversation. State which ticker you researched in the final answer. Choose only the tools needed to answer the question. For quarterly revenue questions, call get_sec_fundamentals with period="quarterly" and use the requested number of quarters; two years means 8 quarters. For insider-transaction questions, use get_insider_transactions and preserve the distinction between open-market trades, grants, exercises, tax withholding, gifts, direct or indirect ownership, and disclosed Rule 10b5-1 plan status. Use activityTypes=["all"] when the user asks for all insider activity; never approximate "all" by selecting several categories. When comparing plan, ownership, security, or role categories, make one broad tool call with the relevant filter set to "all" and compare the returned records; do not make one call per category. The interface renders tool evidence as charts, metrics, and tables, so use concise GitHub-flavored Markdown for the takeaway and caveats rather than repeating every record. Do not infer motivation from a sale or from plan status. Cite factual claims with the source IDs returned by tools using [source-id]. Distinguish reported facts from your inference. If evidence is missing, say so. Never invent figures, filing details, or sources. Do not provide personalized investment advice. Keep the final answer concise and educational.`;
}

function conversationMessages(request: ResearchAssistantRequest): BaseMessage[] {
  const history = request.history.map((message) =>
    message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content),
  );
  return [...history, new HumanMessage(request.question)];
}

function completedToolCallCount(messages: BaseMessage[]) {
  return messages.filter((message) => ToolMessage.isInstance(message)).length;
}

function requestedTools(message?: BaseMessage) {
  return message && AIMessage.isInstance(message) ? (message.tool_calls ?? []) : [];
}

export function messageContentAsText(message?: BaseMessage) {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => ('text' in part ? part.text : ''))
    .join('\n');
}

export function createResearchAssistantRun(options: ResearchAssistantRunOptions) {
  const toolkit = createResearchTools({
    secClient: options.secClient,
    marketClient: options.marketClient,
    ownershipClient: options.ownershipClient,
  });
  const model = createResearchModel(getModelSettings(options.modelEnvironment));
  const modelWithTools = model.bindTools(toolkit.tools);

  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await modelWithTools.invoke([
      new SystemMessage(systemPrompt()),
      ...state.messages,
    ]);
    return { messages: [response] };
  }

  async function answerAtToolLimit(state: typeof MessagesAnnotation.State) {
    // The last AI message contains tool calls we intentionally did not execute. Remove it so the
    // final model request never contains unmatched tool calls.
    const completedConversation = state.messages.slice(0, -1);
    const response = await model.invoke([
      new SystemMessage(
        `${systemPrompt()} The four-tool limit has been reached. Answer using only evidence already present in the conversation and mention important missing evidence.`,
      ),
      ...completedConversation,
    ]);
    return { messages: [response] };
  }

  function routeAfterModel(state: typeof MessagesAnnotation.State) {
    const toolCalls = requestedTools(state.messages.at(-1));
    if (!toolCalls.length) return END;
    if (completedToolCallCount(state.messages) + toolCalls.length > MAX_TOOL_CALLS) {
      return 'answerAtToolLimit';
    }
    return 'tools';
  }

  const graph = new StateGraph(MessagesAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', new ToolNode(toolkit.tools, { handleToolErrors: true }))
    .addNode('answerAtToolLimit', answerAtToolLimit)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', routeAfterModel, {
      tools: 'tools',
      answerAtToolLimit: 'answerAtToolLimit',
      [END]: END,
    })
    .addEdge('tools', 'agent')
    .addEdge('answerAtToolLimit', END)
    .compile();

  return {
    graph,
    input: { messages: conversationMessages(options.request) },
    getSources: toolkit.getSources,
    getContentBlocks: toolkit.getContentBlocks,
  };
}

export type ResearchAssistantRun = ReturnType<typeof createResearchAssistantRun>;
