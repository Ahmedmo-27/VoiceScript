"""
Voice transcription service using SpeechRecognition library.
Handles the actual speech-to-text conversion with multiple fallback options.
"""

# Import compatibility fixes before other imports
import app.compat  # noqa: F401

import logging
import speech_recognition as sr
from typing import Dict, Optional, Any
import config

logger = logging.getLogger(__name__)


class VoiceTranscriberService:
    """
    Service class for transcribing audio to text using speech recognition.
    Supports multiple recognition engines with fallback options.
    """
    
    def __init__(self):
        """
        Initialize the voice transcription service.
        """
        self.recognizer = sr.Recognizer()
        
        # Configure recognizer settings
        self.recognizer.energy_threshold = config.RECOGNITION_ENERGY_THRESHOLD
        self.recognizer.dynamic_energy_threshold = config.RECOGNITION_DYNAMIC_ENERGY_THRESHOLD
        
        logger.info("VoiceTranscriberService initialized")
    
    def transcribe_audio_file(
        self,
        audio_file_path: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribe an audio file to text.
        
        Args:
            audio_file_path: Path to the audio file (WAV format)
            language: Language code for recognition (default: from config)
            
        Returns:
            dict: Dictionary with 'success', 'text', 'error', and optionally 'confidence'
        """
        if language is None:
            language = config.RECOGNITION_LANGUAGE
        
        try:
            # Load audio file
            with sr.AudioFile(audio_file_path) as source:
                logger.debug(f"Loading audio file: {audio_file_path}")
                
                # Adjust for ambient noise
                try:
                    self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    logger.debug("Adjusted for ambient noise")
                except Exception as e:
                    logger.warning(f"Could not adjust for ambient noise: {str(e)}")
                
                # Read audio data
                audio_data = self.recognizer.record(source)
                logger.debug(f"Audio data loaded: {len(audio_data.frame_data)} bytes")
            
            # Try multiple recognition methods with fallback
            result = self._recognize_with_fallback(audio_data, language)
            
            return result
            
        except FileNotFoundError:
            error_msg = f"Audio file not found: {audio_file_path}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except sr.WaitTimeoutError:
            error_msg = "Recognition timeout - audio may be too long or silent"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Error transcribing audio: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
    
    def _recognize_with_fallback(
        self,
        audio_data: sr.AudioData,
        language: str
    ) -> Dict[str, Any]:
        """
        Attempt speech recognition with multiple fallback methods.
        
        Args:
            audio_data: AudioData object from SpeechRecognition
            language: Language code for recognition
            
        Returns:
            dict: Dictionary with recognition result
        """
        # List of recognition methods to try (in order of preference)
        recognition_methods = [
            ('google', self._recognize_google),
            ('google_cloud', self._recognize_google_cloud),
            ('sphinx', self._recognize_sphinx),
        ]
        
        last_error = None
        
        for method_name, method_func in recognition_methods:
            try:
                logger.debug(f"Trying {method_name} recognition")
                text = method_func(audio_data, language)
                
                if text:
                    logger.info(f"Successfully transcribed using {method_name}")
                    return {
                        'success': True,
                        'text': text,
                        'method': method_name
                    }
                    
            except sr.UnknownValueError:
                error_msg = f"{method_name} could not understand the audio"
                logger.warning(error_msg)
                last_error = error_msg
                continue
                
            except sr.RequestError as e:
                error_msg = f"{method_name} recognition error: {str(e)}"
                logger.warning(error_msg)
                last_error = error_msg
                continue
                
            except Exception as e:
                error_msg = f"{method_name} unexpected error: {str(e)}"
                logger.warning(error_msg)
                last_error = error_msg
                continue
        
        # All methods failed
        return {
            'success': False,
            'error': f"All recognition methods failed. Last error: {last_error}"
        }
    
    def _recognize_google(
        self,
        audio_data: sr.AudioData,
        language: str
    ) -> str:
        """
        Recognize speech using Google Speech Recognition (free, requires internet).
        
        Args:
            audio_data: AudioData object
            language: Language code
            
        Returns:
            str: Transcribed text
        """
        return self.recognizer.recognize_google(
            audio_data,
            language=language,
            show_all=False
        )
    
    def _recognize_google_cloud(
        self,
        audio_data: sr.AudioData,
        language: str
    ) -> str:
        """
        Recognize speech using Google Cloud Speech Recognition (requires API key).
        This is a placeholder - requires GOOGLE_APPLICATION_CREDENTIALS environment variable.
        
        Args:
            audio_data: AudioData object
            language: Language code
            
        Returns:
            str: Transcribed text
            
        Raises:
            Exception: If credentials are not configured
        """
        # Check if credentials are available
        import os
        if not os.getenv('GOOGLE_APPLICATION_CREDENTIALS'):
            raise sr.RequestError("Google Cloud credentials not configured")
        
        return self.recognizer.recognize_google_cloud(
            audio_data,
            language=language,
            credentials_json=None  # Uses GOOGLE_APPLICATION_CREDENTIALS
        )
    
    def _recognize_sphinx(
        self,
        audio_data: sr.AudioData,
        language: str
    ) -> str:
        """
        Recognize speech using CMU Sphinx (offline, no internet required).
        Note: Only supports 'en-US' language.
        
        Args:
            audio_data: AudioData object
            language: Language code (must be 'en-US' for Sphinx)
            
        Returns:
            str: Transcribed text
            
        Raises:
            Exception: If language is not supported
        """
        if language != 'en-US':
            raise sr.RequestError("Sphinx only supports 'en-US' language")
        
        return self.recognizer.recognize_sphinx(audio_data)
    
    def transcribe_from_microphone(
        self,
        language: Optional[str] = None,
        timeout: int = 5,
        phrase_time_limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio from microphone in real-time.
        
        Args:
            language: Language code for recognition (default: from config)
            timeout: Seconds to wait for speech before timing out
            phrase_time_limit: Maximum seconds for a phrase (None for no limit)
            
        Returns:
            dict: Dictionary with 'success', 'text', 'error', and optionally 'confidence'
        """
        if language is None:
            language = config.RECOGNITION_LANGUAGE
        
        try:
            # Use default microphone
            microphone = sr.Microphone()
            
            # Adjust for ambient noise
            logger.debug("Adjusting for ambient noise...")
            with microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            # Listen for audio
            logger.debug("Listening to microphone...")
            with microphone as source:
                audio_data = self.recognizer.listen(
                    source,
                    timeout=timeout,
                    phrase_time_limit=phrase_time_limit
                )
            
            # Recognize speech
            result = self._recognize_with_fallback(audio_data, language)
            return result
            
        except sr.WaitTimeoutError:
            return {
                'success': False,
                'error': 'No speech detected within timeout period'
            }
        except OSError as e:
            return {
                'success': False,
                'error': f'Microphone not found or not accessible: {str(e)}'
            }
        except Exception as e:
            logger.error(f"Error in microphone transcription: {str(e)}")
            return {
                'success': False,
                'error': f'Microphone transcription failed: {str(e)}'
            }

