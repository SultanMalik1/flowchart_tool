# Mastra Agent V1 Build State

## V1.1 Reopen — Styled Flowchart Local Editing

- SPEC ID: `FAI-STYLED-FLOWCHART-PATCH-V1.1`
- Status: `IMPLEMENTED`
- Risk: `STANDARD`
- Current stage: `COMPLETE`

The prior V1 delivery is preserved below as historical evidence. V1.1 reopens the
build because the Agent prompt emits explicit node `style` statements while the
patchability gate rejects every styled flowchart, forcing ordinary edits through
whole-diagram replacement.

V1.1 establishes one shared editable-flowchart capability profile for prompt,
parser, serializer, contracts, renderer, executor, and tests. The supported
dialect keeps stable IDs beginning with a letter or underscore and continuing
with letters, digits, underscores, or hyphens; `flowchart` / `graph` with
`LR`, `RL`, `TD`, or `BT`; rectangle, rounded, diamond, ellipse/stadium, and
circle nodes; solid or dashed directed edges; pipe edge labels; and the node
style keys `fill`, `stroke`, and `stroke-width`. Unsupported Mermaid constructs
continue to use explicit targeted replacement.

Each patchable edge uses the canonical semantic ID `source__target`; endpoint
changes use remove plus add, and parallel edges are replace-only. Older V1
metadata is normalized record by record so incompatible diagrams safely fall
back to targeted replacement without erasing unrelated valid records.

Safety requirements: successful local edits preserve untouched element IDs,
positions, sizes, styles, user-owned elements, and one-step Undo/Redo. Legacy
scenes may upgrade to patching only when their scene semantic IDs align with the
derived document; otherwise the first edit must safely replace the explicit
target rather than append duplicate semantic elements. No database, auth,
quota, Creem, usage, SSE, or deployment contract changes are allowed.

Plan Research: Grok 4.5 returned `REVISE`. The plan now explicitly filters edge
styles from serialization, preserves hyphenated IDs, validates the create and
post-patch patchability invariant, and gates legacy upgrades on scene/document
semantic-ID alignment.

### V1.1 Task Graph

| ID | Task | Owner | State |
| --- | --- | --- | --- |
| V11-T1 | Shared capability contract and RED tests | Test Writer / Main | COMPLETED |
| V11-T2 | Prompt, parser, contracts, serializer, renderer | Main | COMPLETED |
| V11-T3 | Safe scene alignment and create-to-patch executor path | Main | COMPLETED |
| V11-T4 | Tests, typecheck, build, scoped Biome | Main | COMPLETED |
| V11-T5 | Independent evaluator and authenticated Chrome true path | Evaluator / Main | COMPLETED |
| V11-T6 | Final evidence and completion state | Main | COMPLETED |

### V1.1 Evidence Log

- TDD RED: the first targeted run collected 47 tests; 38 passed and 9 failed on
  the intended gaps: styled flowcharts were non-patchable, style schemas were
  open, edge styles leaked into serialization, styled create used the legacy
  renderer, aligned legacy records could not upgrade, and the prompt omitted
  the shared dialect.
- TDD GREEN: the first implementation pass completed the affected diagram and
  Mastra suites at 16 files / 84 tests.
- Independent evaluator pass 1 found no P0 and three P1 issues: edge semantic-ID
  round-trip drift, HTML being misclassified as patchable, and all-or-nothing
  legacy metadata parsing. It also identified duplicate scene entities and
  invalid hex lengths as P2 issues. All were reproduced and repaired.
- Repair regression: 10 targeted files / 73 tests passed, including canonical
  edge add-update-remove continuity, styled create-label-style Canvas updates,
  exact scene-entity alignment, legacy V1 per-record fallback, and `full:*`
  targeted replacement followed by a later local patch.
- Full regression before Chrome QA: `pnpm test` passed 18 files / 103 tests.
- Type safety: `pnpm typecheck` exited 0.
- Production build: `pnpm build` generated 7 collections / 25 documents,
  compiled successfully, generated 41 static pages, and exited 0. Existing local
  warnings remain limited to absent `BETTER_AUTH_SECRET` and OAuth credentials.
- Scoped Biome: checked only 20 changed TypeScript files with no remaining
  diagnostics; full-repository lint was not run.
- Independent evaluator pass 2 returned `PASS` with zero P0/P1 after rerunning
  the prior failure inputs, 10 targeted files / 73 tests, typecheck, and diff
  checks.
