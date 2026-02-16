"""
Concrete SQLAlchemy implementation of UserRepository.
Implements the abstract UserRepositoryInterface from domain layer.
"""
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from domain.entities.user import User
from domain.repositories.user_repository import UserRepositoryInterface
from infrastructure.persistence.models.user_model import UserModel
from infrastructure.persistence.mappers.user_mapper import UserMapper


class SQLAlchemyUserRepository(UserRepositoryInterface):
    """
    SQLAlchemy implementation of UserRepository.
    Handles all user persistence operations.
    """
    
    def __init__(self, session: Session):
        """
        Initialize repository with database session.
        
        Args:
            session: SQLAlchemy session
        """
        self._session = session
    
    def create(self, user: User) -> User:
        """Create a new user in the database."""
        model = UserMapper.to_model(user)
        self._session.add(model)
        self._session.commit()
        self._session.refresh(model)
        return UserMapper.to_entity(model)
    
    def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by their unique ID."""
        model = self._session.query(UserModel).filter(
            UserModel.id == user_id
        ).first()
        return UserMapper.to_entity(model) if model else None
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by their email address."""
        model = self._session.query(UserModel).filter(
            UserModel.email == email.lower()
        ).first()
        return UserMapper.to_entity(model) if model else None
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by their username."""
        model = self._session.query(UserModel).filter(
            UserModel.username == username
        ).first()
        return UserMapper.to_entity(model) if model else None
    
    def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Get user by their Google OAuth ID."""
        model = self._session.query(UserModel).filter(
            UserModel.google_id == google_id
        ).first()
        return UserMapper.to_entity(model) if model else None
    
    def update(self, user: User) -> User:
        """Update an existing user."""
        model = self._session.query(UserModel).filter(
            UserModel.id == user.id
        ).first()
        if model:
            UserMapper.update_model(model, user)
            self._session.commit()
            self._session.refresh(model)
            return UserMapper.to_entity(model)
        raise ValueError(f"User with id {user.id} not found")
    
    def delete(self, user_id: UUID) -> bool:
        """Delete a user by ID."""
        result = self._session.query(UserModel).filter(
            UserModel.id == user_id
        ).delete()
        self._session.commit()
        return result > 0
    
    def email_exists(self, email: str) -> bool:
        """Check if email is already registered."""
        return self._session.query(UserModel).filter(
            UserModel.email == email.lower()
        ).first() is not None
    
    def username_exists(self, username: str) -> bool:
        """Check if username is already taken."""
        return self._session.query(UserModel).filter(
            UserModel.username == username
        ).first() is not None
