"""
Data models and request/response schemas for the voice transcription service.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class TranscriptionRequest:
    """
    Request model for transcription endpoint.
    
    Attributes:
        audio_data: Base64 encoded audio data (optional)
        audio_file: Audio file path or file object (optional)
        language: Language code for recognition (optional)
        sample_rate: Audio sample rate (optional)
    """
    audio_data: Optional[str] = None
    audio_file: Optional[Any] = None
    language: Optional[str] = None
    sample_rate: Optional[int] = None


@dataclass
class TranscriptionResponse:
    """
    Response model for transcription endpoint.
    
    Attributes:
        success: Whether the transcription was successful
        text: Transcribed text (if successful)
        error: Error message (if failed)
        language: Language used for recognition
        confidence: Confidence score (if available)
    """
    success: bool
    text: Optional[str] = None
    error: Optional[str] = None
    language: Optional[str] = None
    confidence: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert response to dictionary format.
        
        Returns:
            dict: Dictionary representation of the response
        """
        result = {
            'success': self.success,
            'language': self.language
        }
        
        if self.success:
            result['text'] = self.text
            if self.confidence is not None:
                result['confidence'] = self.confidence
        else:
            result['error'] = self.error
        
        return result


@dataclass
class HealthResponse:
    """
    Response model for health check endpoint.
    
    Attributes:
        status: Service status
        message: Status message
        version: Service version
    """
    status: str
    message: str
    version: str = "1.0.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert health response to dictionary format.
        
        Returns:
            dict: Dictionary representation of the health response
        """
        return {
            'status': self.status,
            'message': self.message,
            'version': self.version
        }

