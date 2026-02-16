"""Request DTOs for invitations."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class CreateInvitationRequest(BaseModel):
    member_email: EmailStr
    permission: str = Field(pattern="^(reader|editor)$")
    camera_ids: List[str] = Field(min_length=1)

    unlimited: bool = False
    expires_at: Optional[datetime] = None


class AcceptInvitationRequest(BaseModel):
    code: str = Field(min_length=4, max_length=12)


class DeclineInvitationRequest(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=300)
