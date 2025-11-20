"""
Simple test script to test voice transcription functionality.
This script tests the transcription service directly without starting the Flask server.
"""

import os
import sys
from pathlib import Path

# Add the project root to the path
sys.path.insert(0, str(Path(__file__).parent))

from app.voice_transcriber_service import VoiceTranscriberService
from app.audio_utils import AudioProcessor
import config

def test_transcription(audio_file_path: str, language: str = "en-US"):
    """
    Test transcription with an audio file.
    
    Args:
        audio_file_path: Path to the audio file to transcribe
        language: Language code for recognition
    """
    print(f"\n{'='*60}")
    print(f"Testing Voice Transcription")
    print(f"{'='*60}")
    print(f"Audio file: {audio_file_path}")
    print(f"Language: {language}")
    print(f"{'='*60}\n")
    
    # Check if file exists
    if not os.path.exists(audio_file_path):
        print(f"ERROR: Audio file not found: {audio_file_path}")
        return
    
    try:
        # Initialize service
        print("Initializing transcription service...")
        transcriber = VoiceTranscriberService()
        
        # Process audio for transcription
        print("Processing audio file...")
        processed_file = AudioProcessor.process_audio_for_transcription(audio_file_path)
        
        # Transcribe
        print("Transcribing audio...")
        result = transcriber.transcribe_audio_file(processed_file, language=language)
        
        # Display results
        print(f"\n{'='*60}")
        print("TRANSCRIPTION RESULT")
        print(f"{'='*60}")
        
        if result['success']:
            print(f"✓ SUCCESS")
            print(f"Transcribed text: {result['text']}")
            if 'method' in result:
                print(f"Recognition method: {result['method']}")
        else:
            print(f"✗ FAILED")
            print(f"Error: {result.get('error', 'Unknown error')}")
        
        print(f"{'='*60}\n")
        
        # Cleanup
        if config.CLEANUP_TEMP_FILES and processed_file != audio_file_path:
            AudioProcessor.cleanup_temp_file(processed_file)
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Check command line arguments
    if len(sys.argv) < 2:
        print("\nUsage: python test_transcribe.py <audio_file_path> [language]")
        print("\nExample:")
        print("  python test_transcribe.py audio.wav")
        print("  python test_transcribe.py audio.wav en-US")
        print("\nNote: You need an audio file (WAV, MP3, etc.) to test transcription.")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 else config.RECOGNITION_LANGUAGE
    
    test_transcription(audio_file, language)

