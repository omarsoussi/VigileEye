"""Response DTOs for groups."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class GroupMemberResponse(BaseModel):
    id: str
    group_id: str
    member_email: str
    member_user_id: Optional[str] = None
    access: str
    status: str
    created_at: datetime
    handled_at: Optional[datetime] = None


class GroupResponse(BaseModel):
    id: str
    owner_user_id: str
    name: str
    description: Optional[str] = None
    icon: str
    color: str
    default_permission: str
    camera_ids: List[str] = []
    member_count: int = 0
    created_at: datetime
    updated_at: datetime


class GroupDetailResponse(GroupResponse):
    members: List[GroupMemberResponse] = []


class BulkInviteResultResponse(BaseModel):
    invited: List[str]
    skipped: List[str]
    message: str


class ReceivedGroupInvitationResponse(BaseModel):
    """Returned when listing group invitations received by the current user."""
    id: str                 # group_member id (used for accept/decline)
    group_id: str
    group_name: str
    inviter_email: str      # group owner email (not stored; resolved at query time)
    member_email: str
    permission: str         # access level
    status: str
    camera_ids: List[str]   # cameras attached to the group
    created_at: datetime
    handled_at: Optional[datetime] = None
