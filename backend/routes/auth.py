"""Authentication routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from email_validator import validate_email, EmailNotValidError

from models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user."""
    data = request.get_json()
    
    # Validate required fields
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    
    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400
    
    # Validate email format
    try:
        valid = validate_email(email)
        email = valid.email
    except EmailNotValidError as e:
        return jsonify({'error': str(e)}), 400
    
    # Check password length (simple validation for development)
    if len(password) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400
    
    # Check if email already exists
    if User.email_exists(email):
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create user
    try:
        user = User.create(email=email, password=password, name=name)
        
        # Generate access token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_json(),
            'access_token': access_token
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT token."""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user by email
    user = User.find_by_email(email)
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    # Generate access token
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_json(),
        'access_token': access_token
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user."""
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_json()}), 200


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile."""
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    name = data.get('name')
    email = data.get('email')
    
    # Validate email if provided
    if email:
        try:
            valid = validate_email(email)
            email = valid.email
            
            # Check if email is taken by another user
            existing = User.find_by_email(email)
            if existing and existing.id != user.id:
                return jsonify({'error': 'Email already in use'}), 409
        except EmailNotValidError as e:
            return jsonify({'error': str(e)}), 400
    
    user.update_profile(name=name, email=email)
    
    return jsonify({
        'message': 'Profile updated',
        'user': user.to_json()
    }), 200


@auth_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password."""
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400
    
    # Verify current password
    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Validate new password
    if len(new_password) < 4:
        return jsonify({'error': 'New password must be at least 4 characters'}), 400
    
    user.change_password(new_password)
    
    return jsonify({'message': 'Password changed successfully'}), 200


@auth_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    """Update user settings."""
    user_id = get_jwt_identity()
    user = User.find_by_id(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    settings = data.get('settings', {})
    
    # Validate settings
    allowed_settings = {'theme', 'ai_provider'}
    filtered_settings = {k: v for k, v in settings.items() if k in allowed_settings}
    
    user.update_settings(filtered_settings)
    
    return jsonify({
        'message': 'Settings updated',
        'user': user.to_json()
    }), 200
