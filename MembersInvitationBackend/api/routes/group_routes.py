"""Group API Router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.dependencies.auth_deps import CurrentUser, get_current_user
from application.dtos.group_requests import (
    AcceptGroupInvitationRequest,
    BulkInviteGroupMembersRequest,
    CreateGroupRequest,
    InviteGroupMemberRequest,
    UpdateGroupMemberRequest,
    UpdateGroupRequest,
)
from application.dtos.group_responses import (
    BulkInviteResultResponse,
    GroupDetailResponse,
    GroupMemberResponse,
    GroupResponse,
    ReceivedGroupInvitationResponse,
)
from application.dtos.invitation_responses import MembershipResponse, MessageResponse
from application.use_cases.accept_group_member import AcceptGroupMemberUseCase
from application.use_cases.bulk_invite_group_members import BulkInviteGroupMembersUseCase
from application.use_cases.create_group import CreateGroupUseCase
from application.use_cases.decline_group_member import DeclineGroupMemberUseCase
from application.use_cases.delete_group import DeleteGroupUseCase
from application.use_cases.invite_group_member import InviteGroupMemberUseCase
from application.use_cases.list_groups import ListGroupsUseCase
from application.use_cases.remove_group_member import RemoveGroupMemberUseCase
from application.use_cases.resend_group_codes import ResendAllGroupCodesUseCase, ResendGroupMemberCodeUseCase
from application.use_cases.update_group import UpdateGroupUseCase
from application.use_cases.update_group_member_access import UpdateGroupMemberAccessUseCase
from domain.exceptions import (
    DomainException,
    GroupCodeExpiredException,
    GroupMemberAlreadyExistsException,
    GroupMemberAlreadyHandledException,
    GroupMemberNotFoundException,
    GroupNotFoundException,
    InvalidGroupCodeException,
    UnauthorizedException,
)
from infrastructure.config.settings import get_settings
from infrastructure.external.email_sender import get_email_sender
from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories.group_member_repository_impl import SQLAlchemyGroupMemberRepository
from infrastructure.persistence.repositories.group_repository_impl import SQLAlchemyGroupRepository
from infrastructure.persistence.repositories.membership_repository_impl import SQLAlchemyMembershipRepository

router = APIRouter(prefix="/api/v1/members/groups", tags=["groups"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _group_to_response(group, member_count: int = 0) -> GroupResponse:
    return GroupResponse(
        id=str(group.id),
        owner_user_id=str(group.owner_user_id),
        name=group.name,
        description=group.description,
        icon=group.icon,
        color=group.color,
        default_permission=group.default_permission.value,
        camera_ids=list(group.camera_ids) if group.camera_ids else [],
        member_count=member_count,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


def _member_to_response(m) -> GroupMemberResponse:
    return GroupMemberResponse(
        id=str(m.id),
        group_id=str(m.group_id),
        member_email=m.member_email,
        member_user_id=str(m.member_user_id) if m.member_user_id else None,
        access=m.access.value,
        status=m.status.value,
        created_at=m.created_at,
        handled_at=m.handled_at,
    )


# ── Group CRUD ───────────────────────────────────────────────────────────────

@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: CreateGroupRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyGroupRepository(db)
    use_case = CreateGroupUseCase(repo)
    try:
        group = use_case.execute(
            owner_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            icon=payload.icon,
            color=payload.color,
            default_permission=payload.default_permission,
            camera_ids=payload.camera_ids,
        )
        return _group_to_response(group)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID_REQUEST"})


@router.get("", response_model=list[GroupResponse])
def list_groups(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    use_case = ListGroupsUseCase(group_repo)
    groups = use_case.execute(current_user.id)
    result = []
    for g in groups:
        members = member_repo.list_by_group(g.id)
        result.append(_group_to_response(g, member_count=len(members)))
    return result


@router.get("/invitations/received", response_model=list[ReceivedGroupInvitationResponse])
def list_received_group_invitations(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all group invitations received by the current user (any status)."""
    member_repo = SQLAlchemyGroupMemberRepository(db)
    group_repo = SQLAlchemyGroupRepository(db)

    members = member_repo.list_by_email(current_user.email.lower())
    result: list[ReceivedGroupInvitationResponse] = []
    for m in members:
        group = group_repo.get_by_id(m.group_id)
        if not group:
            continue
        result.append(ReceivedGroupInvitationResponse(
            id=str(m.id),
            group_id=str(m.group_id),
            group_name=group.name,
            inviter_email="",  # will be resolved below
            member_email=m.member_email,
            permission=m.access.value,
            status=m.status.value,
            camera_ids=list(group.camera_ids) if group.camera_ids else [],
            created_at=m.created_at,
            handled_at=m.handled_at,
        ))
        # Resolve owner email — we don't store it, so we use it from jwt user table
        # For now we leave inviter_email blank; the frontend shows group_name instead

    return result


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)

    group = group_repo.get_by_id(group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Group not found", "error_code": "NOT_FOUND"})
    if group.owner_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "Forbidden", "error_code": "FORBIDDEN"})

    members = member_repo.list_by_group(group_id)
    return GroupDetailResponse(
        id=str(group.id),
        owner_user_id=str(group.owner_user_id),
        name=group.name,
        description=group.description,
        icon=group.icon,
        color=group.color,
        default_permission=group.default_permission.value,
        camera_ids=list(group.camera_ids) if group.camera_ids else [],
        member_count=len(members),
        created_at=group.created_at,
        updated_at=group.updated_at,
        members=[_member_to_response(m) for m in members],
    )


