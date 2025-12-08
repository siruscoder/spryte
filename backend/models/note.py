"""Note model - spatial notes with canvas data and relationships."""
from datetime import datetime
from typing import Optional, List
from bson import ObjectId

from database import get_db


class Note:
    """Note model with canvas data and hierarchical relationships."""
    
    COLLECTION = 'notes'
    
    def __init__(
        self,
        user_id: str,
        book_id: str,
        title: str,
        _id: Optional[ObjectId] = None,
        parent_id: Optional[str] = None,
        content: Optional[str] = None,
        canvas_data: Optional[dict] = None,
        annotations: Optional[List[dict]] = None,
        linked_note_ids: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        order: int = 0
    ):
        self._id = _id or ObjectId()
        self.user_id = user_id
        self.book_id = book_id
        self.title = title.strip()
        self.parent_id = parent_id  # For parent-child note hierarchy
        self.content = content or ''  # Plain text summary
        self.canvas_data = canvas_data or {'shapes': [], 'bindings': []}  # tldraw state
        self.annotations = annotations or []  # AI insights attached to text selections
        self.linked_note_ids = linked_note_ids or []  # Peer relationships
        self.tags = tags or []
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
            'book_id': self.book_id,
            'title': self.title,
            'parent_id': self.parent_id,
            'content': self.content,
            'canvas_data': self.canvas_data,
            'annotations': self.annotations,
            'linked_note_ids': self.linked_note_ids,
            'tags': self.tags,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'order': self.order
        }
    
    def to_json(self, include_canvas: bool = True) -> dict:
        """Convert to JSON-serializable dictionary."""
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'title': self.title,
            'parent_id': self.parent_id,
            'content': self.content,
            'annotations': self.annotations,
            'linked_note_ids': self.linked_note_ids,
            'tags': self.tags,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'order': self.order
        }
        if include_canvas:
            data['canvas_data'] = self.canvas_data
        return data
    
    def to_summary(self) -> dict:
        """Return minimal summary for tree views."""
        return {
            'id': self.id,
            'title': self.title,
            'parent_id': self.parent_id,
            'book_id': self.book_id,
            'order': self.order,
            'has_children': self.has_children(),
            'linked_count': len(self.linked_note_ids)
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Note':
        """Create Note instance from dictionary."""
        return cls(
            _id=data.get('_id'),
            user_id=data['user_id'],
            book_id=data['book_id'],
            title=data['title'],
            parent_id=data.get('parent_id'),
            content=data.get('content'),
            canvas_data=data.get('canvas_data'),
            annotations=data.get('annotations'),
            linked_note_ids=data.get('linked_note_ids'),
            tags=data.get('tags'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            order=data.get('order', 0)
        )
    
    def save(self) -> 'Note':
        """Save note to database."""
        db = get_db()
        self.updated_at = datetime.utcnow()
        db[self.COLLECTION].update_one(
            {'_id': self._id},
            {'$set': self.to_dict()},
            upsert=True
        )
        return self
    
    def delete(self) -> bool:
        """Delete note and update references."""
        db = get_db()
        
        # Remove this note from linked_note_ids of other notes
        db[self.COLLECTION].update_many(
            {'linked_note_ids': self.id},
            {'$pull': {'linked_note_ids': self.id}}
        )
        
        # Recursively delete child notes
        child_notes = Note.find_by_parent(self.user_id, self.id)
        for child in child_notes:
            child.delete()
        
        # Delete this note
        result = db[self.COLLECTION].delete_one({'_id': self._id})
        return result.deleted_count > 0
    
    def has_children(self) -> bool:
        """Check if note has child notes."""
        db = get_db()
        return db[self.COLLECTION].count_documents({'parent_id': self.id}) > 0
    
    def add_link(self, note_id: str) -> 'Note':
        """Add a linked note relationship."""
        if note_id not in self.linked_note_ids and note_id != self.id:
            self.linked_note_ids.append(note_id)
            self.save()
        return self
    
    def remove_link(self, note_id: str) -> 'Note':
        """Remove a linked note relationship."""
        if note_id in self.linked_note_ids:
            self.linked_note_ids.remove(note_id)
            self.save()
        return self
    
    def get_linked_notes(self) -> List['Note']:
        """Get all linked notes."""
        if not self.linked_note_ids:
            return []
        db = get_db()
        cursor = db[self.COLLECTION].find({
            '_id': {'$in': [ObjectId(nid) for nid in self.linked_note_ids]}
        })
        return [Note.from_dict(data) for data in cursor]
    
    def update_canvas(self, canvas_data: dict) -> 'Note':
        """Update canvas data."""
        self.canvas_data = canvas_data
        return self.save()
    
    @classmethod
    def find_by_id(cls, note_id: str, user_id: str) -> Optional['Note']:
        """Find note by ID (ensures user ownership)."""
        db = get_db()
        data = db[cls.COLLECTION].find_one({
            '_id': ObjectId(note_id),
            'user_id': user_id
        })
        return cls.from_dict(data) if data else None
    
    @classmethod
    def find_by_book(cls, user_id: str, book_id: str) -> List['Note']:
        """Find all notes in a book."""
        db = get_db()
        cursor = db[cls.COLLECTION].find({
            'user_id': user_id,
            'book_id': book_id
        }).sort('order', 1)
        return [cls.from_dict(data) for data in cursor]
    
    @classmethod
    def find_by_parent(cls, user_id: str, parent_id: Optional[str] = None) -> List['Note']:
        """Find notes by parent (None for root level in book)."""
        db = get_db()
        cursor = db[cls.COLLECTION].find({
            'user_id': user_id,
            'parent_id': parent_id
        }).sort('order', 1)
        return [cls.from_dict(data) for data in cursor]
    
    @classmethod
    def find_root_notes(cls, user_id: str, book_id: str) -> List['Note']:
        """Find all root-level notes in a book."""
        db = get_db()
        cursor = db[cls.COLLECTION].find({
            'user_id': user_id,
            'book_id': book_id,
            'parent_id': None
        }).sort('order', 1)
        return [cls.from_dict(data) for data in cursor]
    
    @classmethod
    def create(
        cls,
        user_id: str,
        book_id: str,
        title: str,
        parent_id: Optional[str] = None,
        content: Optional[str] = None,
        canvas_data: Optional[dict] = None
    ) -> 'Note':
        """Create a new note."""
        db = get_db()
        
        # Get next order value
        query = {'user_id': user_id, 'book_id': book_id}
        if parent_id:
            query['parent_id'] = parent_id
        else:
            query['parent_id'] = None
            
        last_note = db[cls.COLLECTION].find_one(query, sort=[('order', -1)])
        next_order = (last_note['order'] + 1) if last_note else 0
        
        note = cls(
            user_id=user_id,
            book_id=book_id,
            title=title,
            parent_id=parent_id,
            content=content,
            canvas_data=canvas_data,
            order=next_order
        )
        return note.save()
    
    @classmethod
    def get_tree(cls, user_id: str, book_id: str) -> List[dict]:
        """Get full note tree structure for a book."""
        all_notes = cls.find_by_book(user_id, book_id)
        
        # Build tree
        note_map = {note.id: {**note.to_summary(), 'children': []} for note in all_notes}
        root_notes = []
        
        for note in all_notes:
            note_data = note_map[note.id]
            if note.parent_id and note.parent_id in note_map:
                note_map[note.parent_id]['children'].append(note_data)
            else:
                root_notes.append(note_data)
        
        return root_notes
    
    @classmethod
    def search(cls, user_id: str, query: str, book_id: Optional[str] = None) -> List['Note']:
        """Search notes by title or content."""
        db = get_db()
        search_filter = {
            'user_id': user_id,
            '$or': [
                {'title': {'$regex': query, '$options': 'i'}},
                {'content': {'$regex': query, '$options': 'i'}}
            ]
        }
        if book_id:
            search_filter['book_id'] = book_id
        
        cursor = db[cls.COLLECTION].find(search_filter).limit(50)
        return [cls.from_dict(data) for data in cursor]
