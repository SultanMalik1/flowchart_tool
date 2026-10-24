# Image-to-flowchart MVP plan

## Goal and success criteria
- **Goal**: After a user uploads a flowchart image, the system generates an editable Mermaid flowchart and renders it on the canvas.
- **Success criteria**
  1. At least 70% of clear flowchart photos produce structurally valid Mermaid.
  2. When the model decides the image is not a flowchart, it still produces a draft flowchart and explains that in the reply.
  3. Average end-to-end time (upload to render) is under 20 seconds.

## Scope and constraints
- Only one JPG or PNG image, up to 5 MB.
- Full replacement only. No overlay or partial extension.
- Successful results return Mermaid. Structured JSON is not returned yet.
- No complex error correction. On failure, ask the user to upload a clearer image or describe the process in text.

## User flow
1. The user picks a mode in the AI sidebar (text generation or image generation).
2. They upload one flowchart image (or enter text), with an optional note.
3. The client shows progress for three stages: recognize, generate, render.
4. On a successful read, the reply shows a short explanation and a summary of key nodes, then calls `generate_flowchart` to place the Mermaid on the canvas.
5. If the image is not a flowchart, the system still generates a guessed flowchart and says: "The original image does not look like a flowchart. Here is a draft for reference."
6. If parsing fails, the reply explains why and how to improve the input.

## Technical approach

### Model call
- **Trigger**: The message contains an image, and no more than one image.
- **Model**: `bytedance-seed/seed-2.0-mini`.
- **System prompt requirements**
  - Recognize process nodes, arrows, and text.
  - Return JSON in this shape, depending on the mode in the next section:
    ```json
    {
      "mermaid": "flowchart LR ...",
      "title": "optional title",
      "notes": "explain here if the original image does not look like a flowchart"
    }
    ```
  - Keep the MVP prompt short enough to return that structure. Iterate later from test feedback.
- **Post-processing**
  - JSON parse failure returns an error.
  - Missing `mermaid`, or output that does not contain `flowchart` or `graph`, is a failure.
  - A simple regex checks the Mermaid. On failure, ask the user to retry.

### Mode control (option A)
- The sidebar has an explicit mode switch for `text_to_flowchart` or `image_to_flowchart`.
- Requests add `aiContext.mode`, set from the user's choice.
- `/api/ai/chat/flowchart/route.ts` picks the prompt and handling from `mode`:
  - `text_to_flowchart`: keep the current flow.
  - `image_to_flowchart`: run the image branch and require the JSON above.
- Usage records and logs include `mode` for stats and rate limits.

### Backend changes (`src/app/api/ai/chat/flowchart/route.ts`)
- Read `aiContext.mode` while parsing the body:
  1. When `mode === 'image_to_flowchart'`, require exactly one image and build the dedicated system prompt.
  2. Call the model and parse JSON. On success, build a `generate_flowchart` tool call (mode fixed to `replace`, description taken from `title` and `notes`).
  3. If `notes` says the image is not a flowchart, include that in the SSE text.
- Error handling: catch JSON and network errors, log them, and return one error response.
- Usage: mark `recordAIUsage` metadata with `{ mode: 'image_to_flowchart', hasImage: true }`.

### Frontend changes (`src/components/canvas/ai-chat-sidebar.tsx`)
- Add a mode switch. Default to text mode, with a manual switch to image mode.
- Set `aiContext.mode` from the selected mode:
  - Text mode → `text_to_flowchart`.
  - Image mode → `image_to_flowchart`.
- Image mode allows only one image and keeps the size check.
- Show Recognizing / Generating / Rendering from SSE updates.
- Render the model reply as Markdown, and highlight a "not a flowchart" notice.
- Keep using `addFlowchartToCanvas` to render Mermaid on the canvas.

## Development plan
1. **Lock the mode and API (0.5 day)**
   - Design the mode-switch UI and interaction.
   - Update the client and server contracts to support `aiContext.mode`.
   - Sketch the smallest prompt template and JSON output shape.
2. **Backend (1.5 days)**
   - Implement the image branch and model call in `route.ts`.
   - Parse the model JSON, build the `generate_flowchart` call, and add error handling and logs.
3. **Frontend (1 day)**
   - Add the mode switch, limit image mode to one upload, and set `mode`.
   - Add status copy and the "not a flowchart" message.
   - Verify the canvas render path.
4. **Self-test and rollout prep (0.5 day)**
   - Run typical images end to end and confirm the response shape and UI.
   - Write test notes for the follow-up test pass.

## Test plan

| Scenario | Sample | Expected result |
| --- | --- | --- |
| Clear vector flowchart | PNG exported from draw.io | Mermaid structure is correct; node and edge accuracy is at least 80% |
| Black-and-white hand drawing | Hand-drawn boxes, arrows, and text | Mermaid renders; a few node names may differ |
| Non-flowchart image | Org chart or a photo of process notes | A guessed flow is generated, with a notice that the original image does not look like a flowchart |
| Low-quality blurry photo | Whiteboard photo with glare and low sharpness | Failure message that suggests taking the photo again |
| Out of spec | Larger than 5 MB, or more than one image | The client rejects the upload |

## Rollout and later iterations
1. Integrate locally and internally, and collect success and failure samples.
2. Give a small team a limited rollout, then adjust the prompt or validation from the issues they find.
3. Later MVP directions:
   - Multiple images and whiteboard collages.
   - Structured JSON plus a node editor.
   - OCR and preprocessing for busy backgrounds.
   - A feedback loop and model tuning.
