"""
Google OAuth integration for social login.
Uses authlib for OAuth2 flow.
"""
import logging
from typing import Optional
from dataclasses import dataclass
import httpx

from infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class GoogleUser:
    """Data class representing a Google user profile."""
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    verified_email: bool = True


class GoogleOAuthClient:
    """
    Google OAuth 2.0 client for social login.
    Handles authorization URL generation and token exchange.
    """
    
    AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def __init__(
        self,
        client_id: str = None,
        client_secret: str = None,
        redirect_uri: str = None
    ):
        """
        Initialize Google OAuth client.
        
        Args:
            client_id: Google OAuth client ID
            client_secret: Google OAuth client secret
            redirect_uri: Callback URL after Google auth
        """
        self.client_id = client_id or settings.google_client_id
        self.client_secret = client_secret or settings.google_client_secret
        self.redirect_uri = redirect_uri or settings.google_redirect_uri
    
    def get_authorization_url(self, state: Optional[str] = None) -> str:
        """
        Generate Google OAuth authorization URL.
        
        Args:
            state: Optional state parameter for CSRF protection
            
        Returns:
            Authorization URL to redirect user to
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "consent",
        }
        
        if state:
            params["state"] = state
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.AUTHORIZATION_URL}?{query_string}"
    
    async def exchange_code(self, code: str) -> dict:
        """
        Exchange authorization code for access token.
        
        Args:
            code: Authorization code from Google callback
            
        Returns:
            Token response containing access_token
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to exchange code: {response.text}")
                raise Exception("Failed to exchange authorization code")
            
            return response.json()
    
    def exchange_code_sync(self, code: str) -> dict:
        """
        Synchronous version of exchange_code.
        
        Args:
            code: Authorization code from Google callback
            
        Returns:
            Token response containing access_token
        """
        with httpx.Client() as client:
            response = client.post(
                self.TOKEN_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self.redirect_uri,
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to exchange code: {response.text}")
                raise Exception("Failed to exchange authorization code")
            
            return response.json()
    
    async def get_user_info(self, access_token: str) -> GoogleUser:
        """
        Get user profile information from Google.
        
        Args:
            access_token: OAuth access token
            
        Returns:
            GoogleUser with profile information
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get user info: {response.text}")
                raise Exception("Failed to get user information")
            
            data = response.json()
            
            return GoogleUser(
                id=data["id"],
                email=data["email"],
                name=data.get("name", data["email"].split("@")[0]),
                picture=data.get("picture"),
                verified_email=data.get("verified_email", True)
            )
    
    def get_user_info_sync(self, access_token: str) -> GoogleUser:
        """
        Synchronous version of get_user_info.
        
        Args:
            access_token: OAuth access token
            
        Returns:
            GoogleUser with profile information
        """
        with httpx.Client() as client:
            response = client.get(
                self.USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to get user info: {response.text}")
                raise Exception("Failed to get user information")
            
            data = response.json()
            
            return GoogleUser(
                id=data["id"],
                email=data["email"],
                name=data.get("name", data["email"].split("@")[0]),
                picture=data.get("picture"),
                verified_email=data.get("verified_email", True)
            )
    
    async def authenticate(self, code: str) -> GoogleUser:
        """
        Complete authentication flow: exchange code and get user info.
        
        Args:
            code: Authorization code from callback
            
        Returns:
            GoogleUser with profile information
        """
        token_data = await self.exchange_code(code)
        access_token = token_data["access_token"]
        return await self.get_user_info(access_token)
    
    def authenticate_sync(self, code: str) -> GoogleUser:
        """
        Synchronous version of authenticate.
        
        Args:
            code: Authorization code from callback
            
        Returns:
            GoogleUser with profile information
        """
        token_data = self.exchange_code_sync(code)
        access_token = token_data["access_token"]
        return self.get_user_info_sync(access_token)


# Global instance
google_oauth_client = GoogleOAuthClient()
