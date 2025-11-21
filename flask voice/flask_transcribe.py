# Fix for Python 3.13 compatibility - aifc was removed
import sys
import os
import importlib.util

if sys.version_info >= (3, 13):
    # Inject aifc compatibility module before speech_recognition tries to import it
    if 'aifc' not in sys.modules:
        compat_path = os.path.join(os.path.dirname(__file__), 'aifc_compat.py')
        if os.path.exists(compat_path):
            spec = importlib.util.spec_from_file_location("aifc", compat_path)
            aifc_module = importlib.util.module_from_spec(spec)
            sys.modules['aifc'] = aifc_module
            spec.loader.exec_module(aifc_module)

from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import io

app = Flask(__name__)
CORS(app)  # <<< enable CORS

@app.route("/transcribe", methods=["POST"])
def transcribe():
    print("Files received:", request.files)
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    audio_file = request.files["audio"]
    print("Filename:", audio_file.filename)
    audio_bytes = io.BytesIO(audio_file.read())
    print("Bytes length:", len(audio_bytes.getvalue()))

    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(audio_bytes) as source:
            audio = recognizer.record(source)
        
        text = recognizer.recognize_google(audio)
        return jsonify({"text": text})
    
    except sr.UnknownValueError:
        return jsonify({"error": "Could not understand audio"}), 400
    except sr.RequestError as e:
        return jsonify({"error": f"Recognition service error: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001)
