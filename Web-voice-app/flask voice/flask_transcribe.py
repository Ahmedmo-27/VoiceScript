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
    app.run(port=5000)
