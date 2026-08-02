import type { DataTableContentBlock } from '@investment-research/research/assistant-content';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';

import type { Source } from '../../../types/research';
import { formatCurrency, formatDate, formatNumber, humanize } from './formatters';

type TableValue = string | number | boolean | null;

function CellValue({
  format,
  sources,
  value,
}: {
  format: DataTableContentBlock['columns'][number]['format'];
  sources: Source[];
  value: TableValue | undefined;
}) {
  if (value === null || value === undefined || value === '')
    return <span className="is-muted">—</span>;
  if (format === 'currency' && typeof value === 'number') return formatCurrency(value);
  if (format === 'number' && typeof value === 'number') return formatNumber(value);
  if (format === 'date' && typeof value === 'string') return formatDate(value);
  if (format === 'badge')
    return <span className="assistant-table-badge">{humanize(String(value))}</span>;
  if (format === 'source' && typeof value === 'string') {
    const source = sources.find((candidate) => candidate.id === value);
    return source ? (
      <a className="assistant-table-source" href={source.url} target="_blank" rel="noreferrer">
        Filing <ExternalLink size={11} />
      </a>
    ) : (
      <span className="is-muted">Unavailable</span>
    );
  }
  return String(value);
}

export function AgentDataTable({
  block,
  sources,
}: {
  block: DataTableContentBlock;
  sources: Source[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded ? block.rows : block.rows.slice(0, block.initiallyVisibleRows);
  const hiddenCount = block.rows.length - block.initiallyVisibleRows;

  return (
    <section className="assistant-rich-block" aria-labelledby={`${block.id}-heading`}>
      <div className="assistant-rich-heading">
        <div>
          <h3 id={`${block.id}-heading`}>{block.title}</h3>
          {block.description ? <p>{block.description}</p> : null}
        </div>
      </div>
      <div className="assistant-table-scroll">
        <table className="assistant-data-table">
          <thead>
            <tr>
              {block.columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${String(row.date ?? 'row')}-${rowIndex}`}>
                {block.columns.map((column) => (
                  <td key={column.key}>
                    <CellValue value={row[column.key]} format={column.format} sources={sources} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenCount > 0 ? (
        <button
          type="button"
          className="assistant-table-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Show fewer transactions' : `Show ${hiddenCount} more transactions`}
        </button>
      ) : null}
    </section>
  );
}