@router.put("/{group_id}", response_model=GroupResponse)
def update_group(
    group_id: UUID,
    payload: UpdateGroupRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyGroupRepository(db)
    use_case = UpdateGroupUseCase(repo)
    try:
        group = use_case.execute(
            group_id=group_id,
            owner_user_id=current_user.id,
            name=payload.name,
            description=payload.description,
            icon=payload.icon,
            color=payload.color,
            default_permission=payload.default_permission,
            camera_ids=payload.camera_ids,
        )
        return _group_to_response(group)
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


@router.delete("/{group_id}", response_model=MessageResponse)
def delete_group(
    group_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyGroupRepository(db)
    use_case = DeleteGroupUseCase(repo)
    try:
        use_case.execute(group_id, current_user.id)
        return MessageResponse(success=True, message="Group deleted")
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


# ── Group Member Invite ──────────────────────────────────────────────────────

@router.post("/{group_id}/members", response_model=GroupMemberResponse, status_code=status.HTTP_201_CREATED)
def invite_member(
    group_id: UUID,
    payload: InviteGroupMemberRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    email_sender = get_email_sender()

    use_case = InviteGroupMemberUseCase(group_repo, member_repo, email_sender, settings)
    try:
        member = use_case.execute(
            group_id=group_id,
            owner_user_id=current_user.id,
            owner_email=current_user.email,
            member_email=str(payload.email),
            access=payload.access,
        )
        return _member_to_response(member)
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})
    except GroupMemberAlreadyExistsException as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail={"message": str(e), "error_code": "DUPLICATE"})
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID_REQUEST"})


@router.post("/{group_id}/members/bulk", response_model=BulkInviteResultResponse)
def bulk_invite_members(
    group_id: UUID,
    payload: BulkInviteGroupMembersRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    email_sender = get_email_sender()

    use_case = BulkInviteGroupMembersUseCase(group_repo, member_repo, email_sender, settings)
    try:
        invited, skipped = use_case.execute(
            group_id=group_id,
            owner_user_id=current_user.id,
            owner_email=current_user.email,
            emails=[str(e) for e in payload.emails],
            access=payload.access,
        )
        return BulkInviteResultResponse(
            invited=invited,
            skipped=skipped,
            message=f"Invited {len(invited)}, skipped {len(skipped)}",
        )
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


# ── Group Member Management ─────────────────────────────────────────────────

@router.put("/{group_id}/members/{member_id}", response_model=GroupMemberResponse)
def update_member(
    group_id: UUID,
    member_id: UUID,
    payload: UpdateGroupMemberRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    use_case = UpdateGroupMemberAccessUseCase(group_repo, member_repo)
    try:
        member = use_case.execute(
            group_id=group_id,
            member_id=member_id,
            owner_user_id=current_user.id,
            access=payload.access,
        )
        return _member_to_response(member)
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except GroupMemberNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


@router.delete("/{group_id}/members/{member_id}", response_model=MessageResponse)
def remove_member(
    group_id: UUID,
    member_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    use_case = RemoveGroupMemberUseCase(group_repo, member_repo)
    try:
        use_case.execute(group_id, member_id, current_user.id)
        return MessageResponse(success=True, message="Member removed")
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except GroupMemberNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


# ── Resend Codes ─────────────────────────────────────────────────────────────

@router.post("/{group_id}/members/{member_id}/resend-code", response_model=MessageResponse)
def resend_member_code(
    group_id: UUID,
    member_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    email_sender = get_email_sender()

    use_case = ResendGroupMemberCodeUseCase(group_repo, member_repo, email_sender, settings)
    try:
        use_case.execute(group_id, member_id, current_user.id, current_user.email)
        return MessageResponse(success=True, message="Code resent")
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except GroupMemberNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except GroupMemberAlreadyHandledException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


@router.post("/{group_id}/resend-code", response_model=MessageResponse)
def resend_all_codes(
    group_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    email_sender = get_email_sender()

    use_case = ResendAllGroupCodesUseCase(group_repo, member_repo, email_sender, settings)
    try:
        count = use_case.execute(group_id, current_user.id, current_user.email)
        return MessageResponse(success=True, message=f"Resent codes to {count} pending member(s)")
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})


# ── Accept / Decline (recipient side) ───────────────────────────────────────

@router.post("/{group_id}/members/{member_id}/accept", response_model=MembershipResponse)
def accept_group_invitation(
    group_id: UUID,
    member_id: UUID,
    payload: AcceptGroupInvitationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    group_repo = SQLAlchemyGroupRepository(db)
    member_repo = SQLAlchemyGroupMemberRepository(db)
    membership_repo = SQLAlchemyMembershipRepository(db)

    use_case = AcceptGroupMemberUseCase(group_repo, member_repo, membership_repo)
    try:
        membership = use_case.execute(group_id, member_id, current_user.id, current_user.email, payload.code)
        return MembershipResponse(
            id=str(membership.id),
            owner_user_id=str(membership.owner_user_id),
            member_user_id=str(membership.member_user_id),
            member_email=membership.member_email,
            permission=membership.permission.value,
            camera_ids=list(membership.camera_ids),
            created_at=membership.created_at,
        )
    except GroupNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except GroupMemberNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})
    except GroupMemberAlreadyHandledException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})
    except GroupCodeExpiredException as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail={"message": str(e), "error_code": "EXPIRED"})
    except InvalidGroupCodeException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})


@router.post("/{group_id}/members/{member_id}/decline", response_model=MessageResponse)
def decline_group_invitation(
    group_id: UUID,
    member_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member_repo = SQLAlchemyGroupMemberRepository(db)
    use_case = DeclineGroupMemberUseCase(member_repo)
    try:
        use_case.execute(member_id, current_user.email)
        return MessageResponse(success=True, message="Group invitation declined")
    except GroupMemberNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})
    except GroupMemberAlreadyHandledException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})
