"""
Email Value Object with validation.
Encapsulates email validation logic in the domain layer.
"""
import re
from dataclasses import dataclass
from domain.exceptions import InvalidEmailException


@dataclass(frozen=True)
class Email:
    """
    Value object representing a valid email address.
    Immutable and validates on creation.
    """
    value: str
    
    def __post_init__(self):
        """Validate email format on creation."""
        if not self._is_valid_email(self.value):
            raise InvalidEmailException(f"Invalid email format: {self.value}")
    
    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """
        Validate email format using regex.
        More comprehensive validation can use email-validator library.
        """
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def __str__(self) -> str:
        return self.value
    
    def __eq__(self, other) -> bool:
        if isinstance(other, Email):
            return self.value.lower() == other.value.lower()
        if isinstance(other, str):
            return self.value.lower() == other.lower()
        return False
    
    def __hash__(self) -> int:
        return hash(self.value.lower())
