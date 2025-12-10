"""User model."""
from datetime import datetime
from typing import Optional
from bson import ObjectId
import bcrypt

from database import get_db


class User:
    """User model for authentication and profile management."""
    
    COLLECTION = 'users'
    
    def __init__(
        self,
        email: str,
        password_hash: str,
        name: str,
        _id: Optional[ObjectId] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        settings: Optional[dict] = None,
        active_addons: Optional[list[str]] = None
    ):
        self._id = _id or ObjectId()
        self.email = email.lower().strip()
        self.password_hash = password_hash
        self.name = name.strip()
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.settings = settings or {
            'theme': 'light',
            'ai_provider': 'openai'
        }
        self.active_addons = active_addons or []

    @property
    def id(self) -> str:
        return str(self._id)
    
    def to_dict(self, include_password: bool = False) -> dict:
        """Convert to dictionary for MongoDB storage."""
        data = {
            '_id': self._id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'settings': self.settings,
            'active_addons': self.active_addons
        }
        if include_password:
            data['password_hash'] = self.password_hash
        return data
    
    def to_json(self) -> dict:
        """Convert to JSON-serializable dictionary (for API responses)."""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'settings': self.settings,
            'active_addons': self.active_addons
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'User':
        """Create User instance from dictionary."""
        return cls(
            _id=data.get('_id'),
            email=data['email'],
            password_hash=data['password_hash'],
            name=data['name'],
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at'),
            settings=data.get('settings'),
            active_addons=data.get('active_addons')
        )
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt."""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def save(self) -> 'User':
        """Save user to database."""
        db = get_db()
        self.updated_at = datetime.utcnow()
        db[self.COLLECTION].update_one(
            {'_id': self._id},
            {'$set': self.to_dict(include_password=True)},
            upsert=True
        )
        return self
    
    def update_settings(self, settings: dict) -> 'User':
        """Update user settings."""
        self.settings.update(settings)
        return self.save()
    
    def update_profile(self, name: Optional[str] = None, email: Optional[str] = None) -> 'User':
        """Update user profile."""
        if name:
            self.name = name.strip()
        if email:
            self.email = email.lower().strip()
        return self.save()
    
    def enable_addon(self, addon_id: str) -> 'User':
        """Enable an addon for the user."""
        if addon_id not in self.active_addons:
            self.active_addons.append(addon_id)
            return self.save()
        return self
        
    def disable_addon(self, addon_id: str) -> 'User':
        """Disable an addon for the user."""
        if addon_id in self.active_addons:
            self.active_addons.remove(addon_id)
            return self.save()
        return self

    def change_password(self, new_password: str) -> 'User':
        """Change user password."""
        self.password_hash = self.hash_password(new_password)
        return self.save()
    
    @classmethod
    def find_by_id(cls, user_id: str) -> Optional['User']:
        """Find user by ID."""
        db = get_db()
        data = db[cls.COLLECTION].find_one({'_id': ObjectId(user_id)})
        return cls.from_dict(data) if data else None
    
    @classmethod
    def find_by_email(cls, email: str) -> Optional['User']:
        """Find user by email."""
        db = get_db()
        data = db[cls.COLLECTION].find_one({'email': email.lower().strip()})
        return cls.from_dict(data) if data else None
    
    @classmethod
    def create(cls, email: str, password: str, name: str) -> 'User':
        """Create a new user."""
        user = cls(
            email=email,
            password_hash=cls.hash_password(password),
            name=name
        )
        return user.save()
    
    @classmethod
    def email_exists(cls, email: str) -> bool:
        """Check if email already exists."""
        db = get_db()
        return db[cls.COLLECTION].count_documents({'email': email.lower().strip()}) > 0
