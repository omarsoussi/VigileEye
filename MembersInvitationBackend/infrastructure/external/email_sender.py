"""Email sender for invitation approval codes (SMTP)."""

import logging
import smtplib
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailSenderInterface(ABC):
    @abstractmethod
    def send_invitation_code(
        self,
        to_email: str,
        code: str,
        inviter_email: str,
        permission: str,
        expires_minutes: int,
    ) -> bool:
        raise NotImplementedError


class SMTPEmailSender(EmailSenderInterface):
    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
    ):
        self.host = host or settings.smtp_host
        self.port = port or settings.smtp_port
        self.username = username or settings.smtp_username
        self.password = password or settings.smtp_password
        self.from_email = from_email or settings.smtp_from_email
        self.from_name = from_name or settings.smtp_from_name

    def _send_email(self, to_email: str, subject: str, html: str, text: Optional[str] = None) -> bool:
        try:
            from_email = self.from_email or self.username
            if not from_email:
                raise ValueError("SMTP_FROM_EMAIL (or SMTP_USERNAME) is required to send email")

            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{from_email}>"
            message["To"] = to_email

            if text:
                message.attach(MIMEText(text, "plain"))
            message.attach(MIMEText(html, "html"))

            with smtplib.SMTP(self.host, self.port) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                if self.username:
                    password = (self.password or "").replace(" ", "")
                    server.login(self.username, password)
                server.sendmail(from_email, to_email, message.as_string())

            logger.info("Invitation code sent to %s", to_email)
            return True
        except Exception as e:
            logger.error("Failed to send invitation email to %s: %s", to_email, str(e))
            return False

    def send_invitation_code(
        self,
        to_email: str,
        code: str,
        inviter_email: str,
        permission: str,
        expires_minutes: int,
    ) -> bool:
        subject = "VigileEye - Invitation Approval Code"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset=\"utf-8\" />
          <style>
            body {{ font-family: Arial, sans-serif; color: #222; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #00d4ff 0%, #4f46e5 100%); color: white; padding: 22px; border-radius: 12px 12px 0 0; }}
            .content {{ background: #f7f7fb; padding: 22px; border-radius: 0 0 12px 12px; }}
            .code {{ font-size: 34px; letter-spacing: 8px; font-weight: 800; text-align: center; background: white; border-radius: 12px; padding: 18px; margin: 18px 0; }}
            .muted {{ color: #666; font-size: 13px; }}
          </style>
        </head>
        <body>
          <div class=\"container\">
            <div class=\"header\">
              <h2>Member Invitation</h2>
            </div>
            <div class=\"content\">
              <p>You received a camera-sharing invitation from <b>{inviter_email}</b>.</p>
              <p>Permission: <b>{permission}</b></p>
              <p>Use this approval code in the app:</p>
              <div class=\"code\">{code}</div>
              <p class=\"muted\">This code expires in {expires_minutes} minutes. If you did not request this, you can ignore it.</p>
            </div>
          </div>
        </body>
        </html>
        """

        text = (
            "Member Invitation\n\n"
            f"Invitation from: {inviter_email}\n"
            f"Permission: {permission}\n\n"
            f"Approval code: {code}\n\n"
            f"This code expires in {expires_minutes} minutes.\n"
        )

        return self._send_email(to_email, subject, html, text)


class MockEmailSender(EmailSenderInterface):
    def send_invitation_code(
        self,
        to_email: str,
        code: str,
        inviter_email: str,
        permission: str,
        expires_minutes: int,
    ) -> bool:
        logger.info(
            "[MOCK] Invitation code to %s from %s permission=%s code=%s expires=%sm",
            to_email,
            inviter_email,
            permission,
            code,
            expires_minutes,
        )
        return True


def get_email_sender() -> EmailSenderInterface:
    if settings.debug and (not settings.smtp_username or not settings.smtp_from_email):
        logger.warning(
            "SMTP not configured for real sending; using MockEmailSender. "
            "Missing SMTP_USERNAME or SMTP_FROM_EMAIL."
        )
        return MockEmailSender()
    return SMTPEmailSender()
