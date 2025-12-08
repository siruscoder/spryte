"""MongoDB database connection and utilities."""
from pymongo import MongoClient
from pymongo.database import Database
from flask import current_app, g


def get_db() -> Database:
    """Get database connection, creating one if it doesn't exist."""
    if 'db' not in g:
        client = MongoClient(current_app.config['MONGODB_URI'])
        g.db = client[current_app.config['MONGODB_DATABASE']]
    return g.db


def close_db(e=None):
    """Close database connection."""
    db = g.pop('db', None)
    if db is not None:
        db.client.close()


def init_db(app):
    """Initialize database with indexes."""
    app.teardown_appcontext(close_db)
    
    with app.app_context():
        db = get_db()
        
        # User indexes
        db.users.create_index('email', unique=True)
        
        # Book indexes
        db.books.create_index('user_id')
        db.books.create_index('parent_id')
        db.books.create_index([('user_id', 1), ('parent_id', 1)])
        
        # Note indexes
        db.notes.create_index('user_id')
        db.notes.create_index('book_id')
        db.notes.create_index('parent_id')
        db.notes.create_index([('user_id', 1), ('book_id', 1)])
