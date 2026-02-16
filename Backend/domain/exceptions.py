"""
Domain exceptions for authentication and user management.
These are business logic exceptions that are independent of infrastructure.
"""


class DomainException(Exception):
    """Base exception for domain layer."""
    
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


class InvalidPasswordException(DomainException):
    """Raised when password doesn't meet requirements."""
    pass


class InvalidEmailException(DomainException):
    """Raised when email format is invalid."""
    pass


class UserAlreadyExistsException(DomainException):
    """Raised when trying to create a user that already exists."""
    pass


class UserNotFoundException(DomainException):
    """Raised when user is not found."""
    pass


class InvalidCredentialsException(DomainException):
    """Raised when credentials are invalid."""
    pass


class AccountLockedException(DomainException):
    """Raised when account is locked due to too many failed attempts."""
    pass


class AccountNotVerifiedException(DomainException):
    """Raised when account email is not verified."""
    pass


class InvalidOTPException(DomainException):
    """Raised when OTP is invalid or expired."""
    pass


class OTPExpiredException(DomainException):
    """Raised when OTP has expired."""
    pass


class TokenExpiredException(DomainException):
    """Raised when JWT token has expired."""
    pass


class InvalidTokenException(DomainException):
    """Raised when JWT token is invalid."""
    pass
