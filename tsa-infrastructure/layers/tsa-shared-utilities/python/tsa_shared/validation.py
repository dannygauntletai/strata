"""
Validation Utilities - Security-first input validation for TSA services

Provides consistent validation patterns across all backend services
"""
import re
from typing import Dict, Any, List, Union


def validate_email(email: str) -> bool:
    """
    Enhanced email validation with security checks
    
    Args:
        email: Email address to validate
        
    Returns:
        True if email is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    # Normalize email
    email = email.strip().lower()
    
    # Basic format check (RFC 5322 compliant)
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False
    
    # Length check (RFC 5321 limit)
    if len(email) > 254:
        return False
    
    # Local part (before @) should not exceed 64 characters
    local_part = email.split('@')[0]
    if len(local_part) > 64:
        return False
    
    # Additional security checks
    suspicious_patterns = [
        r'\.{2,}',          # Multiple consecutive dots
        r'^\.|\.$',         # Starts or ends with dot
        r'@.*@',           # Multiple @ symbols
        r'[<>"\']',        # Potentially dangerous characters
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, email):
            return False
    
    return True


def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
    """
    Validate that required fields are present and not empty
    
    Args:
        data: Data dictionary to validate
        required_fields: List of required field names (supports nested with dots)
        
    Returns:
        Dict with validation result
    """
    missing_fields = []
    empty_fields = []
    
    for field in required_fields:
        # Handle nested field validation (e.g., "user.email")
        if '.' in field:
            keys = field.split('.')
            current_data = data
            field_missing = False
            
            try:
                for key in keys:
                    if not isinstance(current_data, dict) or key not in current_data:
                        missing_fields.append(field)
                        field_missing = True
                        break
                    current_data = current_data[key]
                
                # Check if field is empty (only if not missing)
                if not field_missing and (current_data is None or current_data == ''):
                    empty_fields.append(field)
                    
            except (TypeError, KeyError):
                missing_fields.append(field)
        else:
            # Simple field validation
            if field not in data:
                missing_fields.append(field)
            elif data[field] is None or data[field] == '':
                empty_fields.append(field)
    
    # Combine missing and empty fields
    invalid_fields = missing_fields + empty_fields
    
    if invalid_fields:
        return {
            'valid': False,
            'missing_fields': missing_fields,
            'empty_fields': empty_fields,
            'error': f"Required fields missing or empty: {', '.join(invalid_fields)}"
        }
    
    return {'valid': True}


def sanitize_string(value: str, max_length: int = 255, allow_html: bool = False) -> str:
    """
    Sanitize string input for safe storage and display
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        allow_html: Whether to allow HTML tags
        
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        value = str(value)
    
    # Basic cleanup
    value = value.strip()
    
    # Remove dangerous characters if HTML not allowed
    if not allow_html:
        # Remove HTML tags
        value = re.sub(r'<[^>]+>', '', value)
        
        # Remove potentially dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '&', '`']
        for char in dangerous_chars:
            value = value.replace(char, '')
    
    # Truncate if too long
    if len(value) > max_length:
        value = value[:max_length]
    
    return value


