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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        logger.info("Transcribe request received")
        logger.info(f"Request method: {request.method}")
        logger.info(f"Content-Type: {request.content_type}")
        logger.info(f"Files received: {list(request.files.keys())}")
        
        # Check if request has files
        if not request.files:
            logger.error("No files in request")
            return jsonify({"error": "No files provided in request"}), 400
        
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
            
            # Transcribe audio
            logger.info("Starting transcription...")
            text = recognizer.recognize_google(audio, language="en-US")
            logger.info(f"Transcription successful: {text[:50]}...")
            
            return jsonify({"text": text})
        
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
    return jsonify({"status": "healthy", "message": "Transcription service is running"}), 200

if __name__ == "__main__":
    print("=" * 60)
    print("Flask Transcription Service (Microphone)")
    print("=" * 60)
    print("Starting server on http://localhost:5003")
    print("Endpoints:")
    print("  POST /transcribe - Transcribe audio file from microphone")
    print("  GET  /health - Health check")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5003, debug=True)
