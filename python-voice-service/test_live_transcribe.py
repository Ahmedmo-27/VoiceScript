"""
Live voice transcription script.
Captures audio from microphone and transcribes in real-time.
"""

import sys
from pathlib import Path

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent))

import app.compat  # noqa: F401
import speech_recognition as sr
import logging
import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def live_transcribe(language: str = "en-US", timeout: int = 5, phrase_time_limit: int = 10):
    """
    Perform live transcription from microphone.
    
    Args:
        language: Language code for recognition
        timeout: Seconds to wait for speech before timing out
        phrase_time_limit: Maximum seconds for a phrase
    """
    print(f"\n{'='*60}")
    print(f"LIVE VOICE TRANSCRIPTION")
    print(f"{'='*60}")
    print(f"Language: {language}")
    print(f"Press Ctrl+C to stop")
    print(f"{'='*60}\n")
    
    # Initialize recognizer
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = config.RECOGNITION_ENERGY_THRESHOLD
    recognizer.dynamic_energy_threshold = config.RECOGNITION_DYNAMIC_ENERGY_THRESHOLD
    
    # Use default microphone
    try:
        microphone = sr.Microphone()
        print("Adjusting for ambient noise... Please wait...")
        
        # Adjust for ambient noise
        with microphone as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
        
        print(f"Energy threshold: {recognizer.energy_threshold}")
        print("\nListening... Speak now!\n")
        
        # Continuous listening loop
        while True:
            try:
                with microphone as source:
                    # Listen for audio with timeout
                    print("🎤 Listening... (speak now)")
                    audio = recognizer.listen(
                        source,
                        timeout=timeout,
                        phrase_time_limit=phrase_time_limit
                    )
                
                print("🔄 Processing...")
                
                # Try to recognize speech
                try:
                    # Use Google Speech Recognition
                    text = recognizer.recognize_google(audio, language=language)
                    print(f"\n✓ TRANSCRIBED: {text}\n")
                    
                except sr.UnknownValueError:
                    print("⚠ Could not understand audio. Please try again.\n")
                    
                except sr.RequestError as e:
                    print(f"✗ Error with recognition service: {e}\n")
                    print("Please check your internet connection.\n")
                    
            except sr.WaitTimeoutError:
                print("⏱ No speech detected. Listening again...\n")
                continue
                
            except KeyboardInterrupt:
                print("\n\nStopping transcription...")
                break
                
    except OSError as e:
        print(f"\n✗ ERROR: Microphone not found or not accessible: {e}")
        print("\nPlease check:")
        print("  1. Microphone is connected")
        print("  2. Microphone permissions are granted")
        print("  3. pyaudio is properly installed")
        sys.exit(1)
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Live voice transcription from microphone')
    parser.add_argument(
        '--language',
        type=str,
        default=config.RECOGNITION_LANGUAGE,
        help=f'Language code for recognition (default: {config.RECOGNITION_LANGUAGE})'
    )
    parser.add_argument(
        '--timeout',
        type=int,
        default=5,
        help='Seconds to wait for speech before timing out (default: 5)'
    )
    parser.add_argument(
        '--phrase-time-limit',
        type=int,
        default=10,
        help='Maximum seconds for a phrase (default: 10)'
    )
    
    args = parser.parse_args()
    
    try:
        live_transcribe(
            language=args.language,
            timeout=args.timeout,
            phrase_time_limit=args.phrase_time_limit
        )
    except KeyboardInterrupt:
        print("\n\nTranscription stopped by user.")
        sys.exit(0)

