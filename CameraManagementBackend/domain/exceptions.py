"""Domain exceptions for camera management."""


class DomainException(Exception):
    """Base domain exception."""
    pass


class CameraNotFoundException(DomainException):
    """Camera not found."""
    pass


class UnauthorizedException(DomainException):
    """Unauthorized access."""
    pass


class CameraAlreadyExistsException(DomainException):
    """Camera already exists."""
    pass


class InvalidCameraConfigException(DomainException):
    """Invalid camera configuration."""
    pass
