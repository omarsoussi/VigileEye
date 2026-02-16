"""
Authentication API Router.
Defines all authentication-related endpoints.
"""
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from application.dtos import (
    RegisterRequest,
    VerifyOTPRequest,
    LoginRequest,
    LoginConfirmRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
    GoogleCallbackRequest,
    MessageResponse,
    TokenResponse,
    AuthResponse,
    UserResponse,
    GoogleAuthURLResponse,
)
from application.services import AuthService
from infrastructure.persistence.database import get_db
from infrastructure.config.settings import get_settings
from infrastructure.persistence.repositories.login_history_repository_impl import (
    SQLAlchemyLoginHistoryRepository,
)
from domain.exceptions import (
    DomainException,
    InvalidPasswordException,
    InvalidEmailException,
    UserAlreadyExistsException,
    UserNotFoundException,
    InvalidCredentialsException,
    AccountLockedException,
    AccountNotVerifiedException,
    InvalidOTPException,
    OTPExpiredException,
    TokenExpiredException,
    InvalidTokenException,
)
from domain.entities.login_history import LoginHistory

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_client_ip(request: Request) -> str:
    # Prefer proxy headers, fallback to socket peer.
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # Can be: client, proxy1, proxy2
        ip = xff.split(",")[0].strip()
        if ip:
            return ip

    xri = request.headers.get("x-real-ip")
    if xri:
        return xri.strip()

    if request.client and request.client.host:
        return request.client.host

    return ""


def _parse_user_agent(user_agent: Optional[str]) -> tuple[str, Optional[str], Optional[str]]:
    # Returns: (device_type, browser, os)
    if not user_agent:
        return ("desktop", None, None)

    ua = user_agent.lower()

    # Device type
    if "ipad" in ua or "tablet" in ua:
        device_type = "tablet"
    elif "iphone" in ua or "android" in ua or "mobile" in ua:
        device_type = "mobile"
    else:
        device_type = "desktop"

    # Browser (very lightweight heuristics)
    browser: Optional[str] = None
    if "edg/" in ua or "edge" in ua:
        browser = "Edge"
    elif "chrome/" in ua and "chromium" not in ua and "edg/" not in ua:
        browser = "Chrome"
    elif "firefox/" in ua:
        browser = "Firefox"
    elif "safari/" in ua and "chrome/" not in ua:
        browser = "Safari"

    # OS
    os_name: Optional[str] = None
    if "mac os x" in ua or "macintosh" in ua:
        os_name = "macOS"
    elif "windows nt" in ua:
        os_name = "Windows"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua or "ios" in ua:
        os_name = "iOS"
    elif "linux" in ua:
        os_name = "Linux"

    return (device_type, browser, os_name)


def _best_effort_location(request: Request) -> Optional[str]:
    # No external geo-IP calls; rely on reverse-proxy injected headers when available.
    city = request.headers.get("x-geo-city") or request.headers.get("x-appengine-city")
    region = request.headers.get("x-geo-region") or request.headers.get("x-appengine-region")
    country = (
        request.headers.get("x-geo-country")
        or request.headers.get("cf-ipcountry")
        or request.headers.get("x-appengine-country")
    )
    parts = [p for p in [city, region, country] if p]
    if parts:
        return ", ".join(parts)
    return None


