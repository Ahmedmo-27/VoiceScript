"""
Compatibility module for Python 3.12+ and 3.13+.
Provides shims for modules that were removed in newer Python versions.
"""

import sys
import logging
import types

logger = logging.getLogger(__name__)

# Fix for distutils module (removed in Python 3.12+)
# This needs to be checked separately as it was removed earlier than aifc/audioop
if sys.version_info >= (3, 12):
    try:
        import distutils  # type: ignore[import-untyped]
    except ModuleNotFoundError:
        # Try to use setuptools which provides distutils
        try:
            import setuptools
            # setuptools provides distutils, so we should be able to import it now
            import distutils  # type: ignore[import-untyped]
            logger.info("Using setuptools-provided distutils")
        except (ImportError, ModuleNotFoundError):
            # Create a minimal distutils.version.LooseVersion shim
            class LooseVersion:
                """Minimal LooseVersion class for compatibility."""
                def __init__(self, vstring):
                    self.vstring = str(vstring)
                    self.version = self._parse(self.vstring)
                
                def _parse(self, vstring):
                    """Parse version string into components."""
                    import re
                    component_re = re.compile(r'(\d+ | [a-z]+ | \.)', re.VERBOSE | re.IGNORECASE)
                    components = [x for x in component_re.split(vstring) if x and x != '.']
                    for i, obj in enumerate(components):
                        try:
                            components[i] = int(obj)
                        except ValueError:
                            pass
                    return components
                
                def __str__(self):
                    return self.vstring
                
                def __repr__(self):
                    return f"LooseVersion('{self.vstring}')"
                
                def __lt__(self, other):
                    if isinstance(other, str):
                        other = LooseVersion(other)
                    return self.version < other.version
                
                def __le__(self, other):
                    return self < other or self == other
                
                def __eq__(self, other):
                    if isinstance(other, str):
                        other = LooseVersion(other)
                    return self.version == other.version
                
                def __ge__(self, other):
                    return not (self < other)
                
                def __gt__(self, other):
                    return not (self <= other)
            
            # Create distutils module structure
            distutils_module = types.ModuleType('distutils')
            distutils_version_module = types.ModuleType('distutils.version')
            distutils_version_module.LooseVersion = LooseVersion
            distutils_module.version = distutils_version_module
            
            # Add to sys.modules
            sys.modules['distutils'] = distutils_module
            sys.modules['distutils.version'] = distutils_version_module
            
            logger.info("Created distutils compatibility shim for Python 3.12+")

# Fix for Python 3.13+ where aifc and audioop modules were removed
if sys.version_info >= (3, 13):
    # Fix for aifc module
    try:
        import aifc  # type: ignore[import-untyped]
    except ModuleNotFoundError:
        # Create a minimal aifc module shim for speech_recognition compatibility
        class AifcError(Exception):
            """Base exception for aifc module."""
            pass
        
        class Aifc_read:
            """Minimal aifc_read class stub."""
            def __init__(self, *args, **kwargs):
                raise NotImplementedError("aifc module is not available in Python 3.13+")
        
        class Aifc_write:
            """Minimal aifc_write class stub."""
            def __init__(self, *args, **kwargs):
                raise NotImplementedError("aifc module is not available in Python 3.13+")
        
        def aifc_open(*args, **kwargs):
            """Minimal open function stub."""
            raise NotImplementedError("aifc module is not available in Python 3.13+")
        
        # Create the module
        aifc_module = types.ModuleType('aifc')
        aifc_module.Error = AifcError
        aifc_module.Aifc_read = Aifc_read
        aifc_module.Aifc_write = Aifc_write
        aifc_module.open = aifc_open
        
        # Add the module to sys.modules so speech_recognition can import it
        sys.modules['aifc'] = aifc_module
        
        logger.info("Created aifc compatibility shim for Python 3.13+")
    
    # Fix for audioop module
    # Note: audioop-lts should be installed via requirements.txt for Python 3.13+
    # This shim is only a fallback if the package isn't installed
    try:
        import audioop
    except ModuleNotFoundError:
        logger.warning(
            "audioop module not found. For Python 3.13+, please install audioop-lts: "
            "pip install audioop-lts"
        )
        # Try to import from audioop-lts if available
        try:
            import audioop_lts as audioop  # type: ignore[import-untyped]
            sys.modules['audioop'] = audioop
            logger.info("Using audioop-lts backport for Python 3.13+")
        except ImportError:
            # Create a minimal audioop module shim as last resort
            # This will likely cause errors when speech_recognition tries to use it
            class AudioopError(Exception):
                """Base exception for audioop module."""
                pass
            
            def audioop_stub(*args, **kwargs):
                """Stub function for audioop operations."""
                raise NotImplementedError(
                    "audioop module is not available. "
                    "Please install audioop-lts: pip install audioop-lts"
                )
            
            # Create the module with common audioop functions
            audioop_module = types.ModuleType('audioop')
            audioop_module.error = AudioopError
            
            # Add common audioop functions as stubs
            for func_name in ['add', 'adpcm2lin', 'alaw2lin', 'avg', 'avgpp', 'bias',
                             'byteswap', 'cross', 'findfactor', 'findfit', 'findmax',
                             'lin2adpcm', 'lin2alaw', 'lin2lin', 'lin2ulaw', 'max',
                             'maxpp', 'minmax', 'mul', 'ratecv', 'reverse', 'rms',
                             'tomono', 'tostereo', 'ulaw2lin']:
                setattr(audioop_module, func_name, audioop_stub)
            
            # Add the module to sys.modules
            sys.modules['audioop'] = audioop_module
            
            logger.error(
                "Created audioop compatibility shim, but functionality will be limited. "
                "Please install audioop-lts for full functionality: pip install audioop-lts"
            )

