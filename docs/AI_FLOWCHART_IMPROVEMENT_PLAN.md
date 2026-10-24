# Flowchart AI incremental generation notes

> Updated: 2025-10-01

## Goal

When the AI generates a flowchart, it should distinguish `replace` from `extend`, reuse existing content, avoid stacking duplicates, and keep the canvas consistent with saved state after every generation.

## Steps

1. **Collect context**
   - **Current canvas snapshot**: Before calling the AI, extract structured nodes, text, connectors, and coordinates from Excalidraw into `canvasSnapshot`, including manual edits.
   - **Previous AI Mermaid, when it exists**: Keep the latest Mermaid string, its time, and related elements for the model. If the user has changed the diagram substantially, `canvasSnapshot` still wins.
   - **One context payload**: The client sends `aiContext = { canvasSnapshot, lastMermaid }`. The server inserts it into the system prompt or an extra message so the model understands the current diagram and chooses `replace` or `extend`.
   - **Implementation steps**:
     1. Extend `getCanvasState()` so it returns structured nodes and connectors, not only a text description.
     2. Keep a `lastMermaid` cache. Update it on generation. Clearing or expiry is a product decision.
     3. Send `aiContext` with `/api/ai/chat/flowchart`. The server adds it to the prompt so the model draws from the real current state.

2. **Adjust the prompt and mode protocol**
   - Rewrite the system prompt so the trigger for replace versus extend is explicit.
   - Attach the previous Mermaid, the new request, and a short canvas description so the model generates in the chosen mode.

3. **Improve client merge behavior**
   - `replace`: remove every AI element, then place the latest output.
   - `extend`: merge or dedupe by node identity, and nudge positions when needed so the result is not a simple concatenation.

4. **Verify loops and debug**
   - Manually check typical cases: add a branch, edit a node, and extend part of the diagram.
   - Iterate the prompt or merge strategy from that feedback so the experience stays stable.

5. **Autosave and status**
   - After a successful generation, save or remind the user to save so canvas content is not lost.
   - Say clearly whether the diagram was replaced or extended.

## Notes

- Very large flowcharts are not the main problem yet. Revisit that if users report it.
- If prompt changes still leave stacked duplicates, compare differences or validate graph structure inside the extend path.
