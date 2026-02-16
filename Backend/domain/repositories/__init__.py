"""Domain repositories module."""
from domain.repositories.user_repository import UserRepositoryInterface
from domain.repositories.otp_repository import OTPRepositoryInterface

__all__ = ["UserRepositoryInterface", "OTPRepositoryInterface"]
