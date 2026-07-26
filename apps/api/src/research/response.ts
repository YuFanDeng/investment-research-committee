import type { ResearchGraphResult, SecDataMode } from '@investment-research/research';

export function responseForResult(result: ResearchGraphResult, secDataMode: SecDataMode) {
  return {
    ticker: result.ticker,
    secDataMode,
    companyName: result.companyName,
    status: result.status,
    fundamentals: result.fundamentals,
    marketSnapshot: result.marketSnapshot,
    analystReports: result.analystReports,
    challengeReport: result.challengeReport,
    memo: result.memo,
    sources: result.sources,
    errors: result.errors,
  };
}
