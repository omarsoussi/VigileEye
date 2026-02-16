"""
Login History API Router.
Defines endpoints for viewing login history.
"""
import logging
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from application.dtos import LoginHistoryResponse, LoginHistoryListResponse
from infrastructure.persistence.database import get_db
from infrastructure.persistence.repositories.login_history_repository_impl import SQLAlchemyLoginHistoryRepository
from api.dependencies.auth_deps import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/login-history", tags=["Login History"])


@router.get(
    "",
    response_model=LoginHistoryListResponse,
    summary="Get login history",
    description="Get login history for the current authenticated user with optional filters."
)
def get_login_history(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    start_date: Optional[datetime] = Query(None, description="Filter from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter until this date"),
    device_type: Optional[str] = Query(None, description="Filter by device type (desktop, mobile, tablet)"),
    success_only: Optional[bool] = Query(None, description="Filter by success status"),
    period: Optional[str] = Query(None, description="Predefined period: today, week, month, all"),
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get login history for current user.
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 50, max: 100)
    - **start_date**: Filter records after this date
    - **end_date**: Filter records before this date
    - **device_type**: Filter by device type
    - **success_only**: True for successful logins only, False for failures only
    - **period**: Shortcut for date range (today, week, month, all)
    """
    try:
        repo = SQLAlchemyLoginHistoryRepository(db)
        
        # Handle predefined periods
        if period:
            now = datetime.utcnow()
            if period == "today":
                start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == "week":
                start_date = now - timedelta(days=7)
            elif period == "month":
                start_date = now - timedelta(days=30)
            # "all" means no date filter
        
        offset = (page - 1) * limit
        
        # Get login history
        items = repo.get_by_user_id(
            user_id=current_user_id,
            limit=limit,
            offset=offset,
            start_date=start_date,
            end_date=end_date,
            device_type=device_type,
            success_only=success_only
        )
        
        # Get total count
        total = repo.count_by_user_id(current_user_id)
        
        # Check for suspicious logins
        suspicious = repo.get_suspicious_logins(current_user_id, limit=1)
        has_suspicious = len(suspicious) > 0
        
        return LoginHistoryListResponse(
            items=[
                LoginHistoryResponse(
                    id=item.id,
                    timestamp=item.timestamp,
                    ip_address=item.ip_address,
                    user_agent=item.user_agent,
                    device_type=item.device_type,
                    browser=item.browser,
                    os=item.os,
                    location=item.location,
                    success=item.success,
                    is_suspicious=item.is_suspicious,
                    failure_reason=item.failure_reason
                )
                for item in items
            ],
            total=total,
            has_suspicious=has_suspicious,
            page=page,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error fetching login history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to fetch login history", "error_code": "INTERNAL_ERROR"}
        )


@router.get(
    "/suspicious",
    response_model=LoginHistoryListResponse,
    summary="Get suspicious logins",
    description="Get suspicious login attempts for the current user."
)
def get_suspicious_logins(
    limit: int = Query(10, ge=1, le=50, description="Max items to return"),
    current_user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """
    Get suspicious login attempts.
    
    - **limit**: Maximum number of records (default: 10)
    """
    try:
        repo = SQLAlchemyLoginHistoryRepository(db)
        
        items = repo.get_suspicious_logins(current_user_id, limit=limit)
        total = len(items)
        
        return LoginHistoryListResponse(
            items=[
                LoginHistoryResponse(
                    id=item.id,
                    timestamp=item.timestamp,
                    ip_address=item.ip_address,
                    user_agent=item.user_agent,
                    device_type=item.device_type,
                    browser=item.browser,
                    os=item.os,
                    location=item.location,
                    success=item.success,
                    is_suspicious=item.is_suspicious,
                    failure_reason=item.failure_reason
                )
                for item in items
            ],
            total=total,
            has_suspicious=total > 0,
            page=1,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error fetching suspicious logins: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to fetch suspicious logins", "error_code": "INTERNAL_ERROR"}
        )
