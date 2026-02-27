"""Request DTOs for groups."""

from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class CreateGroupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    icon: str = Field(default="people", max_length=100)
    color: str = Field(default="#4f46e5", max_length=30)
    default_permission: str = Field(default="reader", pattern="^(reader|editor)$")
    camera_ids: Optional[List[str]] = None


class UpdateGroupRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = Field(default=None, max_length=100)
    color: Optional[str] = Field(default=None, max_length=30)
    default_permission: Optional[str] = Field(default=None, pattern="^(reader|editor)$")
    camera_ids: Optional[List[str]] = None


class InviteGroupMemberRequest(BaseModel):
    email: EmailStr
    access: Optional[str] = Field(default=None, pattern="^(reader|editor)$")


class BulkInviteGroupMembersRequest(BaseModel):
    emails: List[EmailStr] = Field(min_length=1)
    access: Optional[str] = Field(default=None, pattern="^(reader|editor)$")


class UpdateGroupMemberRequest(BaseModel):
    access: Optional[str] = Field(default=None, pattern="^(reader|editor)$")


class AcceptGroupInvitationRequest(BaseModel):
    code: str = Field(min_length=4, max_length=10)
