"""Infrastructure external services module."""
from infrastructure.external.email_sender import (
    EmailSenderInterface,
    SMTPEmailSender,
    MockEmailSender,
    get_email_sender,
)
from infrastructure.external.google_oauth import (
    GoogleOAuthClient,
    GoogleUser,
    google_oauth_client,
)

__all__ = [
    "EmailSenderInterface",
    "SMTPEmailSender",
    "MockEmailSender",
    "get_email_sender",
    "GoogleOAuthClient",
    "GoogleUser",
    "google_oauth_client",
]
