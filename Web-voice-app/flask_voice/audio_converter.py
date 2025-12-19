"""
Audio format converter utility.
Converts various audio formats to WAV format for transcription.
"""

import os
import tempfile
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Supported input formats
SUPPORTED_INPUT_FORMATS = {'wav', 'mp3', 'mp4', 'm4a', 'flac', 'ogg', 'webm', 'aac', 'wma'}

# WAV output specifications
WAV_SAMPLE_RATE = 16000  # 16kHz
WAV_CHANNELS = 1  # Mono
WAV_SAMPLE_WIDTH = 2  # 16-bit


def is_supported_format(filename):
    """Check if file format is supported for conversion."""
    if not filename or '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in SUPPORTED_INPUT_FORMATS


def convert_mp3_to_wav(mp3_file_path, wav_file_path):
    """
    Converts an MP3 file to WAV format.
    
    Args:
        mp3_file_path (str): The path to the input MP3 file.
        wav_file_path (str): The desired path for the output WAV file.
    
    Returns:
        str: Path to converted WAV file
    """
    try:
        from pydub import AudioSegment
        
        # Load the MP3 file
        audio = AudioSegment.from_mp3(mp3_file_path)
        
        # Convert to transcription-compatible format (16kHz, mono, 16-bit)
        # This ensures optimal quality for speech recognition
        audio = audio.set_frame_rate(WAV_SAMPLE_RATE)
        audio = audio.set_channels(WAV_CHANNELS)
        audio = audio.set_sample_width(WAV_SAMPLE_WIDTH)
        
        # Export as WAV
        audio.export(wav_file_path, format="wav")
        logger.info(f"Successfully converted '{mp3_file_path}' to '{wav_file_path}'")
        return wav_file_path
    except Exception as e:
        error_msg = f"Error converting file: {str(e)}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e


def convert_to_wav(input_path, output_path=None, output_dir=None):
    """
    Convert audio file to WAV format.
    
    Args:
        input_path: Path to input audio file
        output_path: Optional output path (if None, creates temp file)
        output_dir: Optional directory for output file (if output_path is None)
    
    Returns:
        str: Path to converted WAV file
    
    Raises:
        ImportError: If pydub is not installed
        RuntimeError: If conversion fails
        ValueError: If file format is not supported
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Check if already WAV
    if input_path.lower().endswith('.wav'):
        logger.info(f"File is already WAV format: {input_path}")
        return input_path
    
    # Check if format is supported
    filename = os.path.basename(input_path)
    if not is_supported_format(filename):
        raise ValueError(f"Unsupported audio format. Supported formats: {', '.join(SUPPORTED_INPUT_FORMATS)}")
    
    try:
        from pydub import AudioSegment
    except ImportError:
        raise ImportError(
            "pydub is required for audio conversion. "
            "Install it with: pip install pydub\n"
            "You may also need ffmpeg: https://ffmpeg.org/download.html"
        )
    
    try:
        logger.info(f"Loading audio file: {input_path}")
        
        # Get file extension to use format-specific loader when possible
        file_ext = Path(input_path).suffix.lower()
        
        # Load audio file using format-specific method when available
        # For MP3, use the dedicated convert_mp3_to_wav function
        if file_ext == '.mp3':
            # Use the dedicated MP3 converter function
            if output_path is None:
                if output_dir is None:
                    output_dir = os.path.dirname(input_path) or '.'
                base_name = Path(input_path).stem
                output_file = tempfile.NamedTemporaryFile(
                    delete=False,
                    suffix='.wav',
                    prefix=f'converted_{base_name}_',
                    dir=output_dir
                )
                output_path = output_file.name
                output_file.close()
            
            # Use the MP3-specific converter
            return convert_mp3_to_wav(input_path, output_path)
        
        # For other formats, use format-specific loaders
        try:
            if file_ext == '.wav':
                audio = AudioSegment.from_wav(input_path)
            elif file_ext == '.flac':
                audio = AudioSegment.from_flac(input_path)
            elif file_ext == '.ogg':
                audio = AudioSegment.from_ogg(input_path)
            elif file_ext == '.m4a' or file_ext == '.mp4':
                audio = AudioSegment.from_file(input_path, format='m4a')
            elif file_ext == '.webm':
                audio = AudioSegment.from_file(input_path, format='webm')
            elif file_ext == '.aac':
                audio = AudioSegment.from_file(input_path, format='aac')
            else:
                # Fallback to generic loader (auto-detect format)
                audio = AudioSegment.from_file(input_path)
        except Exception as load_error:
            # If format-specific loading fails, try generic loader
            logger.warning(f"Format-specific load failed, trying generic: {str(load_error)}")
            audio = AudioSegment.from_file(input_path)
        
        logger.info(f"Original audio: {len(audio)}ms, {audio.frame_rate}Hz, {audio.channels} channels")
        
        # Convert to required WAV format (16kHz, mono, 16-bit)
        audio = audio.set_frame_rate(WAV_SAMPLE_RATE)
        audio = audio.set_channels(WAV_CHANNELS)
        audio = audio.set_sample_width(WAV_SAMPLE_WIDTH)
        
        logger.info(f"Converted audio: {len(audio)}ms, {audio.frame_rate}Hz, {audio.channels} channels")
        
        # Determine output path
        if output_path is None:
            if output_dir is None:
                output_dir = os.path.dirname(input_path) or '.'
            
            # Create temp file in output directory
            base_name = Path(input_path).stem
            output_file = tempfile.NamedTemporaryFile(
                delete=False,
                suffix='.wav',
                prefix=f'converted_{base_name}_',
                dir=output_dir
            )
            output_path = output_file.name
            output_file.close()
        
        # Export as WAV
        logger.info(f"Exporting to WAV: {output_path}")
        audio.export(output_path, format="wav")
        
        logger.info(f"Successfully converted '{input_path}' to '{output_path}'")
        return output_path
        
    except Exception as e:
        error_msg = f"Failed to convert audio file: {str(e)}"
        logger.error(f"Error converting file: {error_msg}")
        raise RuntimeError(error_msg) from e


def get_audio_info(file_path):
    """
    Get information about an audio file.
    
    Args:
        file_path: Path to audio file
    
    Returns:
        dict: Audio file information (duration, sample_rate, channels, format)
    """
    try:
        from pydub import AudioSegment
        
        audio = AudioSegment.from_file(file_path)
        return {
            'duration_ms': len(audio),
            'duration_seconds': len(audio) / 1000.0,
            'sample_rate': audio.frame_rate,
            'channels': audio.channels,
            'sample_width': audio.sample_width,
            'frame_count': audio.frame_count(),
            'format': Path(file_path).suffix.lower().lstrip('.')
        }
    except ImportError:
        raise ImportError("pydub is required for audio info. Install with: pip install pydub")
    except Exception as e:
        raise RuntimeError(f"Failed to get audio info: {str(e)}") from e


def cleanup_file(file_path):
    """Safely delete a file."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.debug(f"Cleaned up file: {file_path}")
            return True
    except Exception as e:
        logger.warning(f"Failed to cleanup file {file_path}: {str(e)}")
    return False

