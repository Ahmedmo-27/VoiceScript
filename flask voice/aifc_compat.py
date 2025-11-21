"""
Compatibility shim for aifc module removed in Python 3.13
This provides minimal compatibility for speech_recognition library
"""
import wave
import struct

class Error(Exception):
    pass

def open(f, mode=None):
    """Minimal aifc.open compatibility"""
    if mode is None or mode == 'r':
        return wave.open(f, 'rb')
    elif mode == 'w':
        return wave.open(f, 'wb')
    else:
        raise ValueError(f"mode must be 'r' or 'w', not {mode}")

# Create minimal compatibility classes
class Aifc_read:
    def __init__(self, *args, **kwargs):
        pass
    
class Aifc_write:
    def __init__(self, *args, **kwargs):
        pass

