# Backend Authentication Service - VigileEye

## Overview

The **Backend Authentication Service** is the core authentication microservice for the VigileEye security platform. It handles user registration, email verification, 2FA login, password management, token refresh, and Google OAuth integration.

**Port:** `8000`  
**Base URL:** `/api/v1`

---

## Architecture

The service follows **Clean Architecture** (Hexagonal Architecture) principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                   │
│  ┌─────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │     auth_routes.py          │  │   login_history_routes.py        │ │
│  │     /api/v1/auth/*          │  │   /api/v1/login-history/*        │ │
│  └──────────────┬──────────────┘  └───────────────────────────────────┘ │
└─────────────────┼───────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────┐
│                         Application Layer                                │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │      Use Cases       │  │  Request DTOs    │  │  Response DTOs   │   │
│  │  - RegisterUser      │  │ - RegisterReq    │  │ - AuthResponse   │   │
│  │  - VerifyEmail       │  │ - LoginReq       │  │ - TokenResponse  │   │
│  │  - LoginUser         │  │ - VerifyOTPReq   │  │ - UserResponse   │   │
│  │  - ConfirmLogin      │  │ - ResetPassReq   │  │ - MessageResp    │   │
│  │  - ForgotPassword    │  └──────────────────┘  └──────────────────┘   │
│  │  - ResetPassword     │                                                │
│  │  - RefreshToken      │                                                │
│  │  - GoogleOAuth       │                                                │
│  └──────────────────────┘                                                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                       AuthService (Facade)                        │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────┐
│                          Domain Layer (Core)                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │    Entities      │  │  Value Objects   │  │  Repository IFs      │   │
│  │  - User          │  │  - Email         │  │  - UserRepository    │   │
│  │  - OTP           │  │  - Password      │  │  - OTPRepository     │   │
│  │  - LoginHistory  │  └──────────────────┘  │  - LoginHistoryRepo  │   │
│  └──────────────────┘                        └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      Domain Exceptions                            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────────────────┐
│                       Infrastructure Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Config     │  │   Security   │  │  Persistence │  │  External   │  │
│  │ - settings   │  │ - JWT        │  │ - database   │  │ - SMTP      │  │
│  └──────────────┘  │ - Password   │  │ - models     │  │ - Google    │  │
│                    │ - OTP        │  │ - mappers    │  │   OAuth     │  │
│                    └──────────────┘  │ - repos      │  └─────────────┘  │
│                                      └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
Backend/
├── main.py                          # FastAPI entry point
├── alembic.ini                      # Database migrations config
├── requirements.txt                 # Python dependencies
│
├── api/                             # API Layer
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth_routes.py           # Authentication endpoints
│   │   └── login_history_routes.py  # Login history endpoints
│   └── dependencies/
│       ├── __init__.py
│       └── auth_deps.py             # JWT authentication dependencies
│
├── application/                     # Application Layer
│   ├── __init__.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── auth_service.py          # Facade orchestrating use cases
│   ├── use_cases/
│   │   ├── __init__.py
│   │   ├── register_user.py         # User registration
│   │   ├── verify_email.py          # Email verification
│   │   ├── login_user.py            # Login step 1 (credentials)
│   │   ├── confirm_login.py         # Login step 2 (2FA)
│   │   ├── forgot_password.py       # Request password reset
│   │   ├── reset_password.py        # Complete password reset
│   │   ├── refresh_token.py         # Token refresh
│   │   └── google_oauth.py          # Google OAuth flow
│   └── dtos/
│       ├── __init__.py
│       ├── auth_requests.py         # Request validation models
│       ├── auth_responses.py        # Response models
│       └── login_history_responses.py
│
├── domain/                          # Domain Layer (Core Business Logic)
│   ├── __init__.py
│   ├── exceptions.py                # Domain exceptions
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── user.py                  # User entity
│   │   ├── otp.py                   # OTP entity
│   │   └── login_history.py         # Login history entity
│   ├── value_objects/
│   │   ├── __init__.py
│   │   ├── email.py                 # Email value object
│   │   └── password.py              # Password value object
│   └── repositories/
│       ├── __init__.py
│       ├── user_repository.py       # User repository interface
│       ├── otp_repository.py        # OTP repository interface
│       └── login_history_repository.py
│
├── infrastructure/                  # Infrastructure Layer
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py              # Application settings
│   ├── security/
│   │   ├── __init__.py
│   │   ├── jwt_handler.py           # JWT creation/validation
│   │   ├── password_hasher.py       # Bcrypt hashing
│   │   └── otp_generator.py         # Secure OTP generation
│   ├── external/
│   │   ├── __init__.py
│   │   ├── email_sender.py          # SMTP email service
│   │   └── google_oauth.py          # Google OAuth client
│   └── persistence/
│       ├── __init__.py
│       ├── database.py              # SQLAlchemy setup
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user_model.py        # User SQLAlchemy model
│       │   ├── otp_model.py         # OTP SQLAlchemy model
│       │   └── login_history_model.py
│       ├── mappers/
│       │   ├── __init__.py
│       │   ├── user_mapper.py       # Entity ↔ Model mapping
│       │   ├── otp_mapper.py
│       │   └── login_history_mapper.py
│       └── repositories/
│           ├── __init__.py
│           ├── user_repository_impl.py
│           ├── otp_repository_impl.py
│           └── login_history_repository_impl.py
│
├── alembic/                         # Database migrations
│   ├── env.py
│   └── versions/
│       └── 001_initial.py
│
└── tests/                           # Tests
    ├── __init__.py
    ├── conftest.py
    ├── unit/
    │   ├── test_email.py
    │   ├── test_password.py
    │   ├── test_jwt_handler.py
    │   ├── test_password_hasher.py
    │   ├── test_otp_generator.py
    │   ├── test_otp_entity.py
    │   └── test_user_entity.py
    └── integration/
        └── test_auth_api.py
```

---

## Domain Layer

### Entities

#### User Entity (`domain/entities/user.py`)

The core user entity with account management methods.

```python
@dataclass
class User:
    id: UUID
    email: str
    username: str
    password_hash: str
    is_verified: bool = False
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    lockout_until: Optional[datetime] = None
    google_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    def is_locked(self) -> bool
    def increment_failed_attempts(self) -> None
    def reset_failed_attempts(self) -> None
    def lock_account(self, until: datetime) -> None
    def unlock_account(self) -> None
    def verify_email(self) -> None
    def update_last_login(self) -> None
    def update_password(self, password_hash: str) -> None
    def link_google_account(self, google_id: str) -> None
```

#### OTP Entity (`domain/entities/otp.py`)

One-Time Password entity with purpose-based validation.

```python
class OTPPurpose(Enum):
    EMAIL_VERIFICATION = "email_verification"
    LOGIN_2FA = "login_2fa"
    PASSWORD_RESET = "password_reset"

@dataclass
class OTP:
    id: UUID
    user_id: UUID
    code: str
    purpose: OTPPurpose
    expires_at: datetime
    is_used: bool = False
    created_at: datetime

    def is_expired(self) -> bool
    def is_valid(self) -> bool
    def mark_as_used(self) -> None
    
    @classmethod
    def create(cls, user_id, code, purpose, expires_minutes) -> "OTP"
```

#### LoginHistory Entity (`domain/entities/login_history.py`)

Tracks login attempts with device and location information.

```python
@dataclass
class LoginHistory:
    id: UUID
    user_id: UUID
    timestamp: datetime
    ip_address: str
    user_agent: Optional[str]
    device_type: str
    browser: Optional[str]
    os: Optional[str]
    location: Optional[str]
    success: bool
    is_suspicious: bool = False
    failure_reason: Optional[str] = None

    def mark_as_suspicious(self) -> None
    def to_dict(self) -> dict
```

### Value Objects

#### Email (`domain/value_objects/email.py`)

Immutable validated email address.

```python
@dataclass(frozen=True)
class Email:
    value: str
    
    # Validates: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$
    # Raises InvalidEmailException on invalid format
```

#### Password (`domain/value_objects/password.py`)

Password with strength validation.

```python
@dataclass(frozen=True)
class Password:
    value: str
    MIN_LENGTH = 12
    
    # Validation rules:
    # - Minimum 12 characters
    # - At least 1 uppercase letter
    # - At least 1 lowercase letter
    # - At least 1 digit
    # - At least 1 special character (!@#$%^&*...)
```

### Domain Exceptions (`domain/exceptions.py`)

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `InvalidPasswordException` | 400 | Password doesn't meet requirements |
| `InvalidEmailException` | 400 | Invalid email format |
| `UserAlreadyExistsException` | 409 | Email/username already exists |
| `UserNotFoundException` | 404 | User not found |
| `InvalidCredentialsException` | 401 | Wrong email/password |
| `AccountLockedException` | 423 | Account locked after failed attempts |
| `AccountNotVerifiedException` | 403 | Email not verified |
| `InvalidOTPException` | 400 | OTP code is invalid |
| `OTPExpiredException` | 400 | OTP has expired |
| `TokenExpiredException` | 401 | JWT token expired |
| `InvalidTokenException` | 401 | JWT token invalid |

---

## Application Layer

### Use Cases

#### 1. RegisterUser (`application/use_cases/register_user.py`)

**Input:** `email`, `username`, `password`  
**Output:** `user_id`, `email`, `message`

**Flow:**
1. Validate password strength (Password value object)
2. Check email/username uniqueness
3. Hash password with bcrypt (12 rounds)
4. Create User entity
5. Generate 6-digit OTP for email verification
6. Send verification email via SMTP
7. Return user ID and success message

---

#### 2. VerifyEmail (`application/use_cases/verify_email.py`)

**Input:** `email`, `otp_code`  
**Output:** `email`, `is_verified`, `message`

**Flow:**
1. Find user by email
2. Validate OTP (code, expiry, not used)
3. Mark email as verified
4. Mark OTP as used
5. Send welcome email

---

#### 3. LoginUser (`application/use_cases/login_user.py`)

**Input:** `email`, `password`  
**Output:** `email`, `message`, `requires_2fa: true`

**Flow:**
1. Find user by email
2. Check if account is locked
3. Validate password hash
4. Check if email is verified
5. Invalidate existing 2FA OTPs
6. Generate new 2FA OTP (5-minute expiry)
7. Send 2FA code via email
8. Return "requires 2FA" response

---

#### 4. ConfirmLogin (`application/use_cases/confirm_login.py`)

**Input:** `email`, `otp_code`  
**Output:** `user_id`, `email`, `username`, `access_token`, `refresh_token`

**Flow:**
1. Find user by email
2. Validate 2FA OTP
3. Mark OTP as used
4. Reset failed login attempts
5. Update last login timestamp
6. Generate JWT token pair (access + refresh)
7. Record successful login in history
8. Return tokens and user info

---

#### 5. ForgotPassword (`application/use_cases/forgot_password.py`)

**Input:** `email`  
**Output:** `message` (always success)

**Flow:**
1. Find user (silent fail prevents email enumeration)
2. Invalidate existing password reset OTPs
3. Generate new reset OTP (10-minute expiry)
4. Send password reset email
5. Always return success message

---

#### 6. ResetPassword (`application/use_cases/reset_password.py`)

**Input:** `email`, `otp_code`, `new_password`  
**Output:** `email`, `message`

**Flow:**
1. Find user by email
2. Validate reset OTP
3. Validate new password strength
4. Hash new password
5. Update user's password
6. Reset failed login attempts
7. Mark OTP as used

---

#### 7. RefreshToken (`application/use_cases/refresh_token.py`)

**Input:** `refresh_token`  
**Output:** `access_token`, `refresh_token`

**Flow:**
1. Verify refresh token (type, expiry, signature)
2. Extract user ID from token
3. Find user (verify still exists)
4. Generate new token pair
5. Return new tokens

---

#### 8. GoogleOAuth (`application/use_cases/google_oauth.py`)

**Input:** `code`, `state`  
**Output:** `user_id`, `email`, `username`, `is_new_user`, `access_token`, `refresh_token`

**Flow:**
1. Exchange authorization code for access token
2. Fetch user info from Google
3. Find existing user by Google ID or email
4. Create new user if not exists
5. Link Google account if existing user
6. Update last login
7. Generate JWT tokens
8. Return auth response

---

### DTOs

#### Request DTOs (`application/dtos/auth_requests.py`)

```python
class RegisterRequest(BaseModel):
    email: EmailStr
    username: str  # 3-50 chars, alphanumeric + underscore
    password: str  # min 12 chars, validated strength

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str  # 6 digits only

class LoginConfirmRequest(BaseModel):
    email: EmailStr
    otp_code: str  # 6 digits only

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str  # 6 digits
    new_password: str  # validated strength

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class GoogleCallbackRequest(BaseModel):
    code: str
    state: Optional[str]
```

#### Response DTOs (`application/dtos/auth_responses.py`)

```python
class MessageResponse(BaseModel):
    message: str
    success: bool = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # seconds

class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    is_verified: bool
    last_login: Optional[datetime]
    created_at: Optional[datetime]

class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse
    message: str

class GoogleAuthURLResponse(BaseModel):
    authorization_url: str
    message: str

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str]
```

---

## API Layer

### Authentication Routes (`api/routes/auth_routes.py`)

| Method | Endpoint | Request | Response | Status |
|--------|----------|---------|----------|--------|
| `POST` | `/auth/register` | `RegisterRequest` | `MessageResponse` | 201 |
| `POST` | `/auth/verify` | `VerifyOTPRequest` | `MessageResponse` | 200 |
| `POST` | `/auth/login` | `LoginRequest` | `MessageResponse` | 200 |
| `POST` | `/auth/login/confirm` | `LoginConfirmRequest` | `AuthResponse` | 200 |
| `POST` | `/auth/forgot-password` | `ForgotPasswordRequest` | `MessageResponse` | 200 |
| `POST` | `/auth/reset-password` | `ResetPasswordRequest` | `MessageResponse` | 200 |
| `POST` | `/auth/refresh` | `RefreshTokenRequest` | `TokenResponse` | 200 |
| `GET` | `/auth/google` | - | `GoogleAuthURLResponse` | 200 |
| `GET` | `/auth/google/callback` | Query params | `RedirectResponse` | 307 |
| `POST` | `/auth/google/callback` | `GoogleCallbackRequest` | `AuthResponse` | 200 |

### Login History Routes (`api/routes/login_history_routes.py`)

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| `GET` | `/login-history` | ✓ | `LoginHistoryListResponse` |
| `GET` | `/login-history/suspicious` | ✓ | `LoginHistoryListResponse` |

**Query Parameters:**
- `page` (int): Page number
- `limit` (int): Items per page
- `start_date` / `end_date` (datetime): Date range filter
- `device_type` (string): Filter by device
- `success_only` (bool): Only successful logins
- `period` (string): `day`, `week`, `month`

### Authentication Dependencies (`api/dependencies/auth_deps.py`)

```python
async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())
) -> UUID:
    """Extract user ID from JWT access token"""

async def get_current_user(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
) -> User:
    """Get full User entity from token"""

async def get_current_active_user(
    user: User = Depends(get_current_user)
) -> User:
    """Get verified, non-locked user"""
```

---

## Infrastructure Layer

### Configuration (`infrastructure/config/settings.py`)

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| `database_url` | PostgreSQL pg8000 | `DATABASE_URL` |
| `jwt_secret_key` | - | `JWT_SECRET_KEY` |
| `jwt_algorithm` | HS256 | `JWT_ALGORITHM` |
| `access_token_expire_minutes` | 30 | `ACCESS_TOKEN_EXPIRE_MINUTES` |
| `refresh_token_expire_days` | 7 | `REFRESH_TOKEN_EXPIRE_DAYS` |
| `otp_expire_minutes` | 5 | `OTP_EXPIRE_MINUTES` |
| `max_failed_login_attempts` | 3 | `MAX_FAILED_LOGIN_ATTEMPTS` |
| `lockout_duration_minutes` | 60 | `LOCKOUT_DURATION_MINUTES` |
| `smtp_host` | smtp.gmail.com | `SMTP_HOST` |
| `smtp_port` | 587 | `SMTP_PORT` |
| `smtp_username` | - | `SMTP_USERNAME` |
| `smtp_password` | - | `SMTP_PASSWORD` |
| `google_client_id` | - | `GOOGLE_CLIENT_ID` |
| `google_client_secret` | - | `GOOGLE_CLIENT_SECRET` |
| `google_redirect_uri` | - | `GOOGLE_REDIRECT_URI` |
| `frontend_url` | http://localhost:3000 | `FRONTEND_URL` |

### Security Components

#### JWT Handler (`infrastructure/security/jwt_handler.py`)

```python
class JWTHandler:
    def create_access_token(user_id: UUID, email: str) -> str
    def create_refresh_token(user_id: UUID) -> str
    def create_token_pair(user_id: UUID, email: str) -> tuple[str, str]
    def verify_token(token: str, token_type: TokenType) -> dict
    def get_user_id_from_token(token: str) -> UUID
    def refresh_access_token(refresh_token: str, email: str) -> tuple[str, str]
```

**Token Structure:**
- Access Token: `{sub: user_id, email, type: "access", exp, iat}`
- Refresh Token: `{sub: user_id, type: "refresh", exp, iat}`

#### Password Hasher (`infrastructure/security/password_hasher.py`)

```python
class PasswordHasher:
    ROUNDS = 12  # Bcrypt cost factor
    
    @staticmethod
    def hash(password: str) -> str
    
    @staticmethod
    def verify(plain_password: str, hashed_password: str) -> bool
```

#### OTP Generator (`infrastructure/security/otp_generator.py`)

```python
class OTPGenerator:
    DEFAULT_LENGTH = 6
    
    @classmethod
    def generate(cls, length: int = 6) -> str
        # Uses secrets.choice for cryptographic security
```

### External Services

#### Email Sender (`infrastructure/external/email_sender.py`)

```python
class EmailSenderInterface(ABC):
    @abstractmethod
    def send_otp(self, to_email: str, otp_code: str, purpose: OTPPurpose) -> bool
    
    @abstractmethod
    def send_welcome(self, to_email: str, username: str) -> bool

class SMTPEmailSender(EmailSenderInterface):
    # SMTP with TLS
    # HTML + plaintext emails
    # Retry logic

class MockEmailSender(EmailSenderInterface):
    # Logs OTPs to console (debug mode)
```

#### Google OAuth Client (`infrastructure/external/google_oauth.py`)

```python
@dataclass
class GoogleUser:
    id: str
    email: str
    name: str
    picture: Optional[str]
    verified_email: bool

class GoogleOAuthClient:
    AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    
    def get_authorization_url(self, state: str) -> str
    async def exchange_code(self, code: str) -> str
    async def get_user_info(self, access_token: str) -> GoogleUser
    async def authenticate(self, code: str) -> GoogleUser
```

### Database Models

#### UserModel (`infrastructure/persistence/models/user_model.py`)

```sql
Table: users
- id: UUID (PK)
- email: VARCHAR(255) UNIQUE NOT NULL
- username: VARCHAR(100) UNIQUE NOT NULL
- password_hash: VARCHAR(255) NOT NULL
- is_verified: BOOLEAN DEFAULT FALSE
- last_login: TIMESTAMP
- failed_login_attempts: INTEGER DEFAULT 0
- lockout_until: TIMESTAMP
- google_id: VARCHAR(255) UNIQUE
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL
```

#### OTPModel (`infrastructure/persistence/models/otp_model.py`)

```sql
Table: otps
- id: UUID (PK)
- user_id: UUID (FK -> users.id)
- code: VARCHAR(6) NOT NULL
- purpose: ENUM('email_verification', 'login_2fa', 'password_reset')
- expires_at: TIMESTAMP NOT NULL
- is_used: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMP NOT NULL
```

#### LoginHistoryModel (`infrastructure/persistence/models/login_history_model.py`)

```sql
Table: login_history
- id: UUID (PK)
- user_id: UUID (FK -> users.id) INDEXED
- timestamp: TIMESTAMP NOT NULL
- ip_address: VARCHAR(45) NOT NULL
- user_agent: TEXT
- device_type: VARCHAR(20)
- browser: VARCHAR(100)
- os: VARCHAR(100)
- location: VARCHAR(255)
- success: BOOLEAN NOT NULL
- is_suspicious: BOOLEAN DEFAULT FALSE
- failure_reason: VARCHAR(255)
```

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | Bcrypt with 12 rounds |
| **Password Requirements** | 12+ chars, uppercase, lowercase, digit, special char |
| **OTP Generation** | Cryptographically secure 6-digit codes |
| **OTP Expiry** | 5 minutes (configurable) |
| **JWT Tokens** | HS256 algorithm |
| **Access Token Expiry** | 30 minutes (configurable) |
| **Refresh Token Expiry** | 7 days (configurable) |
| **Account Lockout** | 3 failed attempts → 60 min lockout |
| **2FA** | Required for all logins |
| **Email Verification** | Required before login |
| **CORS** | Configurable origins |

---

## Authentication Flows

### Registration Flow
```
Client                    Backend                   Email Service
  │                          │                           │
  │── POST /register ───────>│                           │
  │                          │── Validate password       │
  │                          │── Hash password           │
  │                          │── Create User             │
  │                          │── Generate OTP            │
  │                          │── Send verification ─────>│
  │<── 201 Created ─────────│                           │
```

### Login Flow (2FA)
```
Client                    Backend                   Email Service
  │                          │                           │
  │── POST /login ──────────>│                           │
  │                          │── Validate credentials    │
  │                          │── Check account status    │
  │                          │── Generate 2FA OTP        │
  │                          │── Send 2FA code ─────────>│
  │<── requires_2fa ────────│                           │
  │                          │                           │
  │── POST /login/confirm ──>│                           │
  │                          │── Validate OTP            │
  │                          │── Generate JWT tokens     │
  │                          │── Record login history    │
  │<── AuthResponse ────────│                           │
```

### Token Refresh Flow
```
Client                    Backend
  │                          │
  │── POST /refresh ────────>│
  │   (refresh_token)        │── Validate refresh token
  │                          │── Extract user ID
  │                          │── Generate new tokens
  │<── TokenResponse ───────│
```

---

## Dependencies

```
# FastAPI and Server
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
python-multipart>=0.0.17

# Database
sqlalchemy>=2.0.36
pg8000>=1.31.2
alembic>=1.14.0

# Security
python-jose[cryptography]>=3.3.0
bcrypt>=4.2.1

# Validation
pydantic>=2.10.2
pydantic-settings>=2.6.1
email-validator>=2.2.0

# HTTP Client (for Google OAuth)
httpx>=0.28.0

# Testing
pytest>=8.3.4
pytest-asyncio>=0.25.0
pytest-cov>=6.0.0
```

---

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+pg8000://user:pass@localhost:5432/authdb"
export JWT_SECRET_KEY="your-secret-key"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## API Documentation

Once running, access:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **OpenAPI JSON:** http://localhost:8000/openapi.json
