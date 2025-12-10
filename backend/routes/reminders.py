"""Reminders API routes."""
import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Reminder
from services.ai_service import AIService

reminders_bp = Blueprint('reminders', __name__, url_prefix='/api/reminders')


@reminders_bp.route('', methods=['GET'])
@jwt_required()
def get_reminders():
    """Get all reminders for the current user."""
    current_user_id = get_jwt_identity()
    include_completed = request.args.get('include_completed', 'false').lower() == 'true'
    
    reminders = Reminder.find_by_user(current_user_id, include_completed=include_completed)
    return jsonify([r.to_dict() for r in reminders]), 200


@reminders_bp.route('', methods=['POST'])
@jwt_required()
def create_reminder():
    """Create a reminder with structured data."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    message = data.get('message', '').strip()
    note_id = data.get('note_id')
    block_id = data.get('block_id')
    due_date_str = data.get('due_date')
    early_reminder_minutes = data.get('early_reminder_minutes', 0)
    
    if not message:
        return jsonify({'error': 'Reminder message is required'}), 400
    
    if not note_id:
        return jsonify({'error': 'Note ID is required'}), 400
    
    if not due_date_str:
        return jsonify({'error': 'Due date is required'}), 400
    
    try:
        # Parse ISO date string
        due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    
    # Create the reminder
    reminder = Reminder(
        user_id=current_user_id,
        note_id=note_id,
        block_id=block_id,
        message=message,
        due_date=due_date,
        raw_text=message,  # Use message as raw_text since we're not parsing
        early_reminder_minutes=early_reminder_minutes,
    )
    reminder.save()
    
    return jsonify(reminder.to_dict()), 201


@reminders_bp.route('/parse', methods=['POST'])
@jwt_required()
def parse_reminder():
    """Parse reminder text using LLM and create a reminder."""
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    raw_text = data.get('text', '').strip()
    note_id = data.get('note_id')
    block_id = data.get('block_id')
    
    if not raw_text:
        return jsonify({'error': 'Reminder text is required'}), 400
    
    if not note_id:
        return jsonify({'error': 'Note ID is required'}), 400
    
    # Use LLM to parse the reminder
    try:
        parsed = parse_reminder_with_llm(raw_text)
        
        if not parsed.get('success'):
            return jsonify({
                'error': parsed.get('error', 'Could not parse reminder'),
                'parsed': parsed
            }), 400
        
        # Get early reminder setting from request
        early_reminder_minutes = data.get('early_reminder_minutes', 0)
        
        # Create the reminder
        reminder = Reminder(
            user_id=current_user_id,
            note_id=note_id,
            block_id=block_id,
            message=parsed['message'],
            due_date=parsed['due_date'],
            raw_text=raw_text,
            early_reminder_minutes=early_reminder_minutes,
        )
        reminder.save()
        
        return jsonify({
            'success': True,
            'reminder': reminder.to_dict(),
            'parsed': parsed
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to parse reminder: {str(e)}'}), 500


@reminders_bp.route('/<reminder_id>', methods=['GET'])
@jwt_required()
def get_reminder(reminder_id):
    """Get a specific reminder."""
    current_user_id = get_jwt_identity()
    reminder = Reminder.find_by_id(reminder_id)
    
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    
    if reminder.user_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify(reminder.to_dict()), 200


@reminders_bp.route('/<reminder_id>/complete', methods=['POST'])
@jwt_required()
def complete_reminder(reminder_id):
    """Mark a reminder as completed."""
    current_user_id = get_jwt_identity()
    reminder = Reminder.find_by_id(reminder_id)
    
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    
    if reminder.user_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    reminder.mark_completed()
    return jsonify(reminder.to_dict()), 200


@reminders_bp.route('/<reminder_id>/notified', methods=['POST'])
@jwt_required()
def mark_notified(reminder_id):
    """Mark a reminder as notified (notification was shown to user)."""
    current_user_id = get_jwt_identity()
    reminder = Reminder.find_by_id(reminder_id)
    
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    
    if reminder.user_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    reminder.mark_notified()
    return jsonify(reminder.to_dict()), 200


@reminders_bp.route('/<reminder_id>', methods=['DELETE'])
@jwt_required()
def delete_reminder(reminder_id):
    """Delete a reminder."""
    current_user_id = get_jwt_identity()
    reminder = Reminder.find_by_id(reminder_id)
    
    if not reminder:
        return jsonify({'error': 'Reminder not found'}), 404
    
    if reminder.user_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    reminder.delete()
    return jsonify({'message': 'Reminder deleted'}), 200


@reminders_bp.route('/due', methods=['GET'])
@jwt_required()
def get_due_reminders():
    """Get reminders that will trigger in the next 5 minutes.
    
    Trigger time = due_date - early_reminder_minutes
    Returns reminders where trigger_time is between now and now + 5 minutes.
    """
    from datetime import timedelta
    
    current_user_id = get_jwt_identity()
    now = datetime.utcnow()
    window_end = now + timedelta(minutes=5)
    
    # Get all non-notified reminders for this user
    reminders = Reminder.find_by_user(current_user_id, include_completed=False)
    
    upcoming = []
    for r in reminders:
        if r.notified:
            continue
            
        # Calculate trigger time (due_date minus early reminder offset)
        trigger_time = r.due_date - timedelta(minutes=r.early_reminder_minutes)
        
        # Check if trigger time is within the next 5 minutes
        if now <= trigger_time <= window_end:
            reminder_dict = r.to_dict()
            # Include the calculated trigger time for the frontend (with Z suffix for UTC)
            reminder_dict['trigger_time'] = trigger_time.isoformat() + 'Z'
            upcoming.append(reminder_dict)
    
    return jsonify(upcoming), 200


def parse_reminder_with_llm(text: str) -> dict:
    """Use LLM to parse reminder text into structured data."""
    
    # Get current date for context
    now = datetime.now()
    current_date = now.strftime("%m/%d/%Y")
    current_time = now.strftime("%I:%M %p")
    
    prompt = f"""Parse the following reminder text and extract the date, time, and message.

