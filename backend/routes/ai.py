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


@ai_bp.route('/summarize-note', methods=['POST'])
@jwt_required()
def summarize_note():
    """Summarize an entire note including all canvas elements."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    note_title = data.get('title', 'Untitled Note')
    blocks = data.get('blocks', [])
    
    if not blocks:
        return jsonify({'error': 'No content to summarize'}), 400
    
    # Build structured content from canvas elements
    content_parts = []
    content_parts.append(f"Note Title: {note_title}\n")
    
    # Separate text blocks and shapes
    text_blocks = []
    shapes = []
    
    for block in blocks:
        if block.get('type') == 'shape':
            shapes.append(block)
        else:
            text_blocks.append(block)
    
    # Sort by position (top to bottom, left to right) for logical reading order
    def sort_key(b):
        x = b.get('x', 0) or b.get('position', {}).get('x', 0)
        y = b.get('y', 0) or b.get('position', {}).get('y', 0)
        return (y // 100, x // 100)  # Group by approximate rows
    
    text_blocks.sort(key=sort_key)
    shapes.sort(key=sort_key)
    
    # Add text blocks content
    if text_blocks:
        content_parts.append("=== Text Content ===")
        for i, block in enumerate(text_blocks, 1):
            content = block.get('content', '').strip()
            if content:
                # Strip HTML tags for cleaner summary input
                import re
                clean_content = re.sub(r'<[^>]+>', ' ', content)
                clean_content = re.sub(r'\s+', ' ', clean_content).strip()
                if clean_content:
                    content_parts.append(f"Text Block {i}: {clean_content}")
    
    # Add shapes with labels
    labeled_shapes = [s for s in shapes if s.get('text')]
    if labeled_shapes:
        content_parts.append("\n=== Diagram Elements ===")
        for shape in labeled_shapes:
            shape_type = shape.get('shapeType', 'shape')
            label = shape.get('text', '')
            content_parts.append(f"- {shape_type.capitalize()} labeled: \"{label}\"")
    
    # Add shape connections context (arrows)
    arrows = [s for s in shapes if s.get('shapeType') in ('line', 'arrow')]
    if arrows:
        content_parts.append(f"\n(Note: Contains {len(arrows)} connecting line(s)/arrow(s) between elements)")
    
    structured_content = '\n'.join(content_parts)
    
    # Get user's preferred AI provider
    user = User.find_by_id(user_id)
    provider = user.settings.get('ai_provider') if user else None
    
    try:
        result = AIService.transform(structured_content, 'summarize_note', None, provider)
        
        # Clean up any markdown code block wrappers the LLM might add
        import re
        cleaned_result = result.strip()
        # Remove ```html ... ``` or ``` ... ``` wrappers
        cleaned_result = re.sub(r'^```(?:html)?\s*\n?', '', cleaned_result)
        cleaned_result = re.sub(r'\n?```\s*$', '', cleaned_result)
        cleaned_result = cleaned_result.strip()
        
        return jsonify({
            'summary': cleaned_result,
            'title': note_title
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Summarization failed: {str(e)}'}), 500
