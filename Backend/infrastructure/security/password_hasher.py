"""
Password hashing utilities using bcrypt directly.
Provides secure password hashing and verification.
"""
import bcrypt


class PasswordHasher:
    """
    Password hashing utility class.
    Uses bcrypt for secure password hashing.
    """
    
    ROUNDS = 12  # Cost factor for bcrypt
    
    @staticmethod
    def hash(password: str) -> str:
        """
        Hash a plain text password.
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=PasswordHasher.ROUNDS)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            plain_password: Plain text password to verify
            hashed_password: Stored password hash
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            password_bytes = plain_password.encode('utf-8')
            hashed_bytes = hashed_password.encode('utf-8')
            return bcrypt.checkpw(password_bytes, hashed_bytes)
        except Exception:
            return False
    
    @staticmethod
    def needs_rehash(hashed_password: str) -> bool:
        """
        Check if password hash needs to be rehashed.
        Useful when upgrading hashing parameters.
        
        Args:
            hashed_password: Stored password hash
            
        Returns:
            True if rehashing is recommended, False otherwise
        """
        try:
            # Extract the cost factor from the hash
            # bcrypt hashes look like: $2b$12$...
            parts = hashed_password.split('$')
            if len(parts) >= 3:
                current_rounds = int(parts[2])
                return current_rounds < PasswordHasher.ROUNDS
            return True
        except Exception:
            return True
