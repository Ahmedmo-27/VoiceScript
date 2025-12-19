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
import io
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
# Enable CORS with explicit configuration for all origins
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configuration
UPLOAD_FOLDER = os.path.normpath('uploads')
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'mp4', 'm4a', 'flac', 'ogg', 'webm', 'aac', 'wma'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Supported languages for Google Speech Recognition
# Format: language code (e.g., 'en-US', 'es-ES', 'fr-FR')
# See: https://cloud.google.com/speech-to-text/docs/languages
SUPPORTED_LANGUAGES = {
    'en-US': 'English (United States)',
    'en-GB': 'English (United Kingdom)',
    'es-ES': 'Spanish (Spain)',
    'es-MX': 'Spanish (Mexico)',
    'fr-FR': 'French (France)',
    'de-DE': 'German (Germany)',
    'it-IT': 'Italian (Italy)',
    'pt-BR': 'Portuguese (Brazil)',
    'pt-PT': 'Portuguese (Portugal)',
    'ru-RU': 'Russian (Russia)',
    'ja-JP': 'Japanese (Japan)',
    'ko-KR': 'Korean (Korea)',
    'zh-CN': 'Chinese (Simplified, China)',
    'zh-TW': 'Chinese (Traditional, Taiwan)',
    'ar-SA': 'Arabic (Saudi Arabia)',
    'ar-EG': 'Arabic (Egypt)',
    'hi-IN': 'Hindi (India)',
    'nl-NL': 'Dutch (Netherlands)',
    'pl-PL': 'Polish (Poland)',
    'tr-TR': 'Turkish (Turkey)',
    'sv-SE': 'Swedish (Sweden)',
    'da-DK': 'Danish (Denmark)',
    'no-NO': 'Norwegian (Norway)',
    'fi-FI': 'Finnish (Finland)',
    'cs-CZ': 'Czech (Czech Republic)',
    'hu-HU': 'Hungarian (Hungary)',
    'ro-RO': 'Romanian (Romania)',
    'th-TH': 'Thai (Thailand)',
    'vi-VN': 'Vietnamese (Vietnam)',
    'id-ID': 'Indonesian (Indonesia)',
    'ms-MY': 'Malay (Malaysia)',
    'he-IL': 'Hebrew (Israel)',
    'uk-UA': 'Ukrainian (Ukraine)',
    'el-GR': 'Greek (Greece)',
}

def validate_language(language_code):
    """Validate if language code is supported."""
    if not language_code:
        return 'en-US', None
    if language_code in SUPPORTED_LANGUAGES:
        return language_code, None
    return None, f"Unsupported language code: {language_code}. Supported languages: {', '.join(SUPPORTED_LANGUAGES.keys())}"


def allowed_file(filename):
    """Check if file extension is allowed."""
    if not filename or '.' not in filename:
        return False
    return filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/languages", methods=["GET"])
def get_languages():
    """Get list of supported languages."""
    return jsonify({
        "languages": SUPPORTED_LANGUAGES,
        "default": "en-US"
    }), 200


