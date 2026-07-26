import {
  createResearchCheckpointer,
  createResearchGraph,
  FixtureSecEdgarClient,
  type ResearchGraph,
  type SecDataMode,
} from '@investment-research/research';

type ResearchGraphCatalogOptions = {
  secContactEmail: string;
  modelEnvironment: Record<string, string | undefined>;
};

export type ResearchGraphCatalog = {
  forRequest(secDataMode: SecDataMode, approvalRequired?: boolean): ResearchGraph;
};

export function createResearchGraphCatalog(
  options: ResearchGraphCatalogOptions,
): ResearchGraphCatalog {
  const sharedOptions = {
    secContactEmail: options.secContactEmail,
    modelEnvironment: options.modelEnvironment,
  };
  const fixtureClient = new FixtureSecEdgarClient();

  const liveResearchGraph = createResearchGraph(sharedOptions);
  const fixtureResearchGraph = createResearchGraph({
    ...sharedOptions,
    secClient: fixtureClient,
  });
  const liveApprovalGraph = createResearchGraph({
    ...sharedOptions,
    requireHumanApproval: true,
    checkpointer: createResearchCheckpointer(),
  });
  const fixtureApprovalGraph = createResearchGraph({
    ...sharedOptions,
    secClient: fixtureClient,
    requireHumanApproval: true,
    checkpointer: createResearchCheckpointer(),
  });

  return {
    forRequest(secDataMode, approvalRequired = false) {
      if (approvalRequired) {
        return secDataMode === 'fixture' ? fixtureApprovalGraph : liveApprovalGraph;
      }
      return secDataMode === 'fixture' ? fixtureResearchGraph : liveResearchGraph;
    },
  };
}
