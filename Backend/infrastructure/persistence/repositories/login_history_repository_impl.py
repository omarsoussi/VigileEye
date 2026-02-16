"""
Concrete SQLAlchemy implementation of LoginHistoryRepository.
Implements the abstract LoginHistoryRepositoryInterface from domain layer.
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from domain.entities.login_history import LoginHistory
from domain.repositories.login_history_repository import LoginHistoryRepositoryInterface
from infrastructure.persistence.models.login_history_model import LoginHistoryModel
from infrastructure.persistence.mappers.login_history_mapper import LoginHistoryMapper


class SQLAlchemyLoginHistoryRepository(LoginHistoryRepositoryInterface):
    """
    SQLAlchemy implementation of LoginHistoryRepository.
    Handles all login history persistence operations.
    """
    
    def __init__(self, session: Session):
        """
        Initialize repository with database session.
        
        Args:
            session: SQLAlchemy session
        """
        self._session = session
    
    def create(self, login_history: LoginHistory) -> LoginHistory:
        """Create a new login history record."""
        model = LoginHistoryMapper.to_model(login_history)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return LoginHistoryMapper.to_entity(model)
    
    def get_by_user_id(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        device_type: Optional[str] = None,
        success_only: Optional[bool] = None
    ) -> List[LoginHistory]:
        """Get login history for a user with optional filters."""
        query = self._session.query(LoginHistoryModel).filter(
            LoginHistoryModel.user_id == user_id
        )
        
        if start_date:
            query = query.filter(LoginHistoryModel.timestamp >= start_date)
        if end_date:
            query = query.filter(LoginHistoryModel.timestamp <= end_date)
        if device_type:
            query = query.filter(LoginHistoryModel.device_type == device_type)
        if success_only is not None:
            query = query.filter(LoginHistoryModel.success == success_only)
        
        models = query.order_by(desc(LoginHistoryModel.timestamp)).offset(offset).limit(limit).all()
        return [LoginHistoryMapper.to_entity(m) for m in models]
    
    def get_suspicious_logins(self, user_id: UUID, limit: int = 10) -> List[LoginHistory]:
        """Get suspicious login attempts for a user."""
        models = self._session.query(LoginHistoryModel).filter(
            LoginHistoryModel.user_id == user_id,
            LoginHistoryModel.is_suspicious == True
        ).order_by(desc(LoginHistoryModel.timestamp)).limit(limit).all()
        return [LoginHistoryMapper.to_entity(m) for m in models]
    
    def count_by_user_id(self, user_id: UUID) -> int:
        """Count total login records for a user."""
        return self._session.query(LoginHistoryModel).filter(
            LoginHistoryModel.user_id == user_id
        ).count()
    
    def get_recent_failed_attempts(self, user_id: UUID, since: datetime) -> List[LoginHistory]:
        """Get recent failed login attempts."""
        models = self._session.query(LoginHistoryModel).filter(
            LoginHistoryModel.user_id == user_id,
            LoginHistoryModel.success == False,
            LoginHistoryModel.timestamp >= since
        ).order_by(desc(LoginHistoryModel.timestamp)).all()
        return [LoginHistoryMapper.to_entity(m) for m in models]
    
    def delete_old_records(self, before_date: datetime) -> int:
        """Delete login history records older than specified date."""
        result = self._session.query(LoginHistoryModel).filter(
            LoginHistoryModel.timestamp < before_date
        ).delete()
        self._session.commit()
        return result
