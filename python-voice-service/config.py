"""
Configuration module for the voice transcription service.
Contains all configuration settings and constants.
"""

import os
from pathlib import Path

# Base directory
BASE_DIR = Path(__file__).parent

# Flask configuration
FLASK_HOST = os.getenv('FLASK_HOST', '0.0.0.0')
FLASK_PORT = int(os.getenv('FLASK_PORT', 5000))
FLASK_DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

# API configuration
API_PREFIX = '/api'
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
TEMP_FOLDER = os.path.join(BASE_DIR, 'temp')

# Audio processing configuration
SUPPORTED_AUDIO_FORMATS = ['wav', 'mp3', 'flac', 'ogg', 'm4a']
DEFAULT_SAMPLE_RATE = 16000
DEFAULT_CHANNELS = 1  # Mono
DEFAULT_SAMPLE_WIDTH = 2  # 16-bit

# Speech recognition configuration
RECOGNITION_LANGUAGE = os.getenv('RECOGNITION_LANGUAGE', 'ar-EG')
RECOGNITION_TIMEOUT = 10  # seconds
RECOGNITION_PHRASE_TIME_LIMIT = None  # None for no limit
RECOGNITION_ENERGY_THRESHOLD = 4000
RECOGNITION_DYNAMIC_ENERGY_THRESHOLD = True

# Temporary file configuration
TEMP_FILE_PREFIX = 'audio_'
TEMP_FILE_SUFFIX = '.wav'
CLEANUP_TEMP_FILES = True

# Logging configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TEMP_FOLDER, exist_ok=True)