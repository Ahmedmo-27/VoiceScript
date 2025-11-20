"""
Audio processing utilities for the voice transcription service.
Handles audio format conversion, validation, and processing.
"""

import base64
import os
import tempfile
import logging
from pathlib import Path
from typing import Optional, Tuple
import config

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    logging.warning("pydub not available. Audio conversion features will be limited.")

logger = logging.getLogger(__name__)


class AudioProcessor:
    """
    Utility class for audio processing operations.
    """
    
    @staticmethod
    def decode_base64_audio(base64_data: str) -> bytes:
        """
        Decode base64 encoded audio data.
        
        Args:
            base64_data: Base64 encoded string (with or without data URI prefix)
            
        Returns:
            bytes: Decoded audio data
            
        Raises:
            ValueError: If base64 data is invalid
        """
        try:
            # Remove data URI prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            # Decode base64
            audio_bytes = base64.b64decode(base64_data)
            logger.debug(f"Decoded base64 audio data: {len(audio_bytes)} bytes")
            return audio_bytes
            
        except Exception as e:
            logger.error(f"Error decoding base64 audio: {str(e)}")
            raise ValueError(f"Invalid base64 audio data: {str(e)}")
    
    @staticmethod
    def save_audio_to_temp(audio_bytes: bytes, file_extension: str = '.wav') -> str:
        """
        Save audio bytes to a temporary file.
        
        Args:
            audio_bytes: Audio data as bytes
            file_extension: File extension for the temporary file
            
        Returns:
            str: Path to the temporary file
        """
        try:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(
                delete=False,
                suffix=file_extension,
                dir=config.TEMP_FOLDER,
                prefix=config.TEMP_FILE_PREFIX
            )
            temp_file.write(audio_bytes)
            temp_file.close()
            
            logger.debug(f"Saved audio to temporary file: {temp_file.name}")
            return temp_file.name
            
        except Exception as e:
            logger.error(f"Error saving audio to temp file: {str(e)}")
            raise RuntimeError(f"Failed to save audio to temporary file: {str(e)}")
    
    @staticmethod
    def convert_to_wav(input_path: str, output_path: Optional[str] = None) -> str:
        """
        Convert audio file to WAV format with required specifications.
        
        Args:
            input_path: Path to input audio file
            output_path: Path to output WAV file (optional, creates temp if not provided)
            
        Returns:
            str: Path to the converted WAV file
            
        Raises:
            RuntimeError: If conversion fails or pydub is not available
        """
        if not PYDUB_AVAILABLE:
            # If pydub is not available, check if file is already WAV
            if input_path.lower().endswith('.wav'):
                return input_path
            else:
                raise RuntimeError("Audio conversion requires pydub. File must be in WAV format.")
        
        try:
            # Load audio file
            audio = AudioSegment.from_file(input_path)
            
            # Convert to required format
            audio = audio.set_frame_rate(config.DEFAULT_SAMPLE_RATE)
            audio = audio.set_channels(config.DEFAULT_CHANNELS)
            audio = audio.set_sample_width(config.DEFAULT_SAMPLE_WIDTH)
            
            # Determine output path
            if output_path is None:
                output_file = tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix='.wav',
                    dir=config.TEMP_FOLDER,
                    prefix=config.TEMP_FILE_PREFIX
                )
                output_path = output_file.name
                output_file.close()
            
            # Export as WAV
            audio.export(output_path, format='wav')
            logger.debug(f"Converted audio to WAV: {input_path} -> {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"Error converting audio to WAV: {str(e)}")
            raise RuntimeError(f"Failed to convert audio to WAV: {str(e)}")
    
    @staticmethod
    def validate_audio_file(file_path: str) -> bool:
        """
        Validate that the audio file exists and is readable.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            bool: True if file is valid, False otherwise
        """
        try:
            if not os.path.exists(file_path):
                logger.warning(f"Audio file does not exist: {file_path}")
                return False
            
            if not os.path.isfile(file_path):
                logger.warning(f"Path is not a file: {file_path}")
                return False
            
            # Check file size
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                logger.warning(f"Audio file is empty: {file_path}")
                return False
            
            if file_size > config.MAX_CONTENT_LENGTH:
                logger.warning(f"Audio file too large: {file_size} bytes")
                return False
            
            # Try to read the file
            with open(file_path, 'rb') as f:
                f.read(1)
            
            logger.debug(f"Audio file validated: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error validating audio file: {str(e)}")
            return False
    
    @staticmethod
    def get_audio_format(file_path: str) -> Optional[str]:
        """
        Get audio file format from extension.
        
        Args:
            file_path: Path to the audio file
            
        Returns:
            str: Audio format (extension without dot) or None
        """
        try:
            extension = Path(file_path).suffix.lower().lstrip('.')
            if extension in config.SUPPORTED_AUDIO_FORMATS:
                return extension
            return None
        except Exception as e:
            logger.error(f"Error getting audio format: {str(e)}")
            return None
    
    @staticmethod
    def cleanup_temp_file(file_path: str) -> bool:
        """
        Clean up a temporary file.
        
        Args:
            file_path: Path to the temporary file
            
        Returns:
            bool: True if file was deleted, False otherwise
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.debug(f"Cleaned up temporary file: {file_path}")
                return True
            return False
        except Exception as e:
            logger.warning(f"Error cleaning up temp file {file_path}: {str(e)}")
            return False
    
    @staticmethod
    def process_audio_for_transcription(audio_path: str) -> str:
        """
        Process audio file to ensure it's in the correct format for transcription.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            str: Path to the processed WAV file (may be same as input if already WAV)
            
        Raises:
            RuntimeError: If processing fails
        """
        # Validate file
        if not AudioProcessor.validate_audio_file(audio_path):
            raise RuntimeError("Invalid audio file")
        
        # Check if already WAV format
        audio_format = AudioProcessor.get_audio_format(audio_path)
        if audio_format == 'wav':
            logger.debug(f"Audio file is already in WAV format: {audio_path}")
            return audio_path
        
        # Convert to WAV
        logger.info(f"Converting audio from {audio_format} to WAV format")
        wav_path = AudioProcessor.convert_to_wav(audio_path)
        return wav_path

