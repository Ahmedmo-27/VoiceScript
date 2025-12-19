# Fix for Python 3.13 compatibility - aifc was removed
# MUST be before any other imports that might trigger speech_recognition import
import sys
import types

# Create aifc stub immediately for Python 3.13+
if sys.version_info >= (3, 13):
    if 'aifc' not in sys.modules:
        # Create minimal aifc stub
        aifc_stub = types.ModuleType('aifc')
        aifc_stub.Error = Exception
        # Add open function stub
        def aifc_open(*args, **kwargs):
            raise NotImplementedError("aifc.open() not available in Python 3.13+")
        aifc_stub.open = aifc_open
        sys.modules['aifc'] = aifc_stub

from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import io
import logging
from langdetect import detect, LangDetectException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS

# Supported languages for Google Speech Recognition
# Format: language code (e.g., 'en-US', 'es-ES', 'fr-FR')
# See: https://cloud.google.com/speech-to-text/docs/languages
SUPPORTED_LANGUAGES = {
    'auto': 'Auto Detect',
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

# Languages to try for auto-detection (in order of priority)
AUTO_DETECT_LANGUAGES = [ 'en-US','ar-EG','ar-SA','fr-FR',  'en-GB',  'es-ES', 'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'ja-JP', 'ko-KR', 'zh-CN', 'nl-NL', 'tr-TR', 'hi-IN', 'sv-SE', 'pl-PL']

# Mapping from langdetect codes to Google language codes
LANG_DETECT_MAP = {
    'en': ['en-US', 'en-GB'],
    'es': ['es-ES', 'es-MX'],
    'fr': ['fr-FR'],
    'de': ['de-DE'],
    'it': ['it-IT'],
    'pt': ['pt-BR', 'pt-PT'],
    'ru': ['ru-RU'],
    'ja': ['ja-JP'],
    'ko': ['ko-KR'],
    'zh': ['zh-CN', 'zh-TW'],
    'ar': ['ar-SA', 'ar-EG'],
    'hi': ['hi-IN'],
    'nl': ['nl-NL'],
    'pl': ['pl-PL'],
    'tr': ['tr-TR'],
    'sv': ['sv-SE'],
    'da': ['da-DK'],
    'no': ['no-NO'],
    'fi': ['fi-FI'],
    'cs': ['cs-CZ'],
    'hu': ['hu-HU'],
    'ro': ['ro-RO'],
    'th': ['th-TH'],
    'vi': ['vi-VN'],
    'id': ['id-ID'],
    'ms': ['ms-MY'],
    'he': ['he-IL'],
    'uk': ['uk-UA'],
    'el': ['el-GR'],
}

def validate_language(language_code):
    """Validate if language code is supported."""
    # Handle None, empty string, or whitespace-only strings
    if not language_code or (isinstance(language_code, str) and not language_code.strip()):
        return 'en-US', None
    # Strip whitespace and normalize
    language_code = language_code.strip() if isinstance(language_code, str) else language_code
    if language_code in SUPPORTED_LANGUAGES:
        return language_code, None
    return None, f"Unsupported language code: {language_code}. Supported languages: {', '.join(SUPPORTED_LANGUAGES.keys())}"

@app.route("/languages", methods=["GET"])
def get_languages():
    """Get list of supported languages."""
    return jsonify({
        "languages": SUPPORTED_LANGUAGES,
        "default": "en-US"
    }), 200

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        logger.info("Transcribe request received")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Files received: {list(request.files.keys())}")
        logger.info(f"Form data keys: {list(request.form.keys())}")
        
        # Get language parameter from form data or JSON
        # For multipart/form-data (file uploads), use request.form
        # For JSON requests, use request.json
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
            logger.error(f"Request content type: {request.content_type}")
            logger.error(f"Request form keys: {list(request.form.keys())}")
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
            
            if language == "auto":
                # Auto-detect language by trying common languages
                text = None
                detected_lang = None
                for lang in AUTO_DETECT_LANGUAGES:
                    try:
                        logger.info(f"Trying language: {lang}")
                        candidate_text = recognizer.recognize_google(audio, language=lang)
                        # Verify the detected language matches
                        try:
                            detected_lang_code = detect(candidate_text)
                            if detected_lang_code in LANG_DETECT_MAP and lang in LANG_DETECT_MAP[detected_lang_code]:
                                text = candidate_text
                                detected_lang = lang
                                logger.info(f"Auto-detected language: {lang} - {text[:50]}...")
                                break
                            else:
                                logger.debug(f"Language mismatch: transcribed in {lang} but detected as {detected_lang_code}")
                                continue
                        except LangDetectException:
                            logger.debug(f"Could not detect language for text from {lang}")
                            continue
                    except sr.UnknownValueError:
                        logger.debug(f"No speech detected for {lang}")
                        continue
                    except sr.RequestError as e:
                        logger.warning(f"Request error with {lang}: {e}")
                        continue
                
                if not text:
                    raise sr.UnknownValueError("Could not understand audio in any supported language")
                
                language = detected_lang
            else:
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
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Transcription service is running",
        "supported_languages_count": len(SUPPORTED_LANGUAGES),
        "default_language": "en-US"
    }), 200

if __name__ == "__main__":
    print("=" * 60)
    print("Flask Transcription Service (Microphone)")
    print("=" * 60)
    print("Starting server on http://localhost:5003")
    print("Endpoints:")
    print("  POST /transcribe - Transcribe audio file from microphone")
    print("  GET  /languages - Get supported languages")
    print("  GET  /health - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5003, debug=True)
