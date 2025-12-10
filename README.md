# Spryte - Spatial Notes with AI

A next-generation note-taking tool that treats each sentence as a movable, editable object on an infinite canvas. Users can rearrange sentences spatially, add visual connections, annotate freely, and apply AI transformations directly to their content.

## Features

- **Spatial Organization**: Arrange thoughts freely on an infinite canvas
- **Hierarchical Books**: Organize notes in nested book structures
- **Note Relationships**: Link related notes together (parent-child and peer relationships)
- **Drawing Tools**: Create shapes (lines, arrows, rectangles, circles, triangles) with customizable stroke/fill colors and rotation
- **AI Transformations**: Rewrite, summarize, expand, or convert text with AI
- **AI Annotations**: Attach AI-generated insights to selected text
- **Add-ons System**: Extend functionality with optional add-ons (templates & actions)
- **User Authentication**: Secure registration and login with JWT tokens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Canvas | Custom SpriteCanvas with TipTap rich text editor |
| Frontend | React + Vite + TailwindCSS + Zustand |
| Backend | Python Flask |
| Database | MongoDB |
| AI | OpenAI (configurable) |

## Project Structure

```
spryte/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── api/             # API client and endpoints
│   │   │   ├── addons.js    # Add-ons API
│   │   │   ├── auth.js      # Authentication API
│   │   │   ├── books.js     # Books API
│   │   │   ├── notes.js     # Notes API
│   │   │   └── ai.js        # AI transformations API
│   │   ├── components/
│   │   │   ├── canvas/      # Canvas components
│   │   │   │   ├── SpriteCanvas.jsx          # Main canvas (infinite, zoomable)
│   │   │   │   ├── TextBlock.jsx             # Draggable text blocks with TipTap
│   │   │   │   ├── ShapeBlock.jsx            # Drawing shapes (lines, arrows, boxes)
│   │   │   │   ├── FloatingDrawingToolbar.jsx # Shape/color/stroke toolbar
│   │   │   │   └── AnnotationMark.jsx        # TipTap extension for annotations
│   │   │   ├── AddonCommandMenu.jsx   # @ command dropdown
│   │   │   ├── AIInsightPopup.jsx     # AI insight generation popup
│   │   │   ├── AnnotationPopup.jsx    # View/delete annotations
│   │   │   └── Sidebar.jsx            # Books & notes navigation
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx # Main app with canvas
│   │   │   ├── Addons.jsx    # Add-ons management
│   │   │   └── ...
│   │   ├── stores/          # Zustand state stores
│   │   │   ├── addonsStore.js  # Add-ons state
│   │   │   ├── authStore.js    # Auth state
│   │   │   ├── booksStore.js   # Books state
│   │   │   └── notesStore.js   # Notes state
│   │   ├── App.jsx          # Main app with routing
│   │   └── main.jsx         # Entry point
│   └── package.json
├── backend/                  # Flask backend
│   ├── models/
│   │   ├── user.py          # User model (with active_addons)
│   │   ├── book.py          # Book model
│   │   └── note.py          # Note model (with annotations)
│   ├── routes/
│   │   ├── addons.py        # Add-ons endpoints
│   │   ├── auth.py          # Auth endpoints
│   │   ├── books.py         # Books endpoints
│   │   ├── notes.py         # Notes endpoints
│   │   └── ai.py            # AI endpoints
│   ├── services/            # Business logic (AI service)
│   ├── app.py               # Flask app factory
│   ├── config.py            # Configuration
│   ├── database.py          # MongoDB connection
│   └── requirements.txt
└── README.md
```

## Add-ons System

Spryte supports extensible add-ons that provide templates and actions. Users can enable/disable add-ons from the Add-ons page.

### Using Add-on Commands

When editing a text block, type `@` to open the command menu. This shows:
- **Templates**: Pre-formatted text structures (e.g., Class Note template)
- **Actions**: Special commands (e.g., @Reminder)

### Available Add-ons

#### Class Notes (Free)
- **Template: Class Note** - Structured lecture notes with date, subject, key topics, questions, and action items
- **Action: @Reminder** - Set reminders with date/time (e.g., `@Reminder 12/10/2025 10:00AM "Submit assignment"`)

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- MongoDB running locally on port 27017
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to `.env`:
     ```
     OPENAI_API_KEY=your-actual-api-key
     ```

5. Start the Flask server:
   ```bash
   python app.py
   ```
   
   The API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password
- `PUT /api/auth/settings` - Update settings

### Books
- `GET /api/books` - Get all books
- `GET /api/books/tree` - Get books as tree
- `POST /api/books` - Create book
- `GET /api/books/:id` - Get book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book

### Notes
- `GET /api/notes` - Get notes (optionally by book)
- `GET /api/notes/tree/:bookId` - Get notes tree
- `POST /api/notes` - Create note
- `GET /api/notes/:id` - Get note with canvas data
- `PUT /api/notes/:id` - Update note
- `PUT /api/notes/:id/canvas` - Update canvas data (autosave)
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/link` - Add linked note
- `DELETE /api/notes/:id/link/:linkedId` - Remove linked note
- `GET /api/notes/search` - Search notes

### AI
- `POST /api/ai/transform` - Transform text with AI
- `GET /api/ai/actions` - Get available AI actions

### Add-ons
- `GET /api/addons` - Get all available add-ons with user status
- `POST /api/addons/:id/enable` - Enable an add-on
- `POST /api/addons/:id/disable` - Disable an add-on
- `GET /api/addons/commands` - Get templates & actions from enabled add-ons

### Reminders
- `GET /api/reminders` - Get all reminders for current user
- `GET /api/reminders/due` - Get due reminders
- `POST /api/reminders/parse` - Parse reminder text with LLM and create reminder
- `POST /api/reminders/:id/complete` - Mark reminder as completed
- `DELETE /api/reminders/:id` - Delete reminder

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save canvas |
| `Cmd/Ctrl + scroll` | Zoom in/out |
| `Drag canvas` | Pan |
| `Double-click` | Create new text block |
| `@` | Open command menu (in text block) |
| `Esc` | Cancel drawing mode |

## Drawing Tools

The floating drawing toolbar provides:
- **Shapes**: Line, Arrow, Rectangle, Circle, Triangle
- **Stroke Color**: 8 preset colors
- **Stroke Width**: 1-6px options
- **Fill Color**: Transparent + 7 preset colors

When a shape is selected:
- **Drag** to move
- **Corner handles** to resize
- **Rotation handle** (top-left) to rotate
- **Trash button** (top-right) to delete

## Configuration

### AI Provider

The AI provider can be configured in `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-key-here
```

To switch providers (when supported):
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key-here
```

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build
```

## License

MIT
