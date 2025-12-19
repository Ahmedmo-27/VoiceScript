"""
Main entry point for the Flask voice transcription service.
Run this file to start the server.
"""

from app import create_app
import config

# Create app instance for gunicorn
app = create_app()

if __name__ == '__main__':
    app.run(
        host=config.FLASK_HOST,
        port=config.FLASK_PORT,
        debug=config.FLASK_DEBUG
    )

