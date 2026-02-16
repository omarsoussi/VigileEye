"""
Concrete SQLAlchemy implementation of OTPRepository.
Implements the abstract OTPRepositoryInterface from domain layer.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from domain.entities.otp import OTP, OTPPurpose
from domain.repositories.otp_repository import OTPRepositoryInterface
from infrastructure.persistence.models.otp_model import OTPModel
from infrastructure.persistence.mappers.otp_mapper import OTPMapper


class SQLAlchemyOTPRepository(OTPRepositoryInterface):
    """
    SQLAlchemy implementation of OTPRepository.
    Handles all OTP persistence operations.
    """
    
    def __init__(self, session: Session):
        """
        Initialize repository with database session.
        
        Args:
            session: SQLAlchemy session
        """
        self._session = session
    
    def create(self, otp: OTP) -> OTP:
        """Create a new OTP in the database."""
        model = OTPMapper.to_model(otp)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return OTPMapper.to_entity(model)
    
    def get_by_id(self, otp_id: UUID) -> Optional[OTP]:
        """Get OTP by its unique ID."""
        model = self._session.query(OTPModel).filter(
            OTPModel.id == otp_id
        ).first()
        return OTPMapper.to_entity(model) if model else None
    
    def get_valid_otp(
        self,
        user_id: UUID,
        code: str,
        purpose: OTPPurpose
    ) -> Optional[OTP]:
        """Get a valid (not expired, not used) OTP for a user."""
        now = datetime.now(timezone.utc)
        model = self._session.query(OTPModel).filter(
            OTPModel.user_id == user_id,
            OTPModel.code == code,
            OTPModel.purpose == purpose,
            OTPModel.is_used == False,
            OTPModel.expires_at > now
        ).first()
        return OTPMapper.to_entity(model) if model else None
    
    def get_latest_otp(
        self,
        user_id: UUID,
        purpose: OTPPurpose
    ) -> Optional[OTP]:
        """Get the latest OTP for a user and purpose."""
        model = self._session.query(OTPModel).filter(
            OTPModel.user_id == user_id,
            OTPModel.purpose == purpose
        ).order_by(OTPModel.created_at.desc()).first()
        return OTPMapper.to_entity(model) if model else None
    
    def mark_as_used(self, otp_id: UUID) -> bool:
        """Mark an OTP as used."""
        result = self._session.query(OTPModel).filter(
            OTPModel.id == otp_id
        ).update({"is_used": True})
        self._session.commit()
        return result > 0
    
    def invalidate_all_for_user(
        self,
        user_id: UUID,
        purpose: OTPPurpose
    ) -> int:
        """Invalidate all OTPs for a user and purpose."""
        result = self._session.query(OTPModel).filter(
            OTPModel.user_id == user_id,
            OTPModel.purpose == purpose,
            OTPModel.is_used == False
        ).update({"is_used": True})
        self._session.commit()
        return result
    
    def cleanup_expired(self) -> int:
        """Clean up expired OTPs from the database."""
        now = datetime.now(timezone.utc)
        result = self._session.query(OTPModel).filter(
            OTPModel.expires_at < now
        ).delete()
        self._session.commit()
        return result
