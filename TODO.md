# Build checklist

This is the current implementation sequence for the first local-model milestone.

- [x] 1. Complete the SEC-backed research vertical slice.
- [x] 2. Add a provider-aware Ollama model factory that reads local model configuration.
- [x] 3. Use Ollama structured output to generate `ResearchMemo` objects.
- [x] 4. Preserve the deterministic memo as a clear Ollama-unavailable fallback.
- [ ] 5. Add focused tests for schemas, structured output, and fallback behavior.
- [x] 6. Add GitHub Actions checks for formatting, type checking, and the web build.

After each step, review the technical decision and verify the result before moving on.

## Next milestones

- [ ] Run a live end-to-end memo with the configured local Ollama model.
- [ ] Add streaming research status and clearer model/fallback states to the UI.
- [ ] Add an architecture diagram, screenshots, evaluation results, and known limitations for the interview demo.
