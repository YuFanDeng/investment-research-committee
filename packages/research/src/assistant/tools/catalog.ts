import { createResearchToolContext, type CreateResearchToolContextOptions } from './context.js';
import { createMarketResearchTools } from './market.js';
import { createSecResearchTools } from './sec.js';
import { createValuationResearchTools } from './valuation.js';

export function createResearchTools(options: CreateResearchToolContextOptions) {
  const context = createResearchToolContext(options);

  return {
    tools: [
      ...createSecResearchTools(context),
      ...createMarketResearchTools(context),
      ...createValuationResearchTools(context),
    ],
    getSources: context.getSources,
  };
}
