"""
Flask blueprint for voice transcription API endpoints.
Handles HTTP requests for audio transcription.
"""

import os
import logging
import time
import uuid
from pathlib import Path
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import config
from app.models import TranscriptionRequest, TranscriptionResponse, HealthResponse
from app.audio_utils import AudioProcessor
from app.voice_transcriber_service import VoiceTranscriberService

logger = logging.getLogger(__name__)

# Create blueprint
bp = Blueprint('transcriber', __name__)

# Initialize transcription service
transcriber_service = VoiceTranscriberService()


@bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    
    Returns:
        JSON response with service status
    """
    try:
        response = HealthResponse(
            status='healthy',
            message='Voice transcription service is running'
        )
        return jsonify(response.to_dict()), 200
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        response = HealthResponse(
            status='error',
            message=f'Service error: {str(e)}'
        )
        return jsonify(response.to_dict()), 500


@bp.route('/analyze-file', methods=['POST'])
def analyze_file():
    """
    Analyze file to determine if conversion is needed and estimate processing time.
    
    Request:
        - Multipart form data with 'audio' file field
    
    Returns:
        JSON response with file analysis metadata
    """
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Check file extension
        filename = secure_filename(audio_file.filename)
        file_ext = Path(filename).suffix.lower()
        is_wav = file_ext == '.wav'
        
        # Get file size
        audio_file.seek(0, os.SEEK_END)
        file_size_bytes = audio_file.tell()
        audio_file.seek(0)  # Reset to beginning
        file_size_mb = file_size_bytes / (1024 * 1024)
        
        # Estimate processing times
        estimated_conversion_time = 0 if is_wav else max(1.0, file_size_mb * 1.0)
        estimated_transcription_time = max(2.0, file_size_mb * 5.0)
        
        return jsonify({
            "needsConversion": not is_wav,
            "fileExtension": file_ext,
            "fileSizeMB": round(file_size_mb, 2),
            "estimatedConversionTime": round(estimated_conversion_time, 2),
            "estimatedTranscriptionTime": round(estimated_transcription_time, 2),
            "estimatedTotalTime": round(estimated_conversion_time + estimated_transcription_time, 2)
        }), 200
        
    except Exception as e:
        logger.error(f"Error analyzing file: {str(e)}")
        return jsonify({"error": f"Error analyzing file: {str(e)}"}), 500


@bp.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio from base64 encoded data.
    
    Request body (JSON):
        {
            "audio_data": "base64_encoded_audio_string",
            "language": "en-US" (optional)
        }
    
    Returns:
        JSON response with transcription result
    """
    try:
        # Get JSON data
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        # Extract audio data
        audio_data = data.get('audio_data')
        if not audio_data:
            return jsonify({
                'success': False,
                'error': 'No audio_data provided in request'
            }), 400
        
        # Get optional parameters
        language = data.get('language', config.RECOGNITION_LANGUAGE)
        
        logger.info(f"Received transcription request (language: {language})")
        
        # Decode base64 audio
        try:
            audio_bytes = AudioProcessor.decode_base64_audio(audio_data)
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Save to temporary file
        temp_file = None
        try:
            temp_file = AudioProcessor.save_audio_to_temp(audio_bytes, '.wav')
            
            # Process audio for transcription
            processed_file = AudioProcessor.process_audio_for_transcription(temp_file)
            
            # Transcribe audio
            result = transcriber_service.transcribe_audio_file(
                processed_file,
                language=language
            )
            
            # Clean up temporary files
            if config.CLEANUP_TEMP_FILES:
                if processed_file != temp_file:
                    AudioProcessor.cleanup_temp_file(processed_file)
                AudioProcessor.cleanup_temp_file(temp_file)
            
            # Return response
            response = TranscriptionResponse(
                success=result['success'],
                text=result.get('text'),
                error=result.get('error'),
                language=language,
                confidence=result.get('confidence')
            )
            
            status_code = 200 if result['success'] else 500
            return jsonify(response.to_dict()), status_code
            
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            
            # Clean up on error
            if temp_file and os.path.exists(temp_file):
                AudioProcessor.cleanup_temp_file(temp_file)
            
            response = TranscriptionResponse(
                success=False,
                error=f"Transcription failed: {str(e)}",
                language=language
            )
            return jsonify(response.to_dict()), 500
    
    except Exception as e:
        logger.error(f"Unexpected error in transcribe endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@bp.route('/transcribe-file', methods=['POST'])
def transcribe_file():
    """
    Transcribe audio from uploaded file.
    
    Request:
        - Multipart form data with 'audio' file field
        - Optional 'language' form field
    
    Returns:
        JSON response with transcription result
    """
    try:
        # Check if file is present
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        audio_file = request.files['audio']
        
        # Check if file is selected
        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Get optional language parameter
        language = request.form.get('language', config.RECOGNITION_LANGUAGE)
        
        logger.info(f"Received file transcription request: {audio_file.filename} (language: {language})")
        
        # Save uploaded file with unique filename to avoid conflicts
        original_filename = secure_filename(audio_file.filename)
        # Add timestamp and UUID to ensure uniqueness for concurrent requests
        unique_id = f"{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
        file_ext = Path(original_filename).suffix or '.tmp'
        filename = f"{Path(original_filename).stem}_{unique_id}{file_ext}"
        upload_path = os.path.join(config.UPLOAD_FOLDER, filename)
        audio_file.save(upload_path)
        
        # Get file metadata before processing
        file_ext = Path(filename).suffix.lower()
        is_wav = file_ext == '.wav'
        file_size_mb = os.path.getsize(upload_path) / (1024 * 1024)
        
        processed_file = None
        try:
            # Process audio for transcription
            processed_file = AudioProcessor.process_audio_for_transcription(upload_path)
            
            # Transcribe audio
            result = transcriber_service.transcribe_audio_file(
                processed_file,
                language=language
            )
            
            # Build response with metadata (similar to old service format)
            response_dict = {
                'success': result['success'],
                'language': language
            }
            
            if result['success']:
                response_dict['text'] = result.get('text')
                if result.get('confidence') is not None:
                    response_dict['confidence'] = result.get('confidence')
                # Add metadata for compatibility with backend
                response_dict['metadata'] = {
                    'needsConversion': not is_wav,
                    'fileExtension': file_ext,
                    'fileSizeMB': round(file_size_mb, 2),
                    'estimatedConversionTime': round(0 if is_wav else max(1.0, file_size_mb * 1.0), 2),
                    'estimatedTranscriptionTime': round(max(2.0, file_size_mb * 5.0), 2),
                    'estimatedTotalTime': round((0 if is_wav else max(1.0, file_size_mb * 1.0)) + max(2.0, file_size_mb * 5.0), 2)
                }
            else:
                response_dict['error'] = result.get('error')
            
            # Clean up files
            if config.CLEANUP_TEMP_FILES:
                if processed_file != upload_path:
                    AudioProcessor.cleanup_temp_file(processed_file)
                AudioProcessor.cleanup_temp_file(upload_path)
            
            status_code = 200 if result['success'] else 500
            return jsonify(response_dict), status_code
            
        except Exception as e:
            logger.error(f"File transcription error: {str(e)}", exc_info=True)
            
            # Clean up on error - ensure all files are cleaned up
            if processed_file and os.path.exists(processed_file) and processed_file != upload_path:
                AudioProcessor.cleanup_temp_file(processed_file)
            if os.path.exists(upload_path):
                AudioProcessor.cleanup_temp_file(upload_path)
            
            response = TranscriptionResponse(
                success=False,
                error=f"Transcription failed: {str(e)}",
                language=language
            )
            return jsonify(response.to_dict()), 500
    
    except Exception as e:
        logger.error(f"Unexpected error in transcribe-file endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@bp.route('/transcribe-live', methods=['POST'])
def transcribe_live():
    """
    Transcribe audio from server's microphone (if available).
    
    Request body (JSON, optional):
        {
            "language": "en-US" (optional),
            "timeout": 5 (optional, seconds),
            "phrase_time_limit": 10 (optional, seconds)
        }
    
    Returns:
        JSON response with transcription result
    """
    try:
        # Get JSON data (optional parameters)
        data = request.get_json() or {}
        
        # Extract optional parameters
        language = data.get('language', config.RECOGNITION_LANGUAGE)
        timeout = data.get('timeout', 5)
        phrase_time_limit = data.get('phrase_time_limit', 10)
        
        logger.info(f"Received live transcription request (language: {language})")
        
        # Transcribe from microphone
        result = transcriber_service.transcribe_from_microphone(
            language=language,
            timeout=timeout,
            phrase_time_limit=phrase_time_limit
        )
        
        # Return response
        response = TranscriptionResponse(
            success=result['success'],
            text=result.get('text'),
            error=result.get('error'),
            language=language,
            confidence=result.get('confidence')
        )
        
        status_code = 200 if result['success'] else 500
        return jsonify(response.to_dict()), status_code
        
    except Exception as e:
        logger.error(f"Unexpected error in transcribe-live endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

