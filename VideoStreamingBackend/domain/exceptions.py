"""Domain exceptions for video streaming."""


class DomainException(Exception):
    """Base domain exception."""


class StreamNotFoundException(DomainException):
    """Raised when a stream session is not found."""


class StreamAlreadyActiveException(DomainException):
    """Raised when trying to start a stream that's already active."""


class StreamConnectionException(DomainException):
    """Raised when unable to connect to a camera stream."""


class StreamDecodingException(DomainException):
    """Raised when unable to decode video frames."""


class UnauthorizedException(DomainException):
    """Raised when user is not authorized."""


class InvalidStreamUrlException(DomainException):
    """Raised when stream URL is invalid."""