- Authenticated Chrome E2E used only the dedicated test account and normal product
  paths. The real model created a styled cyclic LR flowchart, renamed `Done` to
  `Completed`, changed only its fill to `#4a90d9`, preserved its green stroke and
  `2px` width, passed one-step Undo/Redo, saved, reloaded, and then renamed `Start`
  to `Begin` without replacing the diagram.
- Chrome QA exposed two renderer defects not covered by the earlier fixture: a
  directed cycle collapsed the Kahn layout into one rank, and arrows used a fixed
  origin. Both received regression coverage. Cyclic graphs now retain directional
  ranks, arrow endpoints meet node boundaries, and reciprocal edges use separate
  routes.
- The final reload check exposed one history regression: asynchronously hydrated
  saved scenes used Excalidraw's default eventual capture, so the first new Patch
  after reload was not undoable. Saved-scene hydration is now explicitly a
  non-undoable history baseline. Chrome confirmed reload -> Patch enabled Undo,
  Undo restored `Begin`, Redo restored `Entry`, and a final Undo plus reload kept
  the persisted revision-3 `Begin` document unchanged.
- Final saved test artifact: `flowchart_1784619436000_l60on4p`, diagram revision
  `3`, LR direction, four stable node IDs, four stable canonical edge IDs, blue
  `Completed`, and amber `Begin`. Save/reload preserved all 14 generated elements.
- Test-account successful usage moved from `3` to `13`: ten successful canvas
  commits across the diagnostic reruns, each recorded exactly once; failed or
  non-committing browser actions created no usage record.
- Final gate after the Chrome-discovered renderer repairs: `pnpm test` passed 18
  files / 104 tests, `pnpm typecheck` exited 0, changed-file Biome checked 20
  TypeScript files with no diagnostics, and `pnpm build` generated all 41 pages
  and exited 0. The first build attempt overlapped the running Next dev server
  and invalidated their shared `.next` cache; after stopping dev, Next recreated
  the cache and the clean production build passed.
- Final gate after the saved-scene history repair: `pnpm test` passed 19 files /
  105 tests, `pnpm typecheck` exited 0, scoped Biome checked all 23 changed
  TypeScript files with no diagnostics, and the clean `pnpm build` generated all
  41 pages and exited 0 after the dev server was stopped.

## Locked SPEC

### Goal

Move the existing FlowchartAI generation path onto a single `FlowchartAgent` running on Mastra, and call the model configured by environment variables through Mastra's OpenRouter Gateway. Without adding product features, give Mermaid `flowchart` / `graph` real local edits, and improve first-load canvas startup, streaming feedback, and render commits.

### Constraints

- Stay on Vercel. Cloudflare keeps only DNS, R2, and the `cdn.flowchartai.org` CDN.
- Remove the OpenNext / Cloudflare Workers Next.js deploy chain. Do not change the R2/CDN storage implementation.
- Do not change the database schema, do not run `db:migrate` or `db:push`, and do not delete or update existing production data.
- Keep the current sign-in, authorization, quota, Creem review, and usage rules: record usage once only after a successful canvas commit. Failure, cancellation, and an unrendered result count as zero.
- Keep text generation and single-image generation. The model comes from environment variables.
- Every Vercel request must finish inside the existing 60-second limit. Browser tools must not leave the server waiting forever.
- Do not add arbitrary product limits such as node count, patch count, or change ratio, and do not add new product safety limits. Keep the existing validation and dependency defaults.
- Browser verification uses the Chrome skill only, not Playwright or DevTools.
- Run Biome only on changed files, not a write-mode lint of the whole repo.

### Scope

- One `FlowchartAgent`, the Mastra OpenRouter Gateway, text and single-image multimodal input, streamed text, and a complete canvas command.
- Keep the client's existing SSE event shape. The server maps the current Mastra `Agent.stream().fullStream` onto that stable protocol. The client fixes chunk buffering across the network.
- `DiagramDocument` v1, stable semantic IDs, an atomic `DiagramPatch`, and revision-conflict plus reference checks.
- `flowchart` / `graph` apply a local patch to a clear target. Untouched Excalidraw element IDs, positions, and user-drawn elements stay as they are.
- Other Mermaid types still generate, and only the identified target diagram is fully replaced. Other AI diagrams and user elements are not deleted.
- Legacy diagrams upgrade lazily when a single target can be identified safely. If the target is ambiguous, leave the canvas unchanged and ask the user to choose.
- Write an optional `flowchartAi` extension into the existing flowchart `content` JSON. No new table.
- Minimal feedback for canvas loading and agent state: loading the canvas, thinking, editing, rendering, done, or error.
- Page performance marks and one atomic `updateScene` commit, so the canvas does not remount, flash, or jump the whole diagram unnecessarily.

