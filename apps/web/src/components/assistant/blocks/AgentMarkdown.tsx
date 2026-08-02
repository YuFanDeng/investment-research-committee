import type { AssistantContentBlock } from '@investment-research/research/assistant-content';
import { ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import type { Source } from '../../../types/research';

type MarkdownBlock = Extract<AssistantContentBlock, { type: 'markdown' }>;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sourceLabel(source: Source) {
  return source.sourceType === 'sec_filing' ? 'SEC filing' : 'Market data';
}

function linkCitations(content: string, sources: Source[]) {
  let linkedContent = content;
  for (const source of sources) {
    const link = `[${sourceLabel(source)}](${source.url})`;
    linkedContent = linkedContent
      .replace(new RegExp(`\\[source-id:\\s*${escapeRegExp(source.id)}\\]`, 'g'), link)
      .replace(new RegExp(`\\[${escapeRegExp(source.id)}\\]`, 'g'), link);
  }
  return linkedContent;
}

export function AgentMarkdown({ block, sources }: { block: MarkdownBlock; sources: Source[] }) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children} <ExternalLink size={11} aria-hidden="true" />
            </a>
          ),
        }}
      >
        {linkCitations(block.content, sources)}
      </ReactMarkdown>
    </div>
  );
}
