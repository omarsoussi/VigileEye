"""
User Entity <-> UserModel Mapper.
Converts between domain entities and SQLAlchemy models.
"""
from domain.entities.user import User
from infrastructure.persistence.models.user_model import UserModel


class UserMapper:
    """Mapper class for User entity and UserModel."""
    
    @staticmethod
    def to_entity(model: UserModel) -> User:
        """
        Convert SQLAlchemy model to domain entity.
        
        Args:
            model: UserModel instance
            
        Returns:
            User domain entity
        """
        return User(
            id=model.id,
            email=model.email,
            username=model.username,
            password_hash=model.password_hash,
            is_verified=model.is_verified,
            last_login=model.last_login,
            failed_login_attempts=model.failed_login_attempts,
            lockout_until=model.lockout_until,
            google_id=model.google_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
    
    @staticmethod
    def to_model(entity: User) -> UserModel:
        """
        Convert domain entity to SQLAlchemy model.
        
        Args:
            entity: User domain entity
            
        Returns:
            UserModel instance
        """
        return UserModel(
            id=entity.id,
            email=entity.email,
            username=entity.username,
            password_hash=entity.password_hash,
            is_verified=entity.is_verified,
            last_login=entity.last_login,
            failed_login_attempts=entity.failed_login_attempts,
            lockout_until=entity.lockout_until,
            google_id=entity.google_id,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
    
    @staticmethod
    def update_model(model: UserModel, entity: User) -> UserModel:
        """
        Update SQLAlchemy model with entity values.
        
        Args:
            model: Existing UserModel instance
            entity: User domain entity with updated values
            
        Returns:
            Updated UserModel instance
        """
        model.email = entity.email
        model.username = entity.username
        model.password_hash = entity.password_hash
        model.is_verified = entity.is_verified
        model.last_login = entity.last_login
        model.failed_login_attempts = entity.failed_login_attempts
        model.lockout_until = entity.lockout_until
        model.google_id = entity.google_id
        model.updated_at = entity.updated_at
        return model
