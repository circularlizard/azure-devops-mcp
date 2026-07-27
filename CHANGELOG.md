# Changelog (fork)

This file tracks changes made in this fork ([circularlizard/azure-devops-mcp](https://github.com/circularlizard/azure-devops-mcp)) relative to upstream ([microsoft/azure-devops-mcp](https://github.com/microsoft/azure-devops-mcp)). Upstream's own release history is not duplicated here.

## Unreleased

### Added

- MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) on all 41 registered tools across every domain (`core`, `work`, `work-items`, `repositories`, `pipelines`, `wiki`, `test-plans`, `search`, `advanced-security`, `mcp-apps`), so MCP clients such as Claude Desktop can distinguish read-only tools from mutating/destructive ones when managing per-tool permissions. Added via a new shared preset module, `src/shared/tool-annotations.ts`.
- Test coverage for `src/tools/search.ts` (`test/src/tools/search.test.ts`), which previously had none.

### Changed

- Migrated every tool registration from the deprecated `server.tool(name, description, schema, handler)` API to the current `server.registerTool(name, config, handler)` API (`@modelcontextprotocol/sdk` 1.29.0).
- `src/tools/search.ts` handlers now wrap their logic in try/catch and return `{ isError: true }` on failure, matching the error-handling convention already used by every other domain file.
- Renamed the `WORKITEM_TOOLS` constant in `src/tools/work-items.ts` to `WORK_ITEM_TOOLS` for naming consistency with sibling domain files (`CORE_TOOLS`, `REPO_TOOLS`, `WORK_TOOLS`, etc.).

No tool names, parameters, schemas, or runtime behavior changed as part of this work — these are additive metadata and mechanical API-migration changes only.