### Non-goals

- Do not add another agent, planner, reviewer, long-term memory, approval flow, or new product entry.
- Do not implement local patch for non-flowchart Mermaid types such as sequence, class, ER, or gantt.
- Do not rewrite the chat UI as AI SDK UI.
- Do not change plans, usage limits, auth, payments, or the database structure.
- Do not change the R2/CDN provider, and do not migrate existing files or data.

### Contracts

`DiagramDocument` v1：

```ts
{
  schemaVersion: 1;
  diagramId: string;
  diagramType: 'flowchart';
  mermaidKeyword: 'flowchart' | 'graph';
  direction: 'LR' | 'RL' | 'TD' | 'BT';
  revision: number;
  sourceMermaid: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
}
```

`DiagramPatch`：

```ts
{
  patchId: string;
  diagramId: string;
  baseRevision: number;
  operations: Array<
    | AddNode | UpdateNode | RemoveNode
    | AddEdge | UpdateEdge | RemoveEdge
  >;
}
```

Apply every operation to an in-memory copy, check the final references, then commit once. Deleting a node does not guess a reconnection. AI-managed elements carry `diagramId`, `semanticId`, `entityType`, `diagramType`, and `revision` in `customData`.

Target order: the currently selected `diagramId` first, then the only recognizable AI diagram on the canvas. If the target is ambiguous, do not change the diagram. Create when there is no target. Replace on an explicit rebuild or type change. Patch a flowchart target that can be patched. For anything that is not a flowchart, replace only the target diagram.

### Acceptance Criteria

- Signed-out users get 401 and exhausted quota gets 429 before any model call. A review rejection does not call the model.
- Both text and single-image input reach the OpenRouter model named by environment variables. The gateway model string is `openrouter/<provider>/<model>`.
- The SSE mapping sends only complete tool arguments. Abort or a dropped stream cannot produce a partial canvas commit or a usage record.
- Automated tests cover node and edge add, update, and remove for `flowchart` / `graph`, plus revision conflicts, invalid references, and atomic rollback.
- After a local edit, untouched element IDs and positions stay put, and user elements stay put. A non-flowchart target is fully replaced and nothing else is.
- A failed tool render records zero usage. A successful commit records usage exactly once. Undo, save, reload, and export stay compatible.
- Local send status is under 100ms. In a fixed environment, API ready p95 is at most 3s, time to interactive on a save scene is at most 4s, and time from a valid patch to canvas commit is at most 1s.
- Pass affected tests, typecheck, the production build, Biome on changed files, the real Chrome path, and Vercel Preview when external credentials are available.

## Plan Research

- Founder SPEC: LOCKED.
- Grok Plan Research: REVISE, with the same scope. Corrections: follow the installed Mastra 1.51 API; keep the existing SSE shape; consume only complete tool arguments; cover abort, auth, billing, and multimodal failure paths; remove the old OpenRouter SDK and OpenNext only after agent parity passes.
- Official docs check: the Mastra OpenRouter Gateway uses `openrouter/<provider>/<model>`. `Agent.stream()` returns `MastraModelOutput`, with `fullStream`, `textStream`, `abortSignal`, and tool configuration.

## Task Graph and Ownership

| ID | Task | Depends on | Owner | State |
| --- | --- | --- | --- | --- |
| T0 | Baseline, locked SPEC, dependencies, and the current Mastra contract | - | Main implementation owner | COMPLETED |
| T1 | RED contract tests | T0 | Test writer / Main integration | COMPLETED |
| T2 | Mastra agent, gateway, SSE, and parity | T1 | Main implementation owner | COMPLETED |
| T3 | Document/Patch/renderer/legacy/persistence | T1 | Main implementation owner | COMPLETED |
| T4 | Loading, status, performance, and deploy cleanup | T2, T3 | Main implementation owner | COMPLETED |
| T5 | GEB, tests, types, build, and scoped Biome | T2, T3, T4 | Main implementation owner | COMPLETED |
| T6 | Independent evaluator, Chrome QA, and Vercel Preview | T5 | Evaluator / Main integration | COMPLETED |

## Evidence Log

