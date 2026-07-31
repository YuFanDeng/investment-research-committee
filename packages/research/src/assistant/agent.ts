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
import type { SecEdgarClient } from '../tools/sec-edgar.js';
import type { ResearchAssistantRequest } from './schemas.js';
import { createResearchTools } from './tools/catalog.js';

const MAX_TOOL_CALLS = 4;

type ResearchAssistantRunOptions = {
  request: ResearchAssistantRequest;
  modelEnvironment: Record<string, string | undefined>;
  secClient: Pick<SecEdgarClient, 'getFundamentals' | 'getRecentFilings'>;
  marketClient: Pick<MassiveClient, 'getMarketSnapshot' | 'getPriceHistory'>;
};

function systemPrompt(ticker: string) {
  return `You are a read-only equity research assistant answering questions about ${ticker}.
Choose only the tools needed to answer the user's question. Cite factual claims with the source IDs returned by tools using [source-id]. Distinguish reported facts from your inference. If evidence is missing, say so. Never invent figures, filing details, or sources. Do not provide personalized investment advice. Keep the final answer concise and educational.`;
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
    ticker: options.request.ticker,
    secClient: options.secClient,
    marketClient: options.marketClient,
  });
  const model = createResearchModel(getModelSettings(options.modelEnvironment));
  const modelWithTools = model.bindTools(toolkit.tools);

  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await modelWithTools.invoke([
      new SystemMessage(systemPrompt(options.request.ticker)),
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
        `${systemPrompt(options.request.ticker)} The four-tool limit has been reached. Answer using only evidence already present in the conversation and mention important missing evidence.`,
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
  };
}

export type ResearchAssistantRun = ReturnType<typeof createResearchAssistantRun>;
