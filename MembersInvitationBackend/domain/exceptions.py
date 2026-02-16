"""Domain exceptions for member invitations."""


class DomainException(Exception):
    pass


class UnauthorizedException(DomainException):
    pass


class InvitationNotFoundException(DomainException):
    pass


class InvitationExpiredException(DomainException):
    pass


class InvitationAlreadyHandledException(DomainException):
    pass


class InvalidInvitationCodeException(DomainException):
    pass