def validate_input_security(data: Any) -> Dict[str, Any]:
    """
    Enhanced input validation with security checks
    Detects XSS, SQL injection, and other attack patterns
    
    Args:
        data: Data to validate (can be dict, list, or string)
        
    Returns:
        Dict with validation result
    """
    
    # XSS patterns to detect
    xss_patterns = [
        r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>',
        r'javascript:',
        r'vbscript:',
        r'on\w+\s*=',
        r'<iframe\b',
        r'<object\b',
        r'<embed\b',
        r'<link\b',
        r'<meta\b',
        r'<style\b'
    ]
    
    # SQL injection patterns to detect
    sql_patterns = [
        r'\b(union|select|insert|delete|update|drop|exec|execute)\b.*\b(from|where|into)\b',
        r'[;\'"]\s*--',
        r'\bor\s+\d+\s*=\s*\d+',
        r'\band\s+\d+\s*=\s*\d+',
        r'\bunion\s+select',
        r'1\s*=\s*1',
        r'1\s*or\s*1'
    ]
    
    # Command injection patterns
    command_patterns = [
        r'[;&|`]',
        r'\$\(',
        r'`.*`',
        r'\|\s*\w+',
        r'&&\s*\w+',
        r';\s*\w+'
    ]
    
    def check_string_value(value: str) -> Dict[str, Any]:
        """Check a single string value for security issues"""
        if not isinstance(value, str):
            return {'valid': True}
        
        value_lower = value.lower()
        
        # Check for XSS
        for pattern in xss_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return {
                    'valid': False,
                    'error': 'Potentially malicious script content detected',
                    'pattern_type': 'xss'
                }
        
        # Check for SQL injection
        for pattern in sql_patterns:
            if re.search(pattern, value_lower, re.IGNORECASE):
                return {
                    'valid': False,
                    'error': 'Potentially malicious SQL content detected',
                    'pattern_type': 'sql_injection'
                }
        
        # Check for command injection
        for pattern in command_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                return {
                    'valid': False,
                    'error': 'Potentially malicious command content detected',
                    'pattern_type': 'command_injection'
                }
        
        return {'valid': True}
    
    def validate_recursive(obj, path=""):
        """Recursively validate all string values"""
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                result = validate_recursive(value, current_path)
                if not result['valid']:
                    result['field_path'] = current_path
                    return result
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                current_path = f"{path}[{i}]" if path else f"[{i}]"
                result = validate_recursive(item, current_path)
                if not result['valid']:
                    result['field_path'] = current_path
                    return result
        elif isinstance(obj, str):
            return check_string_value(obj)
        
        return {'valid': True}
    
    return validate_recursive(data)


def validate_phone_number(phone: str, country_code: str = "US") -> bool:
    """
    Validate phone number format
    
    Args:
        phone: Phone number string
        country_code: Country code for validation rules
        
    Returns:
        True if valid phone number
    """
    if not phone or not isinstance(phone, str):
        return False
    
    # Remove common formatting characters
    cleaned_phone = re.sub(r'[^\d+]', '', phone)
    
    if country_code == "US":
        # US phone number validation
        # Accept formats: +1XXXXXXXXXX, 1XXXXXXXXXX, XXXXXXXXXX
        us_patterns = [
            r'^\+1\d{10}$',    # +1XXXXXXXXXX
            r'^1\d{10}$',      # 1XXXXXXXXXX
            r'^\d{10}$'        # XXXXXXXXXX
        ]
        
        return any(re.match(pattern, cleaned_phone) for pattern in us_patterns)
    
    # Basic international format validation
    return re.match(r'^\+?\d{7,15}$', cleaned_phone) is not None


def validate_date_format(date_string: str, format_type: str = "iso") -> bool:
    """
    Validate date string format
    
    Args:
        date_string: Date string to validate
        format_type: Expected format type ('iso', 'us', 'international')
        
    Returns:
        True if valid date format
    """
    if not date_string or not isinstance(date_string, str):
        return False
    
    date_patterns = {
        'iso': r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$',
        'us': r'^\d{2}/\d{2}/\d{4}$',
        'international': r'^\d{2}-\d{2}-\d{4}$',
        'simple': r'^\d{4}-\d{2}-\d{2}$'
    }
    
    pattern = date_patterns.get(format_type)
    if not pattern:
        return False
    
    return re.match(pattern, date_string) is not None


def validate_id_format(id_value: str, id_type: str = "uuid") -> bool:
    """
    Validate ID format
    
    Args:
        id_value: ID string to validate
        id_type: Type of ID ('uuid', 'tsa_id', 'custom')
        
    Returns:
        True if valid ID format
    """
    if not id_value or not isinstance(id_value, str):
        return False
    
    if id_type == "uuid":
        # UUID v4 format
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        return re.match(uuid_pattern, id_value.lower()) is not None
    
    elif id_type == "tsa_id":
        # TSA custom ID format: TSA-PREFIX-YYYYMMDD-XXXX
        tsa_pattern = r'^TSA-[A-Z]+-\d{8}-[A-Z0-9]{4}$'
        return re.match(tsa_pattern, id_value.upper()) is not None
    
    elif id_type == "custom":
        # Basic alphanumeric with hyphens
        custom_pattern = r'^[a-zA-Z0-9\-_]{8,32}$'
        return re.match(custom_pattern, id_value) is not None
    
    return False 