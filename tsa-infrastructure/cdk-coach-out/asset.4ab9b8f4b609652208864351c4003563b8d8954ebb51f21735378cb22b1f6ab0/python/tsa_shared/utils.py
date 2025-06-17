"""
TSA Utilities Module
General utility functions for ID generation, hashing, and configuration
"""
import uuid
import hashlib
import os
from typing import Optional


def generate_id(prefix: str = "", length: int = 8) -> str:
    """Generate a unique ID with optional prefix"""
    unique_part = str(uuid.uuid4()).replace('-', '')[:length]
    if prefix:
        return f"{prefix}_{unique_part}"
    return unique_part


def hash_string(input_string: str, algorithm: str = 'sha256') -> str:
    """Hash a string using the specified algorithm"""
    if algorithm == 'sha256':
        return hashlib.sha256(input_string.encode()).hexdigest()
    elif algorithm == 'md5':
        return hashlib.md5(input_string.encode()).hexdigest()
    else:
        raise ValueError(f"Unsupported hash algorithm: {algorithm}")


def get_frontend_url(role: Optional[str] = None) -> str:
    """Get the appropriate frontend URL based on environment and role"""
    stage = os.environ.get('STAGE', 'dev')
    
    # Role-specific URL routing
    if role == 'admin':
        if stage == 'prod':
            return os.environ.get('ADMIN_FRONTEND_URL', 'https://admin.sportsacademy.tech')
        else:
            return os.environ.get('ADMIN_FRONTEND_URL', 'http://localhost:3001')
    
    # Default unified frontend for coach/parent
    if stage == 'prod':
        return os.environ.get('FRONTEND_URL', 'https://app.sportsacademy.tech')
    else:
        return os.environ.get('FRONTEND_URL', 'http://localhost:3000') 