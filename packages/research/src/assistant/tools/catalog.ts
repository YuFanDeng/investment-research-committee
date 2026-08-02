import { createResearchToolContext, type CreateResearchToolContextOptions } from './context.js';
import { createMarketResearchTools } from './market.js';
import { createOwnershipResearchTools } from './ownership.js';
import { createSecResearchTools } from './sec.js';
import { createTechnicalResearchTools } from './technical.js';
import { createValuationResearchTools } from './valuation.js';

export function createResearchTools(options: CreateResearchToolContextOptions) {
  const context = createResearchToolContext(options);

  return {
    tools: [
      ...createSecResearchTools(context),
      ...createMarketResearchTools(context),
      ...createOwnershipResearchTools(context),
      ...createTechnicalResearchTools(context),
      ...createValuationResearchTools(context),
    ],
    getSources: context.getSources,
    getContentBlocks: context.getContentBlocks,
  };
}
