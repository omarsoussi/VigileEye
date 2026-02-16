"""
OTP (One-Time Password) Generator.
Generates secure 6-digit OTP codes for 2FA and verification.
"""
import secrets
import string


class OTPGenerator:
    """
    Generates secure one-time passwords.
    Uses cryptographically secure random number generator.
    """
    
    DEFAULT_LENGTH = 6
    
    @classmethod
    def generate(cls, length: int = DEFAULT_LENGTH) -> str:
        """
        Generate a secure random OTP code.
        
        Args:
            length: Length of OTP (default 6 digits)
            
        Returns:
            String of random digits
        """
        # Use secrets module for cryptographic security
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    @classmethod
    def generate_alphanumeric(cls, length: int = 8) -> str:
        """
        Generate an alphanumeric OTP code.
        Useful for more secure tokens.
        
        Args:
            length: Length of OTP
            
        Returns:
            Alphanumeric string
        """
        alphabet = string.ascii_uppercase + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
