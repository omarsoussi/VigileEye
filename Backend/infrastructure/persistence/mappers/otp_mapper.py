"""
OTP Entity <-> OTPModel Mapper.
Converts between domain entities and SQLAlchemy models.
"""
from domain.entities.otp import OTP
from infrastructure.persistence.models.otp_model import OTPModel


class OTPMapper:
    """Mapper class for OTP entity and OTPModel."""
    
    @staticmethod
    def to_entity(model: OTPModel) -> OTP:
        """
        Convert SQLAlchemy model to domain entity.
        
        Args:
            model: OTPModel instance
            
        Returns:
            OTP domain entity
        """
        return OTP(
            id=model.id,
            user_id=model.user_id,
            code=model.code,
            purpose=model.purpose,
            expires_at=model.expires_at,
            is_used=model.is_used,
            created_at=model.created_at,
        )
    
    @staticmethod
    def to_model(entity: OTP) -> OTPModel:
        """
        Convert domain entity to SQLAlchemy model.
        
        Args:
            entity: OTP domain entity
            
        Returns:
            OTPModel instance
        """
        return OTPModel(
            id=entity.id,
            user_id=entity.user_id,
            code=entity.code,
            purpose=entity.purpose,
            expires_at=entity.expires_at,
            is_used=entity.is_used,
            created_at=entity.created_at,
        )
