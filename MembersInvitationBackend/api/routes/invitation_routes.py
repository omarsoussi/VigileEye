"""Invitation API Router."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.dependencies.auth_deps import CurrentUser, get_current_user
from application.dtos.invitation_requests import (
    AcceptInvitationRequest,
    CreateInvitationRequest,
    DeclineInvitationRequest,
)
from application.dtos.invitation_responses import InvitationResponse, MembershipResponse, MessageResponse
from application.use_cases.accept_invitation import AcceptInvitationUseCase
from application.use_cases.create_invitation import CreateInvitationUseCase
from application.use_cases.decline_invitation import DeclineInvitationUseCase
from application.use_cases.list_received_invitations import ListReceivedInvitationsUseCase
from application.use_cases.list_sent_invitations import ListSentInvitationsUseCase
from application.use_cases.resend_invitation_code import ResendInvitationCodeUseCase
from infrastructure.persistence.repositories.membership_repository_impl import SQLAlchemyMembershipRepository
from domain.exceptions import (
    DomainException,
    InvitationAlreadyHandledException,
    InvitationExpiredException,
    InvitationNotFoundException,
    InvalidInvitationCodeException,
    UnauthorizedException,
)
from infrastructure.config.settings import get_settings
from infrastructure.external.email_sender import get_email_sender
from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories.invitation_repository_impl import SQLAlchemyInvitationRepository
from infrastructure.persistence.repositories.membership_repository_impl import SQLAlchemyMembershipRepository

router = APIRouter(prefix="/api/v1/members", tags=["members"])


def _invitation_to_response(inv) -> InvitationResponse:
    return InvitationResponse(
        id=str(inv.id),
        inviter_email=inv.inviter_email,
        recipient_email=inv.recipient_email,
        permission=inv.permission.value,
        status=inv.status.value,
        camera_ids=list(inv.camera_ids),
        created_at=inv.created_at,
        expires_at=inv.expires_at,
        unlimited=bool(inv.unlimited),
    )


@router.post("/invitations", response_model=InvitationResponse)
def create_invitation(
    payload: CreateInvitationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = get_settings()
    repo = SQLAlchemyInvitationRepository(db)
    email_sender = get_email_sender()

    use_case = CreateInvitationUseCase(repo, email_sender, settings)

    try:
        invitation = use_case.execute(
            inviter_user_id=current_user.id,
            inviter_email=current_user.email,
            recipient_email=str(payload.member_email),
            permission=payload.permission,
            camera_ids=payload.camera_ids,
            unlimited=payload.unlimited,
            expires_at=payload.expires_at,
        )
        return _invitation_to_response(invitation)
    except DomainException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": str(e), "error_code": "INVALID_REQUEST"},
        )


@router.get("/invitations/sent", response_model=list[InvitationResponse])
def list_sent(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyInvitationRepository(db)
    use_case = ListSentInvitationsUseCase(repo)
    invitations = use_case.execute(current_user.id)
    return [_invitation_to_response(i) for i in invitations]


@router.get("/invitations/received", response_model=list[InvitationResponse])
def list_received(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyInvitationRepository(db)
    use_case = ListReceivedInvitationsUseCase(repo)
    invitations = use_case.execute(current_user.email.lower())
    return [_invitation_to_response(i) for i in invitations]


@router.post("/invitations/{invitation_id}/accept", response_model=MembershipResponse)
def accept_invitation(
    invitation_id: UUID,
    payload: AcceptInvitationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invitation_repo = SQLAlchemyInvitationRepository(db)
    membership_repo = SQLAlchemyMembershipRepository(db)
    use_case = AcceptInvitationUseCase(invitation_repo, membership_repo)

    try:
        membership = use_case.execute(invitation_id, current_user.id, current_user.email, payload.code)
        return MembershipResponse(
            id=str(membership.id),
            owner_user_id=str(membership.owner_user_id),
            member_user_id=str(membership.member_user_id),
            member_email=membership.member_email,
            permission=membership.permission.value,
            camera_ids=list(membership.camera_ids),
            created_at=membership.created_at,
        )
    except InvitationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})
    except InvitationExpiredException as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail={"message": str(e), "error_code": "EXPIRED"})
    except (InvitationAlreadyHandledException, InvalidInvitationCodeException) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})


@router.post("/invitations/{invitation_id}/decline", response_model=MessageResponse)
def decline_invitation(
    invitation_id: UUID,
    _payload: DeclineInvitationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = SQLAlchemyInvitationRepository(db)
    use_case = DeclineInvitationUseCase(repo)

    try:
        use_case.execute(invitation_id, current_user.email)
        return MessageResponse(success=True, message="Invitation declined")
    except InvitationNotFoundException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": str(e), "error_code": "NOT_FOUND"})
    except UnauthorizedException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": str(e), "error_code": "FORBIDDEN"})
    except InvitationAlreadyHandledException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})


@router.post("/invitations/{invitation_id}/resend-code", response_model=MessageResponse)
def resend_code(
    invitation_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only recipient can trigger resend (prevents spam from inviter)
    repo = SQLAlchemyInvitationRepository(db)
    invitation = repo.get_by_id(invitation_id)
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Invitation not found", "error_code": "NOT_FOUND"})
    if invitation.recipient_email.lower() != current_user.email.lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={"message": "Forbidden", "error_code": "FORBIDDEN"})

    settings = get_settings()
    email_sender = get_email_sender()
    use_case = ResendInvitationCodeUseCase(repo, email_sender, settings)

    try:
        use_case.execute(invitation_id)
        return MessageResponse(success=True, message="Code resent")
    except InvitationExpiredException as e:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail={"message": str(e), "error_code": "EXPIRED"})
    except InvitationAlreadyHandledException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"message": str(e), "error_code": "INVALID"})


@router.get("/memberships/mine", response_model=list[MembershipResponse])
def list_my_memberships(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active memberships where the current user is a member (shared cameras)."""
    repo = SQLAlchemyMembershipRepository(db)
    memberships = repo.list_by_member_user_id(current_user.id)
    return [
        MembershipResponse(
            id=str(m.id),
            owner_user_id=str(m.owner_user_id),
            member_user_id=str(m.member_user_id),
            member_email=m.member_email,
            permission=m.permission.value if hasattr(m.permission, 'value') else m.permission,
            camera_ids=m.camera_ids,
            created_at=m.created_at,
        )
        for m in memberships
    ]
