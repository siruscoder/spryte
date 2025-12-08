"""Book routes - CRUD operations for books."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import Book

books_bp = Blueprint('books', __name__, url_prefix='/api/books')


@books_bp.route('', methods=['GET'])
@jwt_required()
def get_books():
    """Get all books for current user (flat list)."""
    user_id = get_jwt_identity()
    books = Book.find_by_user(user_id)
    return jsonify({'books': [book.to_json() for book in books]}), 200


@books_bp.route('/tree', methods=['GET'])
@jwt_required()
def get_books_tree():
    """Get books as hierarchical tree structure."""
    user_id = get_jwt_identity()
    tree = Book.get_tree(user_id)
    return jsonify({'books': tree}), 200


@books_bp.route('', methods=['POST'])
@jwt_required()
def create_book():
    """Create a new book."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Book name is required'}), 400
    
    parent_id = data.get('parent_id')
    
    # Validate parent exists if provided
    if parent_id:
        parent = Book.find_by_id(parent_id, user_id)
        if not parent:
            return jsonify({'error': 'Parent book not found'}), 404
    
    book = Book.create(
        user_id=user_id,
        name=name,
        parent_id=parent_id,
        description=data.get('description'),
        color=data.get('color'),
        icon=data.get('icon')
    )
    
    return jsonify({
        'message': 'Book created',
        'book': book.to_json()
    }), 201


@books_bp.route('/<book_id>', methods=['GET'])
@jwt_required()
def get_book(book_id):
    """Get a specific book."""
    user_id = get_jwt_identity()
    book = Book.find_by_id(book_id, user_id)
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    return jsonify({'book': book.to_json()}), 200


@books_bp.route('/<book_id>', methods=['PUT'])
@jwt_required()
def update_book(book_id):
    """Update a book."""
    user_id = get_jwt_identity()
    book = Book.find_by_id(book_id, user_id)
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        name = data['name'].strip()
        if not name:
            return jsonify({'error': 'Book name cannot be empty'}), 400
        book.name = name
    
    if 'description' in data:
        book.description = data['description']
    
    if 'color' in data:
        book.color = data['color']
    
    if 'icon' in data:
        book.icon = data['icon']
    
    if 'parent_id' in data:
        new_parent_id = data['parent_id']
        
        # Prevent circular reference
        if new_parent_id == book.id:
            return jsonify({'error': 'Book cannot be its own parent'}), 400
        
        # Validate new parent exists
        if new_parent_id:
            parent = Book.find_by_id(new_parent_id, user_id)
            if not parent:
                return jsonify({'error': 'Parent book not found'}), 404
        
        book.parent_id = new_parent_id
    
    if 'order' in data:
        book.order = data['order']
    
    book.save()
    
    return jsonify({
        'message': 'Book updated',
        'book': book.to_json()
    }), 200


@books_bp.route('/<book_id>', methods=['DELETE'])
@jwt_required()
def delete_book(book_id):
    """Delete a book and all its contents."""
    user_id = get_jwt_identity()
    book = Book.find_by_id(book_id, user_id)
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    book.delete()
    
    return jsonify({'message': 'Book deleted'}), 200


@books_bp.route('/<book_id>/children', methods=['GET'])
@jwt_required()
def get_book_children(book_id):
    """Get child books of a specific book."""
    user_id = get_jwt_identity()
    
    # Verify parent book exists
    book = Book.find_by_id(book_id, user_id)
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    children = Book.find_by_parent(user_id, book_id)
    return jsonify({'books': [child.to_json() for child in children]}), 200
