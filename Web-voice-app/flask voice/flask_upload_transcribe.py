"""
Flask service for transcribing uploaded audio files.
Handles file uploads, converts audio formats, and transcribes to text.
"""

# Fix for Python 3.13 compatibility - aifc was removed
# MUST be before any other imports that might trigger speech_recognition import
import sys
import types

if sys.version_info >= (3, 13):
    if 'aifc' not in sys.modules:
        aifc_stub = types.ModuleType('aifc')
        aifc_stub.Error = Exception
        def aifc_open(*args, **kwargs):
            raise NotImplementedError("aifc.open() not available in Python 3.13+")
        aifc_stub.open = aifc_open
        sys.modules['aifc'] = aifc_stub

import os
import logging
from werkzeug.utils import secure_filename
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr

from audio_converter import convert_to_wav, cleanup_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.normpath('uploads')
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'mp4', 'm4a', 'flac', 'ogg', 'webm', 'aac', 'wma'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE


def allowed_file(filename):
    """Check if file extension is allowed."""
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def transcribe_speech(audio_path, language, recognizer):
    """
    Transcribe speech audio using speech recognition.
    
    Returns:
        tuple: (transcribed_text, error_message)
    """
    text = None
    error_message = None
    
    try:
        with sr.AudioFile(audio_path) as source:
            try:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
            except Exception:
                pass  # Ignore ambient noise adjustment errors
            
            audio_data = recognizer.record(source)
        
        # Try Google Speech Recognition
        try:
            text = recognizer.recognize_google(audio_data, language=language)
            logger.info(f"Transcription successful ({len(text)} chars)")
        except sr.UnknownValueError:
            error_message = "Could not understand the audio. The audio may contain only music, noise, or unclear speech."
            logger.warning(error_message)
        except sr.RequestError as e:
            error_message = f"Recognition service error: {str(e)}"
            logger.error(error_message)
    
    except Exception as e:
        error_message = f"Error transcribing speech: {str(e)}"
        logger.error(error_message)
    
    return text, error_message


@app.route("/api/analyze-file", methods=["POST"])
def analyze_file():
    """Analyze file to determine if conversion is needed."""
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({"error": f"Invalid file type. Supported: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
        filename = secure_filename(audio_file.filename)
        file_ext = Path(filename).suffix.lower()
        is_wav = file_ext == '.wav'
        
        audio_file.seek(0, os.SEEK_END)
        file_size_bytes = audio_file.tell()
        audio_file.seek(0)
        file_size_mb = file_size_bytes / (1024 * 1024)
        
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


@app.route("/api/transcribe-file", methods=["POST"])
def transcribe_file():
    """Upload audio file, convert to WAV if needed, and transcribe."""
    temp_upload_path = None
    temp_wav_path = None
    
    try:
        # Validate file
        if 'audio' not in request.files:
            return jsonify({"success": False, "error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({"success": False, "error": f"Invalid file type. Supported: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
        
        language = request.form.get('language', 'en-US')
        logger.info(f"Processing file: {audio_file.filename}")
        
        # Save uploaded file
        filename = secure_filename(audio_file.filename)
        upload_folder = os.path.normpath(app.config['UPLOAD_FOLDER'])
        temp_upload_path = os.path.normpath(os.path.join(
            upload_folder,
            f"temp_{os.urandom(8).hex()}_{filename}"
        ))
        
        os.makedirs(upload_folder, exist_ok=True)
        audio_file.save(temp_upload_path)
        
        if not os.path.exists(temp_upload_path):
            return jsonify({"success": False, "error": "Failed to save uploaded file"}), 500
        
        # Check if conversion is needed
        file_ext = Path(filename).suffix.lower()
        is_wav = file_ext == '.wav'
        
        if is_wav:
            audio_path = os.path.normpath(temp_upload_path)
        else:
            # Convert to WAV using audio_converter
            logger.info(f"Converting {file_ext} to WAV...")
            try:
                output_dir = os.path.normpath(app.config['UPLOAD_FOLDER'])
                temp_wav_path = convert_to_wav(temp_upload_path, output_dir=output_dir)
                temp_wav_path = os.path.normpath(temp_wav_path)
                audio_path = temp_wav_path
                
                if not os.path.exists(audio_path):
                    raise FileNotFoundError(f"Converted file not found: {audio_path}")
            except ImportError as e:
                cleanup_file(temp_upload_path)
                return jsonify({"success": False, "error": str(e)}), 500
            except (ValueError, RuntimeError, FileNotFoundError) as e:
                cleanup_file(temp_upload_path)
                return jsonify({"success": False, "error": f"Audio conversion failed: {str(e)}"}), 400
        
        # Transcribe
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Normalize path once
        audio_path = os.path.normpath(audio_path)
        
        # Transcribe
        recognizer = sr.Recognizer()
        text, error_message = transcribe_speech(audio_path, language, recognizer)
        
        # Get file size BEFORE any cleanup (file must still exist)
        file_size_mb = 0
        try:
            if os.path.exists(audio_path):
                file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        except Exception as e:
            logger.warning(f"Could not get file size: {str(e)}")
            # Continue without file size metadata
        
        # Cleanup after getting all needed data
        cleanup_file(temp_upload_path)
        if temp_wav_path and temp_wav_path != temp_upload_path and temp_wav_path != audio_path:
            cleanup_file(temp_wav_path)
        
        if text:
            estimated_conversion_time = 0 if is_wav else max(1.0, file_size_mb * 1.0)
            estimated_transcription_time = max(2.0, file_size_mb * 5.0)
            
            return jsonify({
                "success": True,
                "text": text,
                "metadata": {
                    "needsConversion": not is_wav,
                    "fileExtension": file_ext,
                    "fileSizeMB": round(file_size_mb, 2),
                    "estimatedConversionTime": round(estimated_conversion_time, 2),
                    "estimatedTranscriptionTime": round(estimated_transcription_time, 2),
                    "estimatedTotalTime": round(estimated_conversion_time + estimated_transcription_time, 2)
                }
            }), 200
        else:
            error = error_message or "Transcription failed. No speech detected in audio."
            logger.warning(f"Transcription failed: {error}")
            return jsonify({
                "success": False,
                "error": error,
                "message": error
            }), 200
            
    except Exception as e:
        cleanup_file(temp_upload_path)
        cleanup_file(temp_wav_path)
        logger.error(f"Error processing audio: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Error processing audio: {str(e)}"
        }), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "message": "Upload transcription service is running"
    }), 200


if __name__ == "__main__":
    print("=" * 60)
    print("Audio Upload Transcription Service")
    print("=" * 60)
    print(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    print(f"Max file size: {MAX_FILE_SIZE / (1024 * 1024)}MB")
    print(f"Supported formats: {', '.join(ALLOWED_EXTENSIONS)}")
    print("=" * 60)
    print("\nStarting server on http://localhost:5000")
    print("Endpoints:")
    print("  POST /api/transcribe-file - Upload and transcribe audio")
    print("  POST /api/analyze-file - Analyze file metadata")
    print("  GET  /health - Health check")
    print("\nNote: Non-WAV files are automatically converted to WAV before transcription.")
    print("\nPress Ctrl+C to stop")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
