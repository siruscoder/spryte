"""Add-ons routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models.user import User

addons_bp = Blueprint('addons', __name__, url_prefix='/api/addons')

# Hardcoded list of available addons for now
AVAILABLE_ADDONS = [
    {
        "id": "common",
        "name": "Common",
        "description": "Essential tools available to all users.",
        "icon": "Sparkles",
        "is_free": True,
        "is_always_active": True,  # This addon cannot be disabled
        "features": [
            "Quick date/time insertion",
            "Reminder scheduling",
            "Drawing tools"
        ],
        "templates": [
            {
                "id": "now",
                "name": "Now",
                "description": "Insert current date and time",
                "icon": "Clock",
                "pattern": "@Now",
                "is_inline": True,  # Replaces the pattern inline rather than inserting a block
            }
        ],
        "actions": [
            {
                "id": "reminder",
                "name": "Reminder",
                "description": "Set a reminder for a specific date/time",
                "icon": "Bell",
                "pattern": "@Reminder",
                "template": "🔔 Reminder: [MM/DD/YYYY] [HH:MM AM/PM] - \"Your reminder text here\""
            }
        ],
        "ui_components": [
            {
                "id": "drawing",
                "name": "Drawing",
                "description": "Draw shapes on the canvas",
                "icon": "Pencil",
                "type": "dropdown",
                "items": [
                    {
                        "id": "line",
                        "name": "Line",
                        "icon": "Minus",
                        "shape_type": "line"
                    },
                    {
                        "id": "arrow",
                        "name": "Arrow",
                        "icon": "ArrowRight",
                        "shape_type": "arrow"
                    },
                    {
                        "id": "circle",
                        "name": "Circle",
                        "icon": "Circle",
                        "shape_type": "circle"
                    },
                    {
                        "id": "rectangle",
                        "name": "Rectangle",
                        "icon": "Square",
                        "shape_type": "rectangle"
                    },
                    {
                        "id": "triangle",
                        "name": "Triangle",
                        "icon": "Triangle",
                        "shape_type": "triangle"
                    }
                ]
            }
        ]
    },
    {
        "id": "class_notes",
        "name": "Class Notes",
        "description": "Specialized tools for taking lecture notes and studying.",
        "icon": "GraduationCap",
        "is_free": True,
        "features": [
            "Lecture capture templates",
            "Auto-summarization for study guides",
            "Flashcard generation"
        ],
        "templates": [
            {
                "id": "class_note",
                "name": "Class Note",
                "description": "A structured template for lecture notes",
                "icon": "FileText",
                "content": "<p>📚 <strong>Class Note</strong></p><p></p><p>📅 <strong>Date:</strong> </p><p>📖 <strong>Subject:</strong> </p><p>👨‍🏫 <strong>Instructor:</strong> </p><p></p><hr><p></p><p><strong>Key Topics</strong></p><ul><li><p></p></li></ul><p></p><p><strong>Notes</strong></p><p></p><p></p><p><strong>Questions</strong></p><ul><li><p></p></li></ul><p></p><p><strong>Action Items</strong></p><ul><li><p>☐ </p></li></ul>"
            }
        ],
        "actions": []
    },
    {
        "id": "work",
        "name": "Work",
        "description": "Professional tools for meetings, projects, and workplace productivity.",
        "icon": "Briefcase",
        "is_free": True,
        "features": [
            "Meeting notes templates",
            "Action item tracking"
        ],
        "templates": [
            {
                "id": "meeting_notes",
                "name": "Meeting Notes",
                "description": "A structured template for capturing meeting discussions",
                "icon": "Users",
                "content": "<h1>📋 Meeting Notes</h1><p></p><p>📅 <strong>Date:</strong> </p><p>📍 <strong>Location:</strong> </p><p></p><p><strong>Attendees</strong></p><ul><li><p></p></li></ul><p></p><hr><p></p><p><strong>Agenda</strong></p><ol><li><p></p></li></ol><p></p><p><strong>Notes:</strong></p><p></p><p></p><p><strong>Action Items</strong></p><ul><li><p>☐ </p></li></ul>"
            }
        ],
        "actions": []
    }
]

@addons_bp.route('', methods=['GET'])
@jwt_required()
def get_addons():
    """Get all available addons and user's status."""
    current_user_id = get_jwt_identity()
    user = User.find_by_id(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    # Enrich addons with user status
    addons_with_status = []
    for addon in AVAILABLE_ADDONS:
        addon_data = addon.copy()
        # Always-active addons are always enabled
        addon_data['enabled'] = addon.get('is_always_active') or addon['id'] in user.active_addons
        addons_with_status.append(addon_data)
        
    return jsonify(addons_with_status), 200

@addons_bp.route('/<addon_id>/enable', methods=['POST'])
@jwt_required()
def enable_addon(addon_id):
    """Enable an addon."""
    current_user_id = get_jwt_identity()
    user = User.find_by_id(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Verify addon exists
    if not any(a['id'] == addon_id for a in AVAILABLE_ADDONS):
        return jsonify({'error': 'Add-on not found'}), 404
        
    user.enable_addon(addon_id)
    return jsonify({'message': f'Add-on {addon_id} enabled', 'active_addons': user.active_addons}), 200

@addons_bp.route('/<addon_id>/disable', methods=['POST'])
@jwt_required()
def disable_addon(addon_id):
    """Disable an addon."""
    current_user_id = get_jwt_identity()
    user = User.find_by_id(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    user.disable_addon(addon_id)
    return jsonify({'message': f'Add-on {addon_id} disabled', 'active_addons': user.active_addons}), 200


@addons_bp.route('/commands', methods=['GET'])
@jwt_required()
def get_addon_commands():
    """Get all templates, actions, and UI components from enabled addons."""
    current_user_id = get_jwt_identity()
    user = User.find_by_id(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    templates = []
    actions = []
    ui_components = []
    
    for addon in AVAILABLE_ADDONS:
        # Include if always active OR if user has enabled it
        if addon.get('is_always_active') or addon['id'] in user.active_addons:
            # Add templates with addon context
            for template in addon.get('templates', []):
                templates.append({
                    **template,
                    'addon_id': addon['id'],
                    'addon_name': addon['name']
                })
            # Add actions with addon context
            for action in addon.get('actions', []):
                actions.append({
                    **action,
                    'addon_id': addon['id'],
                    'addon_name': addon['name']
                })
            # Add UI components with addon context
            for component in addon.get('ui_components', []):
                ui_components.append({
                    **component,
                    'addon_id': addon['id'],
                    'addon_name': addon['name']
                })
    
    return jsonify({
        'templates': templates,
        'actions': actions,
        'ui_components': ui_components
    }), 200
