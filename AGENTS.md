# Working in this repository

## Human-friendly code is required

This is a learning project. Write code that a frontend developer can read, trace, and explain in an interview.

- Prefer small, single-purpose modules and functions with specific domain names.
- Keep UI components, API routes, LangGraph orchestration, and external-data clients separate.
- Validate untrusted values at system boundaries with Zod; do not pass unstructured external data through the application.
- Use explicit TypeScript types when they clarify a data shape or workflow contract.
- Explain non-obvious business rules and external-data quirks with concise comments. Do not comment obvious syntax.
- Avoid premature abstractions, clever compression, and large functions that combine unrelated responsibilities.
- Preserve the source trail: factual research output must retain its SEC or other evidence URL and retrieval time.

## Formatting and verification

- Run `pnpm format` after code changes.
- Run `pnpm format:check` and the relevant type checks before handoff when dependencies are available.
- Do not manually reformat unrelated files; let Prettier handle formatting.

## Current architecture

- `apps/web`: React + Vite dashboard.
- `apps/api`: Hono API server; secrets and external API calls stay here.
- `packages/research`: LangGraph state, workflow nodes, schemas, and research tools.
- `docs`: project plan and architectural decisions.
