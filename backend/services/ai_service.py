"""AI Service - Modular AI provider integration."""
from abc import ABC, abstractmethod
from typing import Optional
from flask import current_app


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    def transform_text(self, text: str, action: str, context: Optional[str] = None) -> str:
        """Transform text based on action."""
        pass
    
    def get_prompt(self, text: str, action: str, context: Optional[str] = None) -> str:
        """Get prompt for the given action."""
        prompts = {
            'rewrite': f'Rewrite the following text for clarity and better readability. Keep the same meaning but improve the writing:\n\n{text}',
            'summarize': f'Summarize the following text concisely while preserving the key points:\n\n{text}',
            'expand': f'Expand on the following idea with more detail and explanation:\n\n{text}',
            'bullets': f'Convert the following text into clear, organized bullet points:\n\n{text}',
            'insights': f'Generate key insights and follow-up questions based on the following text:\n\n{text}',
            'tasks': f'Extract actionable tasks from the following text and format them as a task list:\n\n{text}',
            'polish': f'Polish the following HTML content for clarity and brevity. Rules:\n1. PRESERVE all HTML tags exactly as they are (<p>, <ul>, <ol>, <li>, <strong>, <em>, etc.).\n2. Only modify the text content inside the tags - do not change, remove, or add any HTML tags.\n3. Polish each paragraph or list item individually - do not merge or restructure.\n4. Remove unnecessary words and improve clarity within each element.\n5. Keep the core meaning intact.\n6. Return ONLY the polished HTML with no explanations or markdown.\n\nHTML to polish:\n\n{text}',
            'summarize_note': f'Summarize the following note content. The note contains text blocks and diagram elements from a visual canvas.\n\nRules:\n1. Create a concise summary that captures the main ideas and key points.\n2. If there are diagram elements (shapes with labels), incorporate their meaning into the summary.\n3. Preserve the logical flow and relationships between ideas.\n4. Use clear, professional language.\n5. Format the summary as HTML: use <p> for paragraphs, <ul>/<li> for bullet points, <strong> for emphasis.\n6. Keep the summary concise but comprehensive.\n7. Return ONLY raw HTML. Do NOT wrap in code blocks, do NOT use ``` or ```html, do NOT include any markdown.\n\nNote content:\n\n{text}',
        }
        
        base_prompt = prompts.get(action, f'Process the following text: {text}')
        
        if context:
            base_prompt = f'Context: {context}\n\n{base_prompt}'
        
        return base_prompt


class OpenAIProvider(AIProvider):
    """OpenAI API provider."""
    
    def __init__(self, api_key: str, model: str = 'gpt-4o'):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model
    
    def transform_text(self, text: str, action: str, context: Optional[str] = None) -> str:
        """Transform text using OpenAI."""
        prompt = self.get_prompt(text, action, context)
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    'role': 'system',
                    'content': 'You are a helpful writing assistant. Respond only with the transformed text, no explanations or preamble.'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.choices[0].message.content.strip()


class AnthropicProvider(AIProvider):
    """Anthropic API provider (for future use)."""
    
    def __init__(self, api_key: str, model: str = 'claude-3-haiku-20240307'):
        # Import will be added when Anthropic support is needed
        self.api_key = api_key
        self.model = model
    
    def transform_text(self, text: str, action: str, context: Optional[str] = None) -> str:
        """Transform text using Anthropic."""
        # Placeholder for Anthropic implementation
        raise NotImplementedError('Anthropic provider not yet implemented')


class AIService:
    """AI Service factory and manager."""
    
    _providers = {
        'openai': OpenAIProvider,
        'anthropic': AnthropicProvider,
    }
    
    _instance: Optional[AIProvider] = None
    
    @classmethod
    def get_provider(cls, provider_name: Optional[str] = None) -> AIProvider:
        """Get AI provider instance."""
        if provider_name is None:
            provider_name = current_app.config.get('AI_PROVIDER', 'openai')
        
        provider_name = provider_name.lower()
        
        if provider_name not in cls._providers:
            raise ValueError(f'Unknown AI provider: {provider_name}')
        
        # Get API key based on provider
        if provider_name == 'openai':
            api_key = current_app.config.get('OPENAI_API_KEY')
            if not api_key:
                raise ValueError('OPENAI_API_KEY not configured')
            return OpenAIProvider(api_key)
        
        elif provider_name == 'anthropic':
            api_key = current_app.config.get('ANTHROPIC_API_KEY')
            if not api_key:
                raise ValueError('ANTHROPIC_API_KEY not configured')
            return AnthropicProvider(api_key)
        
        raise ValueError(f'Provider {provider_name} not configured')
    
    @classmethod
    def transform(cls, text: str, action: str, context: Optional[str] = None, provider: Optional[str] = None) -> str:
        """Transform text using configured AI provider."""
        ai_provider = cls.get_provider(provider)
        return ai_provider.transform_text(text, action, context)
    
    @classmethod
    def get_available_actions(cls) -> list:
        """Get list of available AI actions."""
        return [
            {'id': 'polish', 'name': 'Polish', 'description': 'Improve clarity and brevity'},
            {'id': 'rewrite', 'name': 'Rewrite for Clarity', 'description': 'Improve readability while keeping the same meaning'},
            {'id': 'summarize', 'name': 'Summarize', 'description': 'Create a concise summary'},
            {'id': 'expand', 'name': 'Expand', 'description': 'Add more detail and explanation'},
            {'id': 'bullets', 'name': 'Convert to Bullets', 'description': 'Format as bullet points'},
            {'id': 'insights', 'name': 'Generate Insights', 'description': 'Extract key insights and questions'},
            {'id': 'tasks', 'name': 'Extract Tasks', 'description': 'Convert to actionable task list'},
        ]
