"""
Pydantic DTOs for login history responses.
Used for API response serialization.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class LoginHistoryResponse(BaseModel):
    """Response for a single login history record."""
    id: UUID = Field(..., description="Login history record ID")
    timestamp: datetime = Field(..., description="Login attempt timestamp")
    ip_address: str = Field(..., description="IP address of the login attempt")
    user_agent: Optional[str] = Field(None, description="Browser user agent string")
    device_type: str = Field(..., description="Type of device (desktop, mobile, tablet)")
    browser: Optional[str] = Field(None, description="Browser name")
    os: Optional[str] = Field(None, description="Operating system")
    location: Optional[str] = Field(None, description="Approximate location based on IP")
    success: bool = Field(..., description="Whether login was successful")
    is_suspicious: bool = Field(..., description="Whether login is flagged as suspicious")
    failure_reason: Optional[str] = Field(None, description="Reason for failure if unsuccessful")
    
    model_config = ConfigDict(from_attributes=True)


class LoginHistoryListResponse(BaseModel):
    """Response containing list of login history records."""
    items: List[LoginHistoryResponse] = Field(..., description="List of login history records")
    total: int = Field(..., description="Total count of records")
    has_suspicious: bool = Field(..., description="Whether there are any suspicious logins")
    page: int = Field(default=1, description="Current page number")
    limit: int = Field(default=50, description="Items per page")
