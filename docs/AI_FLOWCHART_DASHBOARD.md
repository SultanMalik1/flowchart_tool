# FlowChart AI - Dashboard MVP

## Overview

### MVP goal
The smallest diagram library for FlowChart AI:
1. Store and load diagrams (using the official Excalidraw approach)
2. An entry point for creating a new diagram

### Technical approach
- Use Excalidraw `serializeAsJSON` and `loadFromBlob`
- The database stores basic diagram info and the serialized payload

## Database design

### 1. Diagrams table (flowcharts)
```sql
CREATE TABLE flowcharts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL,              -- Excalidraw serializeAsJSON result
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_flowcharts_user_updated ON flowcharts(user_id, updated_at DESC);
```

## API

### Diagram management
```typescript
// List diagrams
GET /api/flowcharts
Response: { flowcharts: [{ id, title, createdAt, updatedAt }] }

// Diagram detail
GET /api/flowcharts/[id]
Response: { id, title, content, createdAt, updatedAt }

// Create a diagram
POST /api/flowcharts
Body: { title?, content }
Response: { id }

// Update a diagram
PUT /api/flowcharts/[id]
Body: { title?, content }

// Delete a diagram
DELETE /api/flowcharts/[id]
```

## Frontend components

### Dashboard page
```
/dashboard
├── CreateNewButton        # Create a new diagram
└── FlowchartList          # Diagram list
    └── FlowchartItem      # Diagram row
```

### Canvas page changes
- Load an existing diagram at `/canvas/[id]`
- Add autosave

## File structure

```
src/
├── app/api/
│   └── flowcharts/
│       ├── route.ts           # List and create
│       └── [id]/route.ts      # Detail, update, delete
├── app/[locale]/(protected)/dashboard/
│   └── page.tsx               # Dashboard page
├── app/[locale]/canvas/
│   ├── page.tsx               # New diagram
│   └── [id]/page.tsx          # Edit diagram
├── components/dashboard/
│   ├── create-new-button.tsx
│   ├── flowchart-list.tsx
│   └── flowchart-item.tsx
├── components/canvas/
│   └── auto-save.tsx          # Autosave
├── db/schema/
│   └── flowcharts.ts
└── lib/
    └── excalidraw-storage.ts  # Storage helpers
```

## Implementation steps

### Step 1: Database (1 day)
- [ ] Create the schema file
- [ ] Run the database migration
- [ ] Test the database connection

### Step 2: API (1 day)
- [ ] Implement diagram CRUD
- [ ] Test every endpoint

### Step 3: Canvas integration (1 day)
- [ ] Make the canvas accept a diagram ID
- [ ] Implement autosave
- [ ] Implement diagram loading

### Step 4: Dashboard page (1 day)
- [ ] Create a simple diagram list
- [ ] Add a create-diagram button

## Core code samples

### Excalidraw storage
```typescript
import { serializeAsJSON } from "@excalidraw/excalidraw";

// Save
const saveFlowchart = async (excalidrawAPI, id?) => {
  const content = serializeAsJSON({
    elements: excalidrawAPI.getSceneElements(),
    appState: excalidrawAPI.getAppState(),
    files: excalidrawAPI.getFiles()
  });
  
  if (id) {
    await fetch(`/api/flowcharts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  } else {
    const res = await fetch('/api/flowcharts', {
      method: 'POST', 
      body: JSON.stringify({ content })
    });
    return res.json().id;
  }
};

// Load
const loadFlowchart = async (id) => {
  const res = await fetch(`/api/flowcharts/${id}`);
  const { content } = await res.json();
  return JSON.parse(content);
};
```

### Autosave
```typescript
const useAutoSave = (excalidrawAPI, flowchartId) => {
  const debouncedSave = useMemo(
    () => debounce(async () => {
      await saveFlowchart(excalidrawAPI, flowchartId);
    }, 3000),
    [excalidrawAPI, flowchartId]
  );
  
  useEffect(() => {
    if (excalidrawAPI) {
      excalidrawAPI.onChange(debouncedSave);
    }
  }, [excalidrawAPI, debouncedSave]);
};
```

## Acceptance criteria

- [ ] A user can create a new diagram and it autosaves
- [ ] A user can see every diagram
- [ ] A user can edit an existing diagram
- [ ] A user can delete a diagram

---

**This is the full MVP plan: small, direct, and focused on the core library.**
