"""
Abstract OTP Repository Interface.
Defines the contract for OTP persistence operations.
"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from domain.entities.otp import OTP, OTPPurpose


class OTPRepositoryInterface(ABC):
    """
    Abstract repository interface for OTP entity.
    Concrete implementations will be in the infrastructure layer.
    """
    
    @abstractmethod
    def create(self, otp: OTP) -> OTP:
        """
        Create a new OTP in the database.
        
        Args:
            otp: OTP entity to persist
            
        Returns:
            Created OTP
        """
        pass
    
    @abstractmethod
    def get_by_id(self, otp_id: UUID) -> Optional[OTP]:
        """
        Get OTP by its unique ID.
        
        Args:
            otp_id: OTP's UUID
            
        Returns:
            OTP if found, None otherwise
        """
        pass
    
    @abstractmethod
    def get_valid_otp(
        self,
        user_id: UUID,
        code: str,
        purpose: OTPPurpose
    ) -> Optional[OTP]:
        """
        Get a valid (not expired, not used) OTP for a user.
        
        Args:
            user_id: User's UUID
            code: OTP code
            purpose: Purpose of the OTP
            
        Returns:
            OTP if valid one exists, None otherwise
        """
        pass
    
    @abstractmethod
    def get_latest_otp(
        self,
        user_id: UUID,
        purpose: OTPPurpose
    ) -> Optional[OTP]:
        """
        Get the latest OTP for a user and purpose.
        
        Args:
            user_id: User's UUID
            purpose: Purpose of the OTP
            
        Returns:
            Latest OTP if exists, None otherwise
        """
        pass
    
    @abstractmethod
    def mark_as_used(self, otp_id: UUID) -> bool:
        """
        Mark an OTP as used.
        
        Args:
            otp_id: OTP's UUID
            
        Returns:
            True if marked, False if not found
        """
        pass
    
    @abstractmethod
    def invalidate_all_for_user(
        self,
        user_id: UUID,
        purpose: OTPPurpose
    ) -> int:
        """
        Invalidate all OTPs for a user and purpose.
        Useful when generating a new OTP.
        
        Args:
            user_id: User's UUID
            purpose: Purpose of the OTPs
            
        Returns:
            Number of invalidated OTPs
        """
        pass
    
    @abstractmethod
    def cleanup_expired(self) -> int:
        """
        Clean up expired OTPs from the database.
        
        Returns:
            Number of deleted OTPs
        """
        pass
