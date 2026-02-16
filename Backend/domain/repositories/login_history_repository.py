"""
Abstract LoginHistory Repository Interface.
Defines the contract for login history persistence operations.
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from domain.entities.login_history import LoginHistory


class LoginHistoryRepositoryInterface(ABC):
    """
    Abstract repository interface for LoginHistory entity.
    Concrete implementations will be in the infrastructure layer.
    """
    
    @abstractmethod
    def create(self, login_history: LoginHistory) -> LoginHistory:
        """
        Create a new login history record.
        
        Args:
            login_history: LoginHistory entity to persist
            
        Returns:
            Created login history with generated ID
        """
        pass
    
    @abstractmethod
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
        """
        Get login history for a user with optional filters.
        
        Args:
            user_id: User's UUID
            limit: Maximum number of records to return
            offset: Number of records to skip
            start_date: Filter records after this date
            end_date: Filter records before this date
            device_type: Filter by device type
            success_only: If True, only successful logins; if False, only failures
            
        Returns:
            List of LoginHistory records
        """
        pass
    
    @abstractmethod
    def get_suspicious_logins(self, user_id: UUID, limit: int = 10) -> List[LoginHistory]:
        """
        Get suspicious login attempts for a user.
        
        Args:
            user_id: User's UUID
            limit: Maximum number of records
            
        Returns:
            List of suspicious LoginHistory records
        """
        pass
    
    @abstractmethod
    def count_by_user_id(self, user_id: UUID) -> int:
        """
        Count total login records for a user.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Total count of login history records
        """
        pass
    
    @abstractmethod
    def get_recent_failed_attempts(self, user_id: UUID, since: datetime) -> List[LoginHistory]:
        """
        Get recent failed login attempts.
        
        Args:
            user_id: User's UUID
            since: Get attempts since this datetime
            
        Returns:
            List of failed LoginHistory records
        """
        pass
    
    @abstractmethod
    def delete_old_records(self, before_date: datetime) -> int:
        """
        Delete login history records older than specified date.
        
        Args:
            before_date: Delete records before this date
            
        Returns:
            Number of deleted records
        """
        pass
