# Spryte - Spatial Notes with AI

A next-generation note-taking tool that treats each sentence as a movable, editable object on an infinite canvas. Users can rearrange sentences spatially, add visual connections, annotate freely, and apply AI transformations directly to their content.

## Features

- **Spatial Organization**: Arrange thoughts freely on an infinite canvas
- **Hierarchical Books**: Organize notes in nested book structures
- **Note Relationships**: Link related notes together (parent-child and peer relationships)
- **AI Transformations**: Rewrite, summarize, expand, or convert text with AI
- **User Authentication**: Secure registration and login with JWT tokens

## Tech Stack

| Layer | Technology |
|-------|------------|
| Canvas | tldraw v2.x |
| Frontend | React + Vite + TailwindCSS |
| Backend | Python Flask |
| Database | MongoDB |
| AI | OpenAI (configurable) |

## Project Structure

```
spryte/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── api/             # API client and endpoints
│   │   ├── components/      # Reusable components
│   │   ├── layouts/         # Page layouts
│   │   ├── pages/           # Page components
│   │   ├── stores/          # Zustand state stores
│   │   ├── App.jsx          # Main app with routing
│   │   └── main.jsx         # Entry point
│   └── package.json
├── backend/                  # Flask backend
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── services/            # Business logic (AI service)
│   ├── app.py               # Flask app factory
│   ├── config.py            # Configuration
│   ├── database.py          # MongoDB connection
│   └── requirements.txt
└── README.md
```

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

## Keyboard Shortcuts (Planned)

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save canvas |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Delete/Backspace` | Delete selected |
| `Escape` | Deselect |
| `Cmd/Ctrl + A` | Select all |
| `Cmd/Ctrl + D` | Duplicate |

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
