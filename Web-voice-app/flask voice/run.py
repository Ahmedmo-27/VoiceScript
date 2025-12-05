"""
Run script to start both Flask transcription services.

This script starts:
1. flask_transcribe.py - Microphone transcription service (port 5003)
2. flask_upload_transcribe.py - File upload transcription service (port 5000)

Press Ctrl+C to stop both services.
"""

import subprocess
import sys
import os
import signal
import time
from pathlib import Path

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()

# Paths to the Flask services
FLASK_TRANSCRIBE = SCRIPT_DIR / "flask_transcribe.py"
FLASK_UPLOAD_TRANSCRIBE = SCRIPT_DIR / "flask_upload_transcribe.py"

# Store process references
processes = []


def signal_handler(sig, frame):
    """Handle Ctrl+C to gracefully stop all services."""
    print("\n\n" + "=" * 60)
    print("Stopping all services...")
    print("=" * 60)
    
    for process in processes:
        if process.poll() is None:  # Process is still running
            print(f"Stopping process {process.pid}...")
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(f"Force killing process {process.pid}...")
                process.kill()
    
    print("All services stopped.")
    sys.exit(0)


def check_file_exists(file_path, service_name):
    """Check if a service file exists."""
    if not file_path.exists():
        print(f"ERROR: {service_name} not found at {file_path}")
        return False
    return True


def start_service(script_path, service_name, port):
    """Start a Flask service in a separate process."""
    print(f"\nStarting {service_name} on port {port}...")
    
    try:
        process = subprocess.Popen(
            [sys.executable, str(script_path)],
            cwd=str(SCRIPT_DIR),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        processes.append(process)
        print(f"✓ {service_name} started (PID: {process.pid})")
        return process
    except Exception as e:
        print(f"ERROR: Failed to start {service_name}: {e}")
        return None


def monitor_processes():
    """Monitor all processes and print their output."""
    import select
    
    print("\n" + "=" * 60)
    print("Services are running. Press Ctrl+C to stop all services.")
    print("=" * 60)
    print("\nService Status:")
    print("  - Microphone Transcription: http://localhost:5003/transcribe")
    print("  - File Upload Transcription: http://localhost:5000/api/transcribe-file")
    print("\n" + "=" * 60 + "\n")
    
    # Simple output monitoring
    while True:
        all_dead = True
        for i, process in enumerate(processes):
            if process.poll() is None:
                all_dead = False
            else:
                # Process died
                print(f"\n⚠ Service {i+1} has stopped unexpectedly (exit code: {process.returncode})")
        
        if all_dead:
            print("\nAll services have stopped.")
            break
        
        time.sleep(1)


def main():
    """Main function to start all services."""
    print("=" * 60)
    print("VoiceScript Flask Services Launcher")
    print("=" * 60)
    
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check if service files exist
    if not check_file_exists(FLASK_TRANSCRIBE, "flask_transcribe.py"):
        sys.exit(1)
    
    if not check_file_exists(FLASK_UPLOAD_TRANSCRIBE, "flask_upload_transcribe.py"):
        sys.exit(1)
    
    # Start services
    print("\n" + "=" * 60)
    print("Starting Flask Services...")
    print("=" * 60)
    
    # Start microphone transcription service (port 5003)
    mic_process = start_service(FLASK_TRANSCRIBE, "Microphone Transcription Service", 5003)
    if not mic_process:
        print("Failed to start microphone service. Exiting.")
        sys.exit(1)
    
    # Small delay to avoid port conflicts
    time.sleep(1)
    
    # Start file upload transcription service (port 5000)
    upload_process = start_service(FLASK_UPLOAD_TRANSCRIBE, "File Upload Transcription Service", 5000)
    if not upload_process:
        print("Failed to start upload service. Stopping microphone service...")
        mic_process.terminate()
        sys.exit(1)
    
    # Monitor processes
    try:
        monitor_processes()
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()

