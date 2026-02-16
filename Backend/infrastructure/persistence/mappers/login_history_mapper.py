"""
Mapper for LoginHistory entity and model conversion.
"""
from domain.entities.login_history import LoginHistory
from infrastructure.persistence.models.login_history_model import LoginHistoryModel


class LoginHistoryMapper:
    """
    Mapper class for converting between LoginHistory entity and SQLAlchemy model.
    """
    
    @staticmethod
    def to_entity(model: LoginHistoryModel) -> LoginHistory:
        """
        Convert SQLAlchemy model to domain entity.
        
        Args:
            model: LoginHistoryModel instance
            
        Returns:
            LoginHistory domain entity
        """
        return LoginHistory(
            id=model.id,
            user_id=model.user_id,
            timestamp=model.timestamp,
            ip_address=model.ip_address,
            user_agent=model.user_agent,
            device_type=model.device_type,
            browser=model.browser,
            os=model.os,
            location=model.location,
            success=model.success,
            is_suspicious=model.is_suspicious,
            failure_reason=model.failure_reason,
        )
    
    @staticmethod
    def to_model(entity: LoginHistory) -> LoginHistoryModel:
        """
        Convert domain entity to SQLAlchemy model.
        
        Args:
            entity: LoginHistory domain entity
            
        Returns:
            LoginHistoryModel instance
        """
        return LoginHistoryModel(
            id=entity.id,
            user_id=entity.user_id,
            timestamp=entity.timestamp,
            ip_address=entity.ip_address,
            user_agent=entity.user_agent,
            device_type=entity.device_type,
            browser=entity.browser,
            os=entity.os,
            location=entity.location,
            success=entity.success,
            is_suspicious=entity.is_suspicious,
            failure_reason=entity.failure_reason,
        )