Current date: {current_date}
Current time: {current_time}

Reminder text: {text}

Respond with ONLY a JSON object (no markdown, no explanation) in this exact format:
{{
  "success": true,
  "date": "MM/DD/YYYY",
  "time": "HH:MM AM/PM",
  "message": "the reminder message"
}}

If you cannot parse a valid date/time, respond with:
{{
  "success": false,
  "error": "explanation of what's wrong"
}}

Handle relative dates like "tomorrow", "next Monday", "in 2 hours", etc.
If no time is specified, default to 9:00 AM.
If no date is specified, assume today (or tomorrow if the time has passed)."""

    try:
        # Use AIService to get provider and make the request
        provider = AIService.get_provider()
        
        # Use the provider's client directly for custom prompts
        response = provider.client.chat.completions.create(
            model=provider.model,
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a helpful assistant that parses reminder text into structured JSON. Respond only with valid JSON, no markdown or explanation.'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            temperature=0.3,
            max_tokens=200
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Clean up response - remove markdown code blocks if present
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]  # Remove first line
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            elif '```' in response_text:
                response_text = response_text.split('```')[0]
        response_text = response_text.strip()
        
        parsed = json.loads(response_text)
        
        if parsed.get('success'):
            # Parse the date and time into a datetime object
            date_str = parsed.get('date', '')
            time_str = parsed.get('time', '9:00 AM')
            
            try:
                due_date = datetime.strptime(f"{date_str} {time_str}", "%m/%d/%Y %I:%M %p")
                parsed['due_date'] = due_date
            except ValueError as e:
                return {
                    'success': False,
                    'error': f'Invalid date/time format: {date_str} {time_str}'
                }
        
        return parsed
        
    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Failed to parse LLM response as JSON: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'LLM parsing failed: {str(e)}'
        }
