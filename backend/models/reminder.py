"""Reminder model for storing user reminders."""
from datetime import datetime
from typing import Optional
from bson import ObjectId
from database import get_db


class Reminder:
    """Reminder model for scheduled notifications."""
    
    collection_name = 'reminders'
    
    def __init__(
        self,
        user_id: str,
        note_id: str,
        block_id: Optional[str],
        message: str,
        due_date: datetime,
        raw_text: str,
        early_reminder_minutes: int = 0,
        completed: bool = False,
        notified: bool = False,
        created_at: Optional[datetime] = None,
        _id: Optional[ObjectId] = None
    ):
        self._id = _id
        self.user_id = user_id
        self.note_id = note_id
        self.block_id = block_id
        self.message = message
        self.due_date = due_date
        self.raw_text = raw_text
        self.early_reminder_minutes = early_reminder_minutes
        self.completed = completed
        self.notified = notified
        self.created_at = created_at or datetime.utcnow()
    
    @property
    def id(self) -> str:
        return str(self._id) if self._id else None
    
    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'note_id': self.note_id,
            'block_id': self.block_id,
            'message': self.message,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'raw_text': self.raw_text,
            'early_reminder_minutes': self.early_reminder_minutes,
            'completed': self.completed,
            'notified': self.notified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    def save(self) -> 'Reminder':
        """Save reminder to database."""
        db = get_db()
        data = {
            'user_id': self.user_id,
            'note_id': self.note_id,
            'block_id': self.block_id,
            'message': self.message,
            'due_date': self.due_date,
            'raw_text': self.raw_text,
            'early_reminder_minutes': self.early_reminder_minutes,
            'completed': self.completed,
            'notified': self.notified,
            'created_at': self.created_at,
        }
        
        if self._id:
            db[self.collection_name].update_one(
                {'_id': self._id},
                {'$set': data}
            )
        else:
            result = db[self.collection_name].insert_one(data)
            self._id = result.inserted_id
        
        return self
    
    def mark_completed(self) -> 'Reminder':
        """Mark reminder as completed."""
        self.completed = True
        return self.save()
    
    def mark_notified(self) -> 'Reminder':
        """Mark reminder as notified."""
        self.notified = True
        return self.save()
    
    def delete(self) -> bool:
        """Delete reminder from database."""
        if not self._id:
            return False
        db = get_db()
        result = db[self.collection_name].delete_one({'_id': self._id})
        return result.deleted_count > 0
    
    @classmethod
    def find_by_id(cls, reminder_id: str) -> Optional['Reminder']:
        """Find reminder by ID."""
        try:
            db = get_db()
            data = db[cls.collection_name].find_one({'_id': ObjectId(reminder_id)})
            if data:
                return cls._from_db(data)
        except Exception:
            pass
        return None
    
    @classmethod
    def find_by_user(cls, user_id: str, include_completed: bool = False) -> list['Reminder']:
        """Find all reminders for a user."""
        db = get_db()
        query = {'user_id': user_id}
        if not include_completed:
            query['completed'] = False
        
        reminders = db[cls.collection_name].find(query).sort('due_date', 1)
        return [cls._from_db(r) for r in reminders]
    
    @classmethod
    def find_due(cls, before: Optional[datetime] = None) -> list['Reminder']:
        """Find all due reminders that haven't been notified."""
        db = get_db()
        if before is None:
            before = datetime.utcnow()
        
        query = {
            'due_date': {'$lte': before},
            'completed': False,
            'notified': False,
        }
        
        reminders = db[cls.collection_name].find(query).sort('due_date', 1)
        return [cls._from_db(r) for r in reminders]
    
    @classmethod
    def find_by_note(cls, note_id: str) -> list['Reminder']:
        """Find all reminders for a note."""
        db = get_db()
        reminders = db[cls.collection_name].find({'note_id': note_id}).sort('due_date', 1)
        return [cls._from_db(r) for r in reminders]
    
    @classmethod
    def _from_db(cls, data: dict) -> 'Reminder':
        """Create Reminder instance from database document."""
        return cls(
            _id=data['_id'],
            user_id=data['user_id'],
            note_id=data['note_id'],
            block_id=data.get('block_id'),
            message=data['message'],
            due_date=data['due_date'],
            raw_text=data['raw_text'],
            early_reminder_minutes=data.get('early_reminder_minutes', 0),
            completed=data.get('completed', False),
            notified=data.get('notified', False),
            created_at=data.get('created_at'),
        )
