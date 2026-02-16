"""
Abstract User Repository Interface.
Defines the contract for user persistence operations.
Following Dependency Inversion Principle - domain depends on abstraction.
"""
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from domain.entities.user import User


class UserRepositoryInterface(ABC):
    """
    Abstract repository interface for User entity.
    Concrete implementations will be in the infrastructure layer.
    """
    
    @abstractmethod
    def create(self, user: User) -> User:
        """
        Create a new user in the database.
        
        Args:
            user: User entity to persist
            
        Returns:
            Created user with generated ID
        """
        pass
    
    @abstractmethod
    def get_by_id(self, user_id: UUID) -> Optional[User]:
        """
        Get user by their unique ID.
        
        Args:
            user_id: User's UUID
            
        Returns:
            User if found, None otherwise
        """
        pass
    
    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by their email address.
        
        Args:
            email: User's email
            
        Returns:
            User if found, None otherwise
        """
        pass
    
    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]:
        """
        Get user by their username.
        
        Args:
            username: User's username
            
        Returns:
            User if found, None otherwise
        """
        pass
    
    @abstractmethod
    def get_by_google_id(self, google_id: str) -> Optional[User]:
        """
        Get user by their Google OAuth ID.
        
        Args:
            google_id: User's Google ID
            
        Returns:
            User if found, None otherwise
        """
        pass
    
    @abstractmethod
    def update(self, user: User) -> User:
        """
        Update an existing user.
        
        Args:
            user: User entity with updated values
            
        Returns:
            Updated user
        """
        pass
    
    @abstractmethod
    def delete(self, user_id: UUID) -> bool:
        """
        Delete a user by ID.
        
        Args:
            user_id: User's UUID
            
        Returns:
            True if deleted, False if not found
        """
        pass
    
    @abstractmethod
    def email_exists(self, email: str) -> bool:
        """
        Check if email is already registered.
        
        Args:
            email: Email to check
            
        Returns:
            True if exists, False otherwise
        """
        pass
    
    @abstractmethod
    def username_exists(self, username: str) -> bool:
        """
        Check if username is already taken.
        
        Args:
            username: Username to check
            
        Returns:
            True if exists, False otherwise
        """
        pass
