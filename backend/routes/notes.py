"""Note routes - CRUD operations for notes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

from models import Note, Book

notes_bp = Blueprint('notes', __name__, url_prefix='/api/notes')


@notes_bp.route('', methods=['GET'])
@jwt_required()
def get_notes():
    """Get notes, optionally filtered by book."""
    user_id = get_jwt_identity()
    book_id = request.args.get('book_id')
    
    if book_id:
        # Verify book exists and belongs to user
        book = Book.find_by_id(book_id, user_id)
        if not book:
            return jsonify({'error': 'Book not found'}), 404
        notes = Note.find_by_book(user_id, book_id)
    else:
        # Get all notes (for search, etc.)
        from database import get_db
        db = get_db()
        cursor = db.notes.find({'user_id': user_id}).sort('updated_at', -1).limit(100)
        notes = [Note.from_dict(data) for data in cursor]
    
    return jsonify({'notes': [note.to_json(include_canvas=False) for note in notes]}), 200


@notes_bp.route('/tree/<book_id>', methods=['GET'])
@jwt_required()
def get_notes_tree(book_id):
    """Get notes as hierarchical tree structure for a book."""
    user_id = get_jwt_identity()
    
    # Verify book exists
    book = Book.find_by_id(book_id, user_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    tree = Note.get_tree(user_id, book_id)
    return jsonify({'notes': tree}), 200


@notes_bp.route('', methods=['POST'])
@jwt_required()
def create_note():
    """Create a new note."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Note title is required'}), 400
    
    book_id = data.get('book_id')
    if not book_id:
        return jsonify({'error': 'Book ID is required'}), 400
    
    # Verify book exists
    book = Book.find_by_id(book_id, user_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    parent_id = data.get('parent_id')
    
    # Validate parent note exists if provided
    if parent_id:
        parent = Note.find_by_id(parent_id, user_id)
        if not parent:
            return jsonify({'error': 'Parent note not found'}), 404
    
    note = Note.create(
        user_id=user_id,
        book_id=book_id,
        title=title,
        parent_id=parent_id,
        content=data.get('content'),
        canvas_data=data.get('canvas_data')
    )
    
    return jsonify({
        'message': 'Note created',
        'note': note.to_json()
    }), 201


@notes_bp.route('/<note_id>', methods=['GET'])
@jwt_required()
def get_note(note_id):
    """Get a specific note with full canvas data."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Include linked notes info
    linked_notes = note.get_linked_notes()
    
    return jsonify({
        'note': note.to_json(),
        'linked_notes': [ln.to_summary() for ln in linked_notes]
    }), 200


@notes_bp.route('/<note_id>', methods=['PUT'])
@jwt_required()
def update_note(note_id):
    """Update a note."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    data = request.get_json()
    
    if 'title' in data:
        title = data['title'].strip()
        if not title:
            return jsonify({'error': 'Note title cannot be empty'}), 400
        note.title = title
    
    if 'content' in data:
        note.content = data['content']
    
    if 'canvas_data' in data:
        note.canvas_data = data['canvas_data']
    
    if 'tags' in data:
        note.tags = data['tags']
    
    if 'annotations' in data:
        note.annotations = data['annotations']
    
    if 'parent_id' in data:
        new_parent_id = data['parent_id']
        
        # Prevent circular reference
        if new_parent_id == note.id:
            return jsonify({'error': 'Note cannot be its own parent'}), 400
        
        # Validate new parent exists
        if new_parent_id:
            parent = Note.find_by_id(new_parent_id, user_id)
            if not parent:
                return jsonify({'error': 'Parent note not found'}), 404
        
        note.parent_id = new_parent_id
    
    if 'book_id' in data:
        new_book_id = data['book_id']
        book = Book.find_by_id(new_book_id, user_id)
        if not book:
            return jsonify({'error': 'Book not found'}), 404
        note.book_id = new_book_id
    
    if 'order' in data:
        note.order = data['order']
    
    note.save()
    
    return jsonify({
        'message': 'Note updated',
        'note': note.to_json()
    }), 200


@notes_bp.route('/<note_id>/canvas', methods=['PUT'])
@jwt_required()
def update_canvas(note_id):
    """Update only the canvas data (for autosave)."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    data = request.get_json()
    canvas_data = data.get('canvas_data')
    
    if canvas_data is None:
        return jsonify({'error': 'Canvas data is required'}), 400
    
    note.update_canvas(canvas_data)
    
    return jsonify({
        'message': 'Canvas saved',
        'updated_at': note.updated_at.isoformat()
    }), 200


@notes_bp.route('/<note_id>', methods=['DELETE'])
@jwt_required()
def delete_note(note_id):
    """Delete a note."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    note.delete()
    
    return jsonify({'message': 'Note deleted'}), 200


@notes_bp.route('/<note_id>/link', methods=['POST'])
@jwt_required()
def add_link(note_id):
    """Add a link to another note."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    data = request.get_json()
    linked_note_id = data.get('linked_note_id')
    
    if not linked_note_id:
        return jsonify({'error': 'Linked note ID is required'}), 400
    
    # Verify linked note exists
    linked_note = Note.find_by_id(linked_note_id, user_id)
    if not linked_note:
        return jsonify({'error': 'Linked note not found'}), 404
    
    note.add_link(linked_note_id)
    
    return jsonify({
        'message': 'Link added',
        'linked_note_ids': note.linked_note_ids
    }), 200


@notes_bp.route('/<note_id>/link/<linked_note_id>', methods=['DELETE'])
@jwt_required()
def remove_link(note_id, linked_note_id):
    """Remove a link to another note."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    note.remove_link(linked_note_id)
    
    return jsonify({
        'message': 'Link removed',
        'linked_note_ids': note.linked_note_ids
    }), 200


@notes_bp.route('/<note_id>/annotations', methods=['POST'])
@jwt_required()
def add_annotation(note_id):
    """Add an annotation to a note."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    data = request.get_json()
    
    # Validate required fields
    selected_text = data.get('selected_text')
    insight = data.get('insight')
    block_id = data.get('block_id') or data.get('shape_id')  # Support both names
    
    if not selected_text or not insight:
        return jsonify({'error': 'selected_text and insight are required'}), 400
    
    # Create annotation
    from datetime import datetime
    annotation = {
        'id': str(ObjectId()),
        'selected_text': selected_text,
        'insight': insight,
        'block_id': block_id,
        'prompt': data.get('prompt'),
        'created_at': datetime.utcnow().isoformat()
    }
    
    note.annotations.append(annotation)
    note.save()
    
    return jsonify({
        'message': 'Annotation added',
        'annotation': annotation,
        'annotations': note.annotations
    }), 201


@notes_bp.route('/<note_id>/annotations/<annotation_id>', methods=['DELETE'])
@jwt_required()
def delete_annotation(note_id, annotation_id):
    """Delete an annotation from a note."""
    user_id = get_jwt_identity()
    note = Note.find_by_id(note_id, user_id)
    
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    
    # Remove annotation by id
    note.annotations = [a for a in note.annotations if a.get('id') != annotation_id]
    note.save()
    
    return jsonify({
        'message': 'Annotation deleted',
        'annotations': note.annotations
    }), 200


@notes_bp.route('/search', methods=['GET'])
@jwt_required()
def search_notes():
    """Search notes by title or content."""
    user_id = get_jwt_identity()
    query = request.args.get('q', '').strip()
    book_id = request.args.get('book_id')
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    notes = Note.search(user_id, query, book_id)
    
    return jsonify({'notes': [note.to_json(include_canvas=False) for note in notes]}), 200
