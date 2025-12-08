"""API Routes."""
from .auth import auth_bp
from .books import books_bp
from .notes import notes_bp
from .ai import ai_bp

__all__ = ['auth_bp', 'books_bp', 'notes_bp', 'ai_bp']
