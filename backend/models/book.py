"""Book model - hierarchical folder structure for organizing notes."""
from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from database import get_db


class Book:
    """Book model for organizing notes in a hierarchical structure."""
    
    COLLECTION = 'books'
    
    def __init__(
        self,
        user_id: str,
        name: str,
        _id: Optional[ObjectId] = None,
        parent_id: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        order: int = 0
    ):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.name = name.strip()
        self.parent_id = parent_id  # None means root level
        self.description = description
        self.color = color or '#6366f1'  # Default indigo
        self.icon = icon or 'book'
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.order = order
    
    @property
    def id(self) -> str:
        return str(self._id)
    
    def to_dict(self) -> dict:
        """Convert to dictionary for MongoDB storage."""
        return {
            '_id': self._id,
            'user_id': self.user_id,
            'name': self.name,
            'parent_id': self.parent_id,
            'description': self.description,
            'color': self.color,
            'icon': self.icon,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'order': self.order
        }
    
    def to_json(self) -> dict:
        """Convert to JSON-serializable dictionary."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'parent_id': self.parent_id,
            'description': self.description,
            'color': self.color,
            'icon': self.icon,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'order': self.order
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Book':
        """Create Book instance from dictionary."""
        return cls(
            _id=data.get('_id'),
            user_id=data['user_id'],
            name=data['name'],
            parent_id=data.get('parent_id'),
            description=data.get('description'),
            color=data.get('color'),
            icon=data.get('icon'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            order=data.get('order', 0)
        )
    
    def save(self) -> 'Book':
        """Save book to database."""
        db = get_db()
        self.updated_at = datetime.utcnow()
        db[self.COLLECTION].update_one(
            {'_id': self._id},
            {'$set': self.to_dict()},
            upsert=True
        )
        return self
    
    def delete(self) -> bool:
        """Delete book and all its children (books and notes)."""
        db = get_db()
        
        # Recursively delete child books
        child_books = Book.find_by_parent(self.user_id, self.id)
        for child in child_books:
            child.delete()
        
        # Delete all notes in this book
        db.notes.delete_many({'book_id': self.id})
        
        # Delete this book
        result = db[self.COLLECTION].delete_one({'_id': self._id})
        return result.deleted_count > 0
    
    @classmethod
    def find_by_id(cls, book_id: str, user_id: str) -> Optional['Book']:
        """Find book by ID (ensures user ownership)."""
        db = get_db()
        data = db[cls.COLLECTION].find_one({
            '_id': ObjectId(book_id),
            'user_id': user_id
        })
        return cls.from_dict(data) if data else None
    
    @classmethod
    def find_by_user(cls, user_id: str) -> List['Book']:
        """Find all books for a user."""
        db = get_db()
        cursor = db[cls.COLLECTION].find({'user_id': user_id}).sort('order', 1)
        return [cls.from_dict(data) for data in cursor]
    
    @classmethod
    def find_by_parent(cls, user_id: str, parent_id: Optional[str] = None) -> List['Book']:
        """Find books by parent (None for root level)."""
        db = get_db()
        cursor = db[cls.COLLECTION].find({
            'user_id': user_id,
            'parent_id': parent_id
        }).sort('order', 1)
        return [cls.from_dict(data) for data in cursor]
    
    @classmethod
    def find_root_books(cls, user_id: str) -> List['Book']:
        """Find all root-level books for a user."""
        return cls.find_by_parent(user_id, None)
    
    @classmethod
    def create(
        cls,
        user_id: str,
        name: str,
        parent_id: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None
    ) -> 'Book':
        """Create a new book."""
        # Get next order value
        db = get_db()
        last_book = db[cls.COLLECTION].find_one(
            {'user_id': user_id, 'parent_id': parent_id},
            sort=[('order', -1)]
        )
        next_order = (last_book['order'] + 1) if last_book else 0
        
        book = cls(
            user_id=user_id,
            name=name,
            parent_id=parent_id,
            description=description,
            color=color,
            icon=icon,
            order=next_order
        )
        return book.save()
    
    @classmethod
    def get_tree(cls, user_id: str) -> List[dict]:
        """Get full book tree structure for a user."""
        all_books = cls.find_by_user(user_id)
        
        # Build tree
        book_map = {book.id: {**book.to_json(), 'children': []} for book in all_books}
        root_books = []
        
        for book in all_books:
            book_data = book_map[book.id]
            if book.parent_id and book.parent_id in book_map:
                book_map[book.parent_id]['children'].append(book_data)
            else:
                root_books.append(book_data)
        
        return root_books
