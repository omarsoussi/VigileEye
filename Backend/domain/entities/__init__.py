"""Domain entities module."""
from domain.entities.user import User
from domain.entities.otp import OTP, OTPPurpose
from domain.entities.login_history import LoginHistory

__all__ = ["User", "OTP", "OTPPurpose", "LoginHistory"]
