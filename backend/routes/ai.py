"""AI transformation routes."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from services import AIService
from models import User

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')


@ai_bp.route('/transform', methods=['POST'])
@jwt_required()
def transform_text():
    """Transform text using AI."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    text = data.get('text', '').strip()
    action = data.get('action', '').strip()
    context = data.get('context')  # Optional context for better results
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    
    if not action:
        return jsonify({'error': 'Action is required'}), 400
    
    # Get user's preferred AI provider
    user = User.find_by_id(user_id)
    provider = user.settings.get('ai_provider') if user else None
    
    try:
        result = AIService.transform(text, action, context, provider)
        return jsonify({
            'text': result,
            'action': action
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'AI transformation failed: {str(e)}'}), 500


@ai_bp.route('/actions', methods=['GET'])
@jwt_required()
def get_actions():
    """Get available AI actions."""
    actions = AIService.get_available_actions()
    return jsonify({'actions': actions}), 200
