"""
Password Value Object with validation.
Encapsulates password validation and requirements in the domain layer.
"""
import re
from dataclasses import dataclass
from domain.exceptions import InvalidPasswordException


@dataclass(frozen=True)
class Password:
    """
    Value object representing a valid password.
    Validates password requirements on creation.
    
    Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    value: str
    
    # Password requirements
    MIN_LENGTH = 12
    
    def __post_init__(self):
        """Validate password requirements on creation."""
        errors = self._validate(self.value)
        if errors:
            raise InvalidPasswordException("; ".join(errors))
    
    @classmethod
    def _validate(cls, password: str) -> list[str]:
        """
        Validate password against all requirements.
        Returns list of validation errors.
        """
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/~`]', password):
            errors.append("Password must contain at least one special character")
        
        return errors
    
    @classmethod
    def is_valid(cls, password: str) -> bool:
        """Check if password meets all requirements without raising exception."""
        return len(cls._validate(password)) == 0
    
    @classmethod
    def get_validation_errors(cls, password: str) -> list[str]:
        """Get list of validation errors for a password."""
        return cls._validate(password)
    
    def __str__(self) -> str:
        """Never expose password in string representation."""
        return "********"
    
    def __repr__(self) -> str:
        return "Password(********)"