def _record_login_history(
    *,
    db: Session,
    user_id: UUID,
    request: Request,
    success: bool,
    failure_reason: Optional[str] = None,
) -> None:
    try:
        repo = SQLAlchemyLoginHistoryRepository(db)
        ip_address = _get_client_ip(request)
        user_agent = request.headers.get("user-agent")
        device_type, browser, os_name = _parse_user_agent(user_agent)
        location = _best_effort_location(request)

        repo.create(
            LoginHistory(
                user_id=user_id,
                ip_address=ip_address or "unknown",
                timestamp=datetime.utcnow(),
                user_agent=user_agent,
                device_type=device_type,
                browser=browser,
                os=os_name,
                location=location,
                success=success,
                is_suspicious=False,
                failure_reason=failure_reason,
            )
        )
    except Exception:
        # Never block auth on telemetry.
        logger.exception("Failed to record login history")


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Dependency to get AuthService instance."""
    return AuthService(session=db)


def handle_domain_exception(e: DomainException) -> HTTPException:
    """Convert domain exceptions to HTTP exceptions."""
    exception_mapping = {
        InvalidPasswordException: (status.HTTP_400_BAD_REQUEST, "INVALID_PASSWORD"),
        InvalidEmailException: (status.HTTP_400_BAD_REQUEST, "INVALID_EMAIL"),
        UserAlreadyExistsException: (status.HTTP_409_CONFLICT, "USER_EXISTS"),
        UserNotFoundException: (status.HTTP_404_NOT_FOUND, "USER_NOT_FOUND"),
        InvalidCredentialsException: (status.HTTP_401_UNAUTHORIZED, "INVALID_CREDENTIALS"),
        AccountLockedException: (status.HTTP_423_LOCKED, "ACCOUNT_LOCKED"),
        AccountNotVerifiedException: (status.HTTP_403_FORBIDDEN, "EMAIL_NOT_VERIFIED"),
        InvalidOTPException: (status.HTTP_400_BAD_REQUEST, "INVALID_OTP"),
        OTPExpiredException: (status.HTTP_400_BAD_REQUEST, "OTP_EXPIRED"),
        TokenExpiredException: (status.HTTP_401_UNAUTHORIZED, "TOKEN_EXPIRED"),
        InvalidTokenException: (status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN"),
    }
    
    status_code, error_code = exception_mapping.get(
        type(e),
        (status.HTTP_500_INTERNAL_SERVER_ERROR, "INTERNAL_ERROR")
    )
    
    return HTTPException(
        status_code=status_code,
        detail={"message": e.message, "error_code": error_code}
    )


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Register a new user with email, username, and password. Sends verification OTP to email."
)
def register(
    request: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Register a new user.
    
    - **email**: Valid email address (unique)
    - **username**: Alphanumeric username (3-50 chars, unique)
    - **password**: Min 12 chars with uppercase, lowercase, digit, special char
    """
    try:
        result = auth_service.register(
            email=request.email,
            username=request.username,
            password=request.password
        )
        return MessageResponse(
            message=result["message"],
            success=True
        )
    except DomainException as e:
        raise handle_domain_exception(e)
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred during registration", "error_code": "INTERNAL_ERROR"}
        )


@router.post(
    "/verify",
    response_model=MessageResponse,
    summary="Verify email with OTP",
    description="Verify user's email address using the 6-digit OTP code sent during registration."
)
def verify_email(
    request: VerifyOTPRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Verify email with OTP code.
    
    - **email**: User's email address
    - **otp_code**: 6-digit verification code
    """
    try:
        result = auth_service.verify_email(
            email=request.email,
            otp_code=request.otp_code
        )
        return MessageResponse(
            message=result["message"],
            success=result["is_verified"]
        )
    except DomainException as e:
        raise handle_domain_exception(e)
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred during verification", "error_code": "INTERNAL_ERROR"}
        )


@router.post(
    "/login",
    response_model=MessageResponse,
    summary="Login (Step 1)",
    description="Validate credentials and send 2FA OTP to email."
)
def login(
    request: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Login step 1: Validate credentials.
    
    - **email**: User's email address
    - **password**: User's password
    
    On success, sends 2FA OTP to email.
    """
    try:
        result = auth_service.login(
            email=request.email,
            password=request.password
        )
        return MessageResponse(
            message=result["message"],
            success=True
        )
    except DomainException as e:
        raise handle_domain_exception(e)
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred during login", "error_code": "INTERNAL_ERROR"}
        )