def transcribe_speech(audio_path, language, recognizer):
    """
    Transcribe speech audio using speech recognition.
    
    Returns:
        tuple: (transcribed_text, error_message)
    """
    text = None
    error_message = None
    
    try:
        # Check file size and warn if very large
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        if file_size_mb > 10:
            logger.warning(f"Large file detected: {file_size_mb:.2f} MB. This may take longer to process.")
        
        logger.info(f"Opening audio file: {audio_path} ({file_size_mb:.2f} MB)")
        with sr.AudioFile(audio_path) as source:
            # Get audio duration for logging
            try:
                duration = source.DURATION if hasattr(source, 'DURATION') else None
                if duration:
                    logger.info(f"Audio duration: {duration:.2f} seconds")
            except:
                pass
            
            try:
                recognizer.adjust_for_ambient_noise(source, duration=0.5)
                logger.info("Adjusted for ambient noise")
            except Exception as e:
                logger.warning(f"Could not adjust for ambient noise: {str(e)}")
                # Continue anyway
            
            logger.info("Recording audio data...")
            audio_data = recognizer.record(source)
            logger.info(f"Audio data recorded: {len(audio_data.frame_data)} bytes")
        
        # Try Google Speech Recognition
        logger.info(f"Starting Google Speech Recognition with language: {language}...")
        try:
            text = recognizer.recognize_google(audio_data, language=language)
            logger.info(f"Transcription successful ({len(text)} chars)")
        except sr.UnknownValueError:
            error_message = "Could not understand the audio. The audio may contain only music, noise, or unclear speech."
            logger.warning(error_message)
        except sr.RequestError as e:
            error_message = f"Recognition service error: {str(e)}"
            logger.error(error_message)
            # Check if it's a timeout or size-related error
            if "timeout" in str(e).lower() or "too large" in str(e).lower():
                error_message += " The audio file may be too long. Try splitting it into smaller segments."
    
    except MemoryError as e:
        error_message = f"Out of memory while processing audio. The file may be too large. Error: {str(e)}"
        logger.error(error_message)
    except Exception as e:
        error_message = f"Error transcribing speech: {str(e)}"
        logger.error(error_message)
        import traceback
        logger.error(traceback.format_exc())
    
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
        
        # Get and validate language parameter
        language = request.form.get('language', 'en-US')
        language, language_error = validate_language(language)
        
        if language_error:
            logger.warning(f"Language validation error: {language_error}")
            return jsonify({"success": False, "error": language_error}), 400
        
        logger.info(f"Processing file: {audio_file.filename} with language: {language} ({SUPPORTED_LANGUAGES.get(language, 'Unknown')})")
        
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
            file_size_mb = os.path.getsize(temp_upload_path) / (1024 * 1024)
            logger.info(f"Converting {file_ext} to WAV... (File size: {file_size_mb:.2f} MB)")
            try:
                output_dir = os.path.normpath(app.config['UPLOAD_FOLDER'])
                temp_wav_path = convert_to_wav(temp_upload_path, output_dir=output_dir)
                temp_wav_path = os.path.normpath(temp_wav_path)
                audio_path = temp_wav_path
                
                if not os.path.exists(audio_path):
                    raise FileNotFoundError(f"Converted file not found: {audio_path}")
                logger.info(f"Conversion successful. Converted file size: {os.path.getsize(audio_path) / (1024 * 1024):.2f} MB")
            except ImportError as e:
                logger.error(f"Import error during conversion: {str(e)}")
                cleanup_file(temp_upload_path)
                return jsonify({"success": False, "error": f"Audio conversion failed: {str(e)}. Please ensure pydub and ffmpeg are installed."}), 500
            except (ValueError, RuntimeError, FileNotFoundError) as e:
                logger.error(f"Conversion error: {str(e)}")
                cleanup_file(temp_upload_path)
                return jsonify({"success": False, "error": f"Audio conversion failed: {str(e)}"}), 400
            except Exception as e:
                logger.error(f"Unexpected conversion error: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                cleanup_file(temp_upload_path)
                return jsonify({"success": False, "error": f"Audio conversion failed: {str(e)}"}), 500
        
        # Transcribe
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        # Normalize path once
        audio_path = os.path.normpath(audio_path)
        
        # Transcribe
        logger.info(f"Starting transcription... (Audio file: {audio_path})")
        recognizer = sr.Recognizer()
        try:
            text, error_message = transcribe_speech(audio_path, language, recognizer)
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            cleanup_file(temp_upload_path)
            if temp_wav_path and temp_wav_path != temp_upload_path:
                cleanup_file(temp_wav_path)
            return jsonify({
                "success": False,
                "error": f"Transcription failed: {str(e)}"
            }), 500
        
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
                "language": language,
                "language_name": SUPPORTED_LANGUAGES.get(language, "Unknown"),
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
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": f"Error processing audio: {str(e)}",
            "type": type(e).__name__
        }), 500


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """Transcribe audio file from microphone (direct WAV format)."""
    try:
        logger.info("Transcribe request received")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Files received: {list(request.files.keys())}")
        logger.info(f"Form data keys: {list(request.form.keys())}")
        
        # Get language parameter from form data or JSON
        language = None
        if request.is_json:
            language = request.json.get('language')
        else:
            # For multipart/form-data requests
            language = request.form.get('language')
        
        logger.info(f"Received language parameter: {language}")
        language, language_error = validate_language(language)
        
        if language_error:
            logger.warning(f"Language validation error: {language_error}")
            return jsonify({"error": language_error}), 400
        
        logger.info(f"Using language: {language} ({SUPPORTED_LANGUAGES.get(language, 'Unknown')})")
        
        # Check if request has files
        if not request.files:
            logger.error("No files in request")
            return jsonify({
                "error": "No files provided in request",
                "content_type": request.content_type,
                "form_keys": list(request.form.keys())
            }), 400
        
        # Check if audio file is present
        if "audio" not in request.files:
            logger.error(f"Audio file not found. Available keys: {list(request.files.keys())}")
            return jsonify({
                "error": "No audio file provided",
                "available_keys": list(request.files.keys())
            }), 400
        
        audio_file = request.files["audio"]
        
        # Check if file is empty
        if audio_file.filename == '':
            logger.error("Empty filename")
            return jsonify({"error": "No file selected"}), 400
        
        logger.info(f"Processing file: {audio_file.filename}")
        logger.info(f"Content type: {audio_file.content_type}")
        
        # Read audio file
        audio_data = audio_file.read()
        
        if len(audio_data) == 0:
            logger.error("Audio file is empty")
            return jsonify({"error": "Audio file is empty"}), 400
        
        logger.info(f"Audio file size: {len(audio_data)} bytes")
        
        # Create BytesIO object
        audio_bytes = io.BytesIO(audio_data)
        
        # Reset file pointer to beginning
        audio_bytes.seek(0)
        
        recognizer = sr.Recognizer()
        
        try:
            # Try to open as AudioFile
            with sr.AudioFile(audio_bytes) as source:
                logger.info("Audio file opened successfully")
                
                # Adjust for ambient noise
                try:
                    recognizer.adjust_for_ambient_noise(source, duration=0.5)
                    logger.info("Adjusted for ambient noise")
                except Exception as e:
                    logger.warning(f"Could not adjust for ambient noise: {str(e)}")
                
                # Read audio data
                audio = recognizer.record(source)
                logger.info(f"Audio recorded: {len(audio.frame_data)} bytes")
            
            # Transcribe audio with specified language
            logger.info(f"Starting transcription with language: {language}...")
            text = recognizer.recognize_google(audio, language=language)
            logger.info(f"Transcription successful: {text[:50]}...")
            
            return jsonify({
                "text": text,
                "language": language,
                "language_name": SUPPORTED_LANGUAGES.get(language, "Unknown")
            })
        
        except sr.UnknownValueError:
            logger.error("Could not understand audio")
            return jsonify({"error": "Could not understand audio. Please ensure the audio contains clear speech."}), 400
        
        except sr.RequestError as e:
            logger.error(f"Recognition service error: {str(e)}")
            return jsonify({
                "error": f"Recognition service error: {str(e)}",
                "message": "Please check your internet connection and try again."
            }), 500
        
        except ValueError as e:
            logger.error(f"Audio format error: {str(e)}")
            return jsonify({
                "error": f"Invalid audio format: {str(e)}",
                "message": "Please ensure the audio file is in WAV format."
            }), 400
        
        except Exception as e:
            logger.error(f"Unexpected error during transcription: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return jsonify({
                "error": f"Error processing audio: {str(e)}",
                "type": type(e).__name__
            }), 500
    
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "error": f"Server error: {str(e)}",
            "type": type(e).__name__
        }), 500


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "message": "Upload transcription service is running",
        "supported_languages_count": len(SUPPORTED_LANGUAGES),
        "default_language": "en-US"
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
    print("  GET  /api/languages - Get supported languages")
    print("  GET  /health - Health check")
    print("\nNote: Non-WAV files are automatically converted to WAV before transcription.")
    print("\nPress Ctrl+C to stop")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
