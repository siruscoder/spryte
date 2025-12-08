# Spatial Notes - Product Requirements Document

## 1. Product Overview

A next-generation note-taking tool that treats each sentence as a movable, editable object on an infinite canvas. Users can rearrange sentences spatially, add visual connections, annotate freely, and apply AI transformations directly to their content.

**Goal**: Merge the flexibility of freeform diagramming tools with the intelligence of modern text editors.

---

## 2. Target Users

- Knowledge workers
- Students and researchers
- Designers and product thinkers
- Anyone who benefits from spatial, non-linear note-taking augmented by AI

---

## 3. Core User Workflow

1. User types sentences into the canvas; each becomes its own draggable text block
2. User rearranges sentences anywhere on the page to organize thinking
3. User adds visual elements (lines, arrows, highlights) to show relationships
4. User selects any text block and uses AI actions to rewrite, summarize, expand, or enhance
5. Canvas evolves into a structured map of ideas, ready for export or continued iteration

---

## 4. Functional Requirements

### 4.1 Canvas & Layout

- Freeform infinite canvas (tldraw base)
- Move, resize, duplicate, delete any object
- Single and multi-select
- Bounding boxes, handles, and snapping

### 4.2 Text Blocks (Sentence Nodes)

- Each typed sentence appears as a text shape
- Text shapes are: draggable, resizable, editable inline
- Users can adjust width to control text wrapping
- **Future**: Embed lightweight block editor in popup for rich text

### 4.3 Visual Elements

- Straight lines
- Curved lines
- Arrows (on any line type)
- Highlight rectangles
- Sticky-note-style annotations
- Anchoring to text shapes (arrows that point to blocks)

### 4.4 AI Enhancements

**Context menu actions on text shapes:**
- Rewrite for clarity
- Summarize
- Expand
- Convert to tasks/bullets
- Generate insights or follow-ups

**Workflow:**
1. User selects a text shape
2. User chooses AI action from context menu
3. Frontend sends shape ID + text to backend
4. Backend returns transformed text
5. App updates the shape's `props.text` field

### 4.5 Exporting

**Canvas export:**
- PNG
- PDF
- JSON (full state)

**Text-only export:**
- Markdown
- Plain text

### 4.6 Undo/Redo & Versioning

- Full undo/redo for all actions
- Autosave every few seconds
- Manual save/export option

---

## 5. Non-Functional Requirements

### Performance
- Support 100+ blocks without lag
- Real-time updates feel instantaneous

### Scalability
- Backend supports multiple concurrent AI requests
- Architecture allows future collaboration features

### Reliability
- Autosave ensures minimal data loss
- AI requests include error handling and retries

---

## 6. Technical Architecture

### 6.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Canvas | tldraw v2.x (@tldraw/tldraw) |
| Frontend | React + Vite + TailwindCSS |
| Backend | Python Flask |
| Database | MongoDB |
| AI | OpenAI/Anthropic API |

### 6.2 tldraw Integration

Use tldraw for:
- Shape system (text, arrows, rectangles)
- Bounding boxes and selection logic
- Connectors and arrows
- Rendering layers
- Undo/redo and state management

### 6.3 Data Model

```typescript
// Canvas document
interface Canvas {
  _id: string;
  name: string;
  shapes: TLShape[];      // tldraw's native shape format
  created_at: Date;
  updated_at: Date;
  user_id?: string;       // for future auth
}
```

### 6.4 AI Integration

```typescript
// Frontend: Context menu handler
const handleAIAction = async (shapeId: string, action: string) => {
  const shape = editor.getShape(shapeId);
  const response = await axios.post('/api/ai/transform', {
    text: shape.props.text,
    action: action
  });
  editor.updateShape({
    id: shapeId,
    type: 'text',
    props: { text: response.data.text }
  });
};
```

```python
# Backend: /api/ai/transform
@app.route('/api/ai/transform', methods=['POST'])
def transform_text():
    data = request.json
    text = data['text']
    action = data['action']
    
    prompts = {
        'rewrite': f'Rewrite this for clarity: {text}',
        'summarize': f'Summarize this concisely: {text}',
        'expand': f'Expand on this idea: {text}',
        'bullets': f'Convert to bullet points: {text}',
    }
    
    result = call_llm(prompts[action])
    return jsonify({'text': result})
```

### 6.5 Project Structure

```
spatial-notes/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Canvas.jsx          # Main tldraw wrapper
│   │   │   ├── AIContextMenu.jsx   # Right-click AI menu
│   │   │   └── Toolbar.jsx         # Export, save controls
│   │   ├── hooks/
│   │   │   └── useAIActions.js     # AI action handlers
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── app.py                      # Flask app
│   ├── routes/
│   │   ├── canvas.py               # CRUD for canvases
│   │   └── ai.py                   # AI transformation endpoints
│   └── requirements.txt
└── README.md
```

---

## 7. Implementation Phases

### Phase 1: Proof of Concept (MVP)
- [ ] Set up React + Vite + tldraw
- [ ] Render basic canvas with text shapes
- [ ] Implement drag, resize, edit for text
- [ ] Add simple AI context menu (one action)
- [ ] Basic save/load to backend

### Phase 2: Core Features
- [ ] Full AI action menu (rewrite, summarize, expand, bullets)
- [ ] Arrows and connectors between shapes
- [ ] Highlight rectangles
- [ ] Canvas list/management UI
- [ ] Autosave

### Phase 3: Polish & Export
- [ ] Export to PNG/PDF
- [ ] Export text to Markdown
- [ ] Keyboard shortcuts
- [ ] Performance optimization for 100+ shapes

### Phase 4: Future Enhancements
- [ ] Rich text popup editor
- [ ] Multi-user collaboration
- [ ] AI-generated layout suggestions
- [ ] AI clustering of related sentences

---

## 8. Open Questions

1. Should "Enter" key create a new text block, or require explicit action?
2. Keyboard shortcuts for adding arrows/highlights?
3. Support for embedded media (images, links, code)?
4. Multiplayer collaboration timeline?

---

## 9. Success Metrics

**User Outcomes:**
- Reorganize ideas 2-3× faster than linear editors
- ≥30% of sessions include AI actions

**Product Indicators:**
- Time-to-first-note < 5 seconds
- Smooth performance with 150+ shapes
- User satisfaction (CSAT) > 4.5/5
