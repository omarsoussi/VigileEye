"""
Email sender interface and implementation.
Handles sending OTP codes and notifications via SMTP.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from abc import ABC, abstractmethod
from typing import Optional

from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EmailSenderInterface(ABC):
    """Abstract interface for email sending."""
    
    @abstractmethod
    def send_otp(self, to_email: str, otp_code: str, purpose: str) -> bool:
        """Send OTP code to email."""
        pass
    
    @abstractmethod
    def send_welcome(self, to_email: str, username: str) -> bool:
        """Send welcome email after verification."""
        pass


class SMTPEmailSender(EmailSenderInterface):
    """
    SMTP implementation of email sender.
    Uses Gmail SMTP for sending emails.
    """
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        username: str = None,
        password: str = None,
        from_email: str = None,
        from_name: str = None
    ):
        """Initialize SMTP email sender with configuration."""
        self.host = host or settings.smtp_host
        self.port = port or settings.smtp_port
        self.username = username or settings.smtp_username
        self.password = password or settings.smtp_password
        self.from_email = from_email or settings.smtp_from_email
        self.from_name = from_name or settings.smtp_from_name
    
    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email via SMTP.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text fallback
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email
            
            # Add text and HTML parts
            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            message.attach(MIMEText(html_content, "html"))
            
            # Connect and send
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.sendmail(self.from_email, to_email, message.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def send_otp(self, to_email: str, otp_code: str, purpose: str) -> bool:
        """
        Send OTP code to email.
        
        Args:
            to_email: Recipient email
            otp_code: 6-digit OTP code
            purpose: Purpose description (verification, login, reset)
            
        Returns:
            True if sent successfully
        """
        purpose_messages = {
            "email_verification": {
                "subject": "Verify Your Email - Camera Monitoring System",
                "heading": "Email Verification",
                "message": "Please use the following code to verify your email address:"
            },
            "login_2fa": {
                "subject": "Login Verification Code - Camera Monitoring System",
                "heading": "Login Verification",
                "message": "Your login verification code is:"
            },
            "password_reset": {
                "subject": "Password Reset Code - Camera Monitoring System",
                "heading": "Password Reset",
                "message": "Your password reset code is:"
            }
        }
        
        config = purpose_messages.get(purpose, {
            "subject": "Verification Code - Camera Monitoring System",
            "heading": "Verification",
            "message": "Your verification code is:"
        })
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-code {{ font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
                .warning {{ color: #e74c3c; font-size: 14px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎥 Camera Monitoring System</h1>
                    <h2>{config['heading']}</h2>
                </div>
                <div class="content">
                    <p>{config['message']}</p>
                    <div class="otp-code">{otp_code}</div>
                    <p class="warning">⚠️ This code will expire in 5 minutes. Do not share this code with anyone.</p>
                    <p>If you didn't request this code, please ignore this email or contact support if you're concerned.</p>
                </div>
                <div class="footer">
                    <p>© 2024 Camera Monitoring System. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        {config['heading']}
        
        {config['message']}
        
        Your code: {otp_code}
        
        This code will expire in 5 minutes.
        Do not share this code with anyone.
        
        If you didn't request this code, please ignore this email.
        
        - Camera Monitoring System
        """
        
        return self._send_email(to_email, config['subject'], html_content, text_content)
    
    def send_welcome(self, to_email: str, username: str) -> bool:
        """
        Send welcome email after successful verification.
        
        Args:
            to_email: Recipient email
            username: User's username
            
        Returns:
            True if sent successfully
        """
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .footer {{ text-align: center; color: #888; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎥 Camera Monitoring System</h1>
                    <h2>Welcome Aboard! 🎉</h2>
                </div>
                <div class="content">
                    <p>Hello <strong>{username}</strong>,</p>
                    <p>Your email has been verified successfully! Welcome to the Camera Monitoring System.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Access your dashboard</li>
                        <li>Configure your cameras</li>
                        <li>Set up alerts and notifications</li>
                        <li>View real-time monitoring</li>
                    </ul>
                    <p>Thank you for joining us!</p>
                </div>
                <div class="footer">
                    <p>© 2024 Camera Monitoring System. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(
            to_email,
            "Welcome to Camera Monitoring System!",
            html_content
        )


class MockEmailSender(EmailSenderInterface):
    """
    Mock email sender for testing.
    Logs emails instead of sending them.
    """
    
    def __init__(self):
        self.sent_emails = []
    
    def send_otp(self, to_email: str, otp_code: str, purpose: str) -> bool:
        """Log OTP email instead of sending."""
        email_data = {
            "to": to_email,
            "otp_code": otp_code,
            "purpose": purpose,
            "type": "otp"
        }
        self.sent_emails.append(email_data)
        logger.info(f"[MOCK] OTP email to {to_email}: {otp_code} ({purpose})")
        print(f"\n📧 [MOCK EMAIL] OTP Code for {to_email}: {otp_code} (Purpose: {purpose})\n")
        return True
    
    def send_welcome(self, to_email: str, username: str) -> bool:
        """Log welcome email instead of sending."""
        email_data = {
            "to": to_email,
            "username": username,
            "type": "welcome"
        }
        self.sent_emails.append(email_data)
        logger.info(f"[MOCK] Welcome email to {to_email}")
        print(f"\n📧 [MOCK EMAIL] Welcome email sent to {to_email}\n")
        return True
    
    def get_last_otp(self, email: str) -> Optional[str]:
        """Get the last OTP sent to an email (for testing)."""
        for sent in reversed(self.sent_emails):
            if sent.get("to") == email and sent.get("type") == "otp":
                return sent.get("otp_code")
        return None


# Factory function to get email sender based on configuration
def get_email_sender() -> EmailSenderInterface:
    """
    Factory function to get appropriate email sender.
    Returns mock sender if SMTP is not configured.
    """
    if settings.smtp_username and settings.smtp_password:
        return SMTPEmailSender()
    else:
        logger.warning("SMTP not configured, using mock email sender")
        return MockEmailSender()