@router.post(
    "/login/confirm",
    response_model=AuthResponse,
    summary="Confirm Login with 2FA (Step 2)",
    description="Complete login by verifying 2FA OTP code. Returns JWT tokens."
)
def confirm_login(
    request: LoginConfirmRequest,
    http_request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Login step 2: Verify 2FA OTP.
    
    - **email**: User's email address
    - **otp_code**: 6-digit 2FA code
    
    Returns access and refresh JWT tokens.
    """
    try:
        result = auth_service.confirm_login(
            email=request.email,
            otp_code=request.otp_code
        )

        # Record successful login history
        _record_login_history(
            db=auth_service.session,
            user_id=UUID(result["user_id"]),
            request=http_request,
            success=True,
        )

        return AuthResponse(
            user=UserResponse(
                id=result["user_id"],
                email=result["email"],
                username=result["username"],
                is_verified=True,
                last_login=None,
                created_at=None
            ),
            tokens=TokenResponse(
                access_token=result["access_token"],
                refresh_token=result["refresh_token"],
                token_type=result["token_type"]
            ),
            message=result["message"]
        )
    except DomainException as e:
        # Best-effort record failed login confirmation attempts when we can resolve the user.
        try:
            email = request.email.lower().strip()
            user = auth_service.user_repo.get_by_email(email)
            if user:
                _record_login_history(
                    db=auth_service.session,
                    user_id=user.id,
                    request=http_request,
                    success=False,
                    failure_reason=getattr(e, "message", str(e)),
                )
        except Exception:
            pass
        raise handle_domain_exception(e)
    except Exception as e:
        logger.error(f"Login confirm error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred during login confirmation", "error_code": "INTERNAL_ERROR"}
        )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
    description="Send password reset OTP to email."
)
def forgot_password(
    request: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Request password reset.
    
    - **email**: User's email address
    
    Sends reset OTP if email exists (always returns success for security).
    """
    try:
        result = auth_service.forgot_password(email=request.email)
        return MessageResponse(
            message=result["message"],
            success=True
        )
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        # Always return success for security (prevent email enumeration)
        return MessageResponse(
            message="If an account exists with this email, a reset code has been sent",
            success=True
        )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password",
    description="Reset password using OTP code."
)
def reset_password(
    request: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Reset password with OTP.
    
    - **email**: User's email address
    - **otp_code**: 6-digit reset code
    - **new_password**: New password (must meet requirements)
    """
    try:
        result = auth_service.reset_password(
            email=request.email,
            otp_code=request.otp_code,
            new_password=request.new_password
        )
        return MessageResponse(
            message=result["message"],
            success=True
        )
    except DomainException as e:
        raise handle_domain_exception(e)
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred during password reset", "error_code": "INTERNAL_ERROR"}
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh tokens",
    description="Get new access token using refresh token."
)
def refresh_tokens(
    request: RefreshTokenRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Refresh JWT tokens.
    
    - **refresh_token**: Valid refresh token
    
    Returns new access and refresh tokens.
    """
    try:
        result = auth_service.refresh_tokens(refresh_token=request.refresh_token)
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type=result["token_type"]
        )
    except DomainException as e:
        raise handle_domain_exception(e)
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred during token refresh", "error_code": "INTERNAL_ERROR"}
        )


@router.get(
    "/google",
    response_model=GoogleAuthURLResponse,
    summary="Get Google OAuth URL",
    description="Get authorization URL for Google OAuth login."
)
def google_auth(
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Get Google OAuth authorization URL.
    
    Returns URL to redirect user for Google login.
    """
    try:
        url = auth_service.get_google_auth_url()
        return GoogleAuthURLResponse(authorization_url=url)
    except Exception as e:
        logger.error(f"Google auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "An error occurred getting Google auth URL", "error_code": "INTERNAL_ERROR"}
        )


@router.get(
    "/google/callback",
    summary="Google OAuth callback",
    description="Handle callback from Google OAuth."
)
def google_callback(
    http_request: Request,
    code: str = Query(..., description="Authorization code from Google"),
    state: Optional[str] = Query(None, description="CSRF state parameter"),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Handle Google OAuth callback.
    
    - **code**: Authorization code from Google
    - **state**: CSRF state parameter (optional)
    
    Returns JWT tokens or redirects to frontend.
    """
    try:
        result = auth_service.google_callback(code=code, state=state)

        # Record successful login history
        if http_request is not None:
            _record_login_history(
                db=auth_service.session,
                user_id=UUID(result["user_id"]),
                request=http_request,
                success=True,
            )
        
        # Redirect to frontend with tokens
        frontend_url = settings.frontend_url
        redirect_url = (
            f"{frontend_url}/auth/callback"
            f"?access_token={result['access_token']}"
            f"&refresh_token={result['refresh_token']}"
            f"&is_new_user={str(result['is_new_user']).lower()}"
        )
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        logger.error(f"Google callback error: {str(e)}")
        # Redirect to frontend with error
        frontend_url = settings.frontend_url
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=google_auth_failed"
        )


@router.post(
    "/google/callback",
    response_model=AuthResponse,
    summary="Google OAuth callback (POST)",
    description="Handle callback from Google OAuth via POST."
)
def google_callback_post(
    request: GoogleCallbackRequest,
    http_request: Request,
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Handle Google OAuth callback (POST method).
    
    - **code**: Authorization code from Google
    - **state**: CSRF state parameter (optional)
    
    Returns JWT tokens.
    """
    try:
        result = auth_service.google_callback(
            code=request.code,
            state=request.state
        )

        _record_login_history(
            db=auth_service.session,
            user_id=UUID(result["user_id"]),
            request=http_request,
            success=True,
        )
        
        return AuthResponse(
            user=UserResponse(
                id=result["user_id"],
                email=result["email"],
                username=result["username"],
                is_verified=True,
                last_login=None,
                created_at=None
            ),
            tokens=TokenResponse(
                access_token=result["access_token"],
                refresh_token=result["refresh_token"],
                token_type=result["token_type"]
            ),
            message=result["message"]
        )
    except Exception as e:
        logger.error(f"Google callback POST error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Google authentication failed", "error_code": "GOOGLE_AUTH_FAILED"}
        )