- Baseline commit: `d31db8b` on `codex/mastra-agent-v1`.
- Baseline worktree: clean.
- Runtime: Node `v22.22.2`, pnpm `10.7.0`.
- Current Mastra package checked: `@mastra/core@1.51.0`, Node `>=22.13.0`.
- Existing Vercel duration: `app/api/**/*` max 60 seconds.
- Existing database schema remains untouched.
- RED evidence: initial diagram/Mastra contract suites failed on missing modules before implementation; parser/renderer/executor suites followed the same RED-to-GREEN path.
- Initial implementation GREEN evidence: `pnpm test` passed 15 files / 56 tests, including guards, text/image request construction, SSE mapping and buffering, abort/usage gates, atomic patch/reconcile, target resolution, metadata, renderer and non-flow replacement.
- Evaluator RED evidence: the targeted resolver/parser/executor/metadata command produced 15 failures and 16 passes, reproducing metadata/Undo drift, partial legacy selection, non-faithful Patch syntax and ambiguous create.
- Evaluator repair GREEN evidence: `pnpm test` passed 16 files / 76 tests. Added coverage includes Preview base URL precedence, Undo -> save -> reload -> next Patch revision continuity, scene metadata removal after undoing create, complete legacy-generation targeting, identical-source generation separation, conservative Patch syntax fallback, ambiguity rejection and Excalidraw history version/nonce capture for the metadata carrier.
- Documentation generation: `pnpm docs` exited 0 and generated 7 collections / 25 documents during production build.
- Type safety: `pnpm typecheck` exited 0 after docs generation.
- Production build: `pnpm build` exited 0 on Next.js 15.2.6; compile, type validation, 41 static pages and trace collection completed. Canvas route shell First Load JS remained 113 kB. `@mastra/core` is listed in `serverExternalPackages` so Vercel traces the Node package directly instead of webpack-minifying it into the route bundle.
- Scoped lint: Biome checked 45 affected TypeScript files with no remaining diagnostics. Full-repository lint was intentionally not run.
- Deployment cleanup: removed OpenNext/Workers config, scripts and dependencies plus the legacy OpenRouter Agent/AI provider packages; retained Vercel `maxDuration: 60`, AWS SDK R2 storage and all CDN/R2 scripts.
- Performance implementation: edit data fetch starts in the small route chunk while the editor chunk downloads; the second full-screen wait/remount was removed; assistant/export/image/Mermaid paths are lazy and Mermaid conversion idle-preloads; local Patch does not zoom.
- Build warnings are limited to missing local `BETTER_AUTH_SECRET` and OAuth credentials; they are environment warnings, not compile failures.
- Chrome QA: authenticated Preview path passed with the dedicated test account. The seeded revision-1 graph loaded immediately; one Agent request changed only node B from `Ready` to `Approved`; node/edge placement and the user-owned `USER NOTE — KEEP` elements remained unchanged; one Undo restored `Ready`, one Redo restored `Approved`, Save reported `Saved!`, and reload restored revision 2. PNG export produced a valid 25,294-byte file.
- Vercel Preview: direct remote builds stalled during Next.js optimization and were cancelled without touching Production. The bounded fallback `vercel build --target preview` completed locally and `vercel deploy --prebuilt` produced READY deployment `dpl_EESikksc24vBSnYE9Ln6wf2yikq1` at `https://flowchartai-q6wq538tc-tanchaowens-projects.vercel.app`.
- Preview smoke: authenticated `vercel curl` followed `/en/canvas` to a `200` canvas response. `POST /api/ai/chat/flowchart` with a valid empty message array returned the expected `401 Authentication required`, proving the deployed Mastra route loads and rejects guests before any model invocation.
- Preview data verification: an exact-ID read of only the test account's new flowchart confirmed revision 2, source Mermaid containing `B{Approved}`, the two original edges, and unchanged user-owned element IDs/coordinates/sizes (`160,210,240,70` and `185,232,190,25`). The test account has exactly one successful `flowchart_generation` usage row and one login session.
- Independent evaluator: `/root/v1_mastra_local_edit_spec/v1_evaluator` initially returned FAIL; every P1 received a reproducing RED test and repair. The final follow-up result is PASS with zero P0/P1 and no newly identified P2.
- Producer final gate refresh: `pnpm test` passed 16 files / 76 tests, `pnpm typecheck` exited 0, `pnpm build` generated all 41 pages and exited 0, and read-only scoped Biome checked 46 changed TypeScript files with no diagnostics. Full-repository Biome was not run.

## Production Data Guardrail

Preview may use production-compatible environment configuration, but verification may only create one new test account and data owned by that account. It may update only newly created rows through normal product paths. It must never delete rows, update existing user rows, or run migration/push commands.

## Resume Point

`FAI-STYLED-FLOWCHART-PATCH-V1.1` is complete. Resume only for a newly approved
scope such as deployment, additional diagram dialects, or a separate UI change.
No migration, delete, Production deployment, push, or existing-user data write
was performed.
