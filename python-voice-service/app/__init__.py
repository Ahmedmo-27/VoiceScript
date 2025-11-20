"""
Flask application factory for the voice transcription service.
Initializes the Flask app with CORS support and registers blueprints.
"""

# Import compatibility fixes first, before any other imports
import app.compat as compat

from flask import Flask
from flask_cors import CORS
import logging
import config

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format=config.LOG_FORMAT
)
logger = logging.getLogger(__name__)


def create_app():
    """
    Create and configure the Flask application.
    
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Enable CORS for all routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Configure Flask settings
    app.config['MAX_CONTENT_LENGTH'] = config.MAX_CONTENT_LENGTH
    app.config['UPLOAD_FOLDER'] = config.UPLOAD_FOLDER
    
    # Register blueprints
    from app.voice_transcriber import bp as transcriber_bp
    app.register_blueprint(transcriber_bp, url_prefix=config.API_PREFIX)
    
    logger.info("Flask application initialized successfully")
    
    return app

