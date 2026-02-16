"""Response DTOs for invitations."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class InvitationResponse(BaseModel):
    id: str
    inviter_email: str
    recipient_email: str
    permission: str
    status: str

    camera_ids: List[str]

    created_at: datetime
    expires_at: Optional[datetime] = None
    unlimited: bool


class MembershipResponse(BaseModel):
    id: str
    owner_user_id: str
    member_user_id: str
    member_email: str
    permission: str
    camera_ids: List[str]
    created_at: datetime


class MessageResponse(BaseModel):
    success: bool
    message: str
