"""
Compatibility module for aifc (removed in Python 3.13).
This is a minimal stub to allow speech_recognition to work with Python 3.13+.
"""

import sys
import struct
import wave

# Minimal aifc compatibility for speech_recognition
class Error(Exception):
    """Base exception for aifc module"""
    pass

def open(file, mode=None):
    """
    Compatibility function for aifc.open()
    Since speech_recognition doesn't actually use aifc for WAV files,
    we can return a wave.open() object which should work for most cases.
    """
    if mode is None:
        mode = 'rb'
    
    # If it's a file-like object (BytesIO), try to use wave module
    if hasattr(file, 'read'):
        # For BytesIO objects, wave.open should work
        return wave.open(file, mode)
    else:
        # For file paths, try wave.open
        return wave.open(file, mode)

# Export minimal interface that speech_recognition might need
__all__ = ['open', 'Error']
