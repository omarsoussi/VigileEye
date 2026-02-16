# Members Invitation Service - VigileEye

## Overview

The **Members Invitation Service** handles invitations and membership management for the VigileEye security platform. It enables camera owners to invite other users to view or manage their cameras, with a secure OTP-based acceptance flow.

**Port:** `8001`  
**Base URL:** `/api/v1`

---

## Architecture

The service follows **Clean Architecture** principles:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              API Layer                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                     members_routes.py                                ││
│  │                     /api/v1/members/*                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         Application Layer                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    InvitationService (Facade)                      │  │
│  │  - create_invitation()      - accept_invitation()                 │  │
│  │  - decline_invitation()     - list_received_invitations()         │  │
│  │  - list_sent_invitations()  - resend_invitation_code()            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐   │
│  │     Use Cases         │  │              DTOs                      │   │
│  │  - CreateInvitation   │  │  - CreateInvitationRequest             │   │
│  │  - AcceptInvitation   │  │  - AcceptInvitationRequest             │   │
│  │  - DeclineInvitation  │  │  - InvitationResponse                  │   │
│  │  - ListReceived       │  │  - InvitationListResponse              │   │
│  │  - ListSent           │  │  - MembershipResponse                  │   │
│  │  - ResendCode         │  └───────────────────────────────────────┘   │
│  └───────────────────────┘                                              │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                           Domain Layer                                   │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐  │
│  │     Entities       │  │      Enums          │  │   Repositories   │  │
│  │  - Invitation      │  │  - PermissionLevel  │  │  - InvitationRepo│  │
│  │  - Membership      │  │  - InvitationStatus │  │  - MembershipRepo│  │
│  │  - InvitationCamera│  │                     │  │                  │  │
│  └────────────────────┘  └─────────────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     Domain Exceptions                             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────┐
│                       Infrastructure Layer                               │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │   Config     │  │   Persistence  │  │   Security   │  │  External │  │
│  │ - settings   │  │  - database    │  │ - JWT valid  │  │  - Email  │  │
│  └──────────────┘  │  - models      │  │ - OTP gen    │  │   sender  │  │
│                    │  - mappers     │  │ - Password   │  └───────────┘  │
│                    │  - repos       │  │   hasher     │                  │
│                    └────────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
MembersInvitationBackend/
├── main.py                          # FastAPI entry point
├── alembic.ini                      # Database migrations config
├── requirements.txt                 # Python dependencies
│
├── api/                             # API Layer
│   ├── __init__.py
│   ├── routes/
│   │   ├── __init__.py
│   │   └── members_routes.py        # All invitation endpoints
│   └── dependencies/
│       ├── __init__.py
│       └── auth_deps.py             # JWT authentication
│
├── application/                     # Application Layer
│   ├── __init__.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── invitation_service.py    # Facade orchestrating use cases
│   ├── use_cases/
│   │   ├── __init__.py
│   │   ├── create_invitation.py     # Create new invitation
│   │   ├── accept_invitation.py     # Accept with OTP
│   │   ├── decline_invitation.py    # Decline invitation
│   │   ├── list_received_invitations.py
│   │   ├── list_sent_invitations.py
│   │   └── resend_invitation_code.py
│   └── dtos/
│       ├── __init__.py
│       ├── invitation_requests.py   # Request validation
│       └── invitation_responses.py  # Response models
│
├── domain/                          # Domain Layer
│   ├── __init__.py
│   ├── exceptions.py                # Domain exceptions
│   ├── entities/
│   │   ├── __init__.py
│   │   ├── invitation.py            # Invitation entity + cameras
│   │   └── membership.py            # Membership entity
│   └── repositories/
│       ├── __init__.py
│       ├── invitation_repository.py
│       └── membership_repository.py
│
├── infrastructure/                  # Infrastructure Layer
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── security/
│   │   ├── __init__.py
│   │   ├── jwt_handler.py           # JWT validation
│   │   ├── otp_generator.py         # OTP generation
│   │   └── password_hasher.py       # Bcrypt for OTP codes
│   ├── external/
│   │   ├── __init__.py
│   │   └── email_sender.py          # SMTP for notifications
│   └── persistence/
│       ├── __init__.py
│       ├── database.py
│       ├── models/
│       │   ├── __init__.py
│       │   ├── invitation_model.py
│       │   ├── invitation_camera_model.py
│       │   ├── membership_model.py
│       │   └── membership_camera_model.py
│       ├── mappers/
│       │   ├── __init__.py
│       │   ├── invitation_mapper.py
│       │   └── membership_mapper.py
│       └── repositories/
│           ├── __init__.py
│           ├── invitation_repository_impl.py
│           └── membership_repository_impl.py
│
└── alembic/                         # Database migrations
    ├── env.py
    └── versions/
```

---

## Domain Layer

### Entities

#### Invitation Entity (`domain/entities/invitation.py`)

The core invitation entity with status management.

```python
class PermissionLevel(str, Enum):
    READER = "reader"     # View-only access
    EDITOR = "editor"     # Can manage camera settings

class InvitationStatus(str, Enum):
    PENDING = "pending"       # Awaiting response
    ACCEPTED = "accepted"     # Invitation accepted
    DECLINED = "declined"     # Invitation declined
    CANCELED = "canceled"     # Canceled by sender
    EXPIRED = "expired"       # Past expiration date

@dataclass
class InvitationCamera:
    camera_id: UUID
    camera_name: str              # Snapshot of camera name

@dataclass
class Invitation:
    id: UUID
    inviter_id: UUID              # Who sent the invitation
    invitee_email: str            # Who receives it
    invitee_id: Optional[UUID]    # Set when user exists
    permission_level: PermissionLevel
    status: InvitationStatus
    code_hash: str                # Bcrypt hashed 6-digit OTP
    cameras: List[InvitationCamera]  # Cameras being shared
    message: Optional[str]        # Optional personal message
    expires_at: datetime
    accepted_at: Optional[datetime]
    declined_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    def is_expired(self) -> bool
    def is_pending(self) -> bool
    def can_be_accepted(self) -> bool
    def can_be_declined(self) -> bool
    def can_be_resent(self) -> bool
    def verify_code(self, code: str) -> bool  # Bcrypt verify
    def accept(self) -> None
    def decline(self) -> None
    def cancel(self) -> None
    def mark_expired(self) -> None
    def update_code(self, code_hash: str, new_expires: datetime) -> None
```

#### Membership Entity (`domain/entities/membership.py`)

Represents an active membership (accepted invitation).

```python
@dataclass
class MembershipCamera:
    camera_id: UUID
    permission: PermissionLevel

@dataclass
class Membership:
    id: UUID
    user_id: UUID                  # The member
    owner_id: UUID                 # Camera owner who invited
    invitation_id: UUID            # Original invitation
    cameras: List[MembershipCamera]
    is_active: bool
    created_from_invitation: datetime
    created_at: datetime
    updated_at: datetime

    def remove_camera(self, camera_id: UUID) -> None
    def add_camera(self, camera_id: UUID, permission: PermissionLevel) -> None
    def update_permission(self, camera_id: UUID, permission: PermissionLevel) -> None
    def deactivate(self) -> None
    def reactivate(self) -> None
```

### Domain Exceptions (`domain/exceptions.py`)

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `InvitationNotFoundException` | 404 | Invitation not found |
| `InvitationExpiredException` | 400 | Invitation has expired |
| `InvitationAlreadyProcessedException` | 400 | Already accepted/declined |
| `InvalidInvitationCodeException` | 400 | OTP code is invalid |
| `InvitationAccessDeniedException` | 403 | Not authorized for this invitation |
| `SelfInvitationException` | 400 | Cannot invite yourself |
| `DuplicateInvitationException` | 409 | Active invitation exists |
| `CameraNotOwnedException` | 403 | Cannot share unowned camera |
| `MaxInvitationsExceededException` | 403 | Too many pending invitations |
| `MembershipNotFoundException` | 404 | Membership not found |
| `MembershipAlreadyExistsException` | 409 | User already has access |

---

## Application Layer

### Use Cases

#### 1. CreateInvitation (`application/use_cases/create_invitation.py`)

**Input:** `CreateInvitationRequest`, `inviter_id`  
**Output:** `InvitationResponse`

**Flow:**
1. Validate inviter owns all specified cameras
2. Check invitee is not the inviter (no self-invitation)
3. Check no duplicate active invitation exists
4. Check invitee doesn't already have access (membership)
5. Look up invitee by email (if exists)
6. Generate 6-digit OTP code
7. Hash OTP with bcrypt
8. Create Invitation entity with cameras
9. Set expiration (default: 7 days)
10. Send invitation email with OTP code
11. Return invitation response (without code)

**Email Template:**
```
Subject: Camera Sharing Invitation from [Inviter Name]

You've been invited to access cameras on VigileEye.

Permission Level: [READER/EDITOR]
Cameras: Camera 1, Camera 2, ...
Personal Message: [Optional message]

Your verification code: XXXXXX
This code expires on [Date].

To accept, enter the code in the VigileEye app.
```

---

#### 2. AcceptInvitation (`application/use_cases/accept_invitation.py`)

**Input:** `invitation_id`, `otp_code`, `user_id`  
**Output:** `MembershipResponse`

**Flow:**
1. Find invitation by ID
2. Check user is the invitee
3. Check invitation is pending and not expired
4. Verify OTP code (bcrypt compare)
5. Mark invitation as accepted
6. Create Membership entity
7. Create camera access records for each camera
8. Send acceptance notification to inviter
9. Return membership response

---

#### 3. DeclineInvitation (`application/use_cases/decline_invitation.py`)

**Input:** `invitation_id`, `user_id`  
**Output:** `MessageResponse`

**Flow:**
1. Find invitation by ID
2. Check user is the invitee
3. Check invitation can be declined
4. Mark invitation as declined
5. Optionally notify inviter
6. Return success message

---

#### 4. ListReceivedInvitations (`application/use_cases/list_received_invitations.py`)

**Input:** `user_id`, `filters` (status, pagination)  
**Output:** `InvitationListResponse`

**Flow:**
1. Find all invitations where invitee matches user
2. Apply status filter (pending, all, etc.)
3. Apply pagination
4. Mark expired invitations
5. Return list with metadata

---

#### 5. ListSentInvitations (`application/use_cases/list_sent_invitations.py`)

**Input:** `user_id`, `filters` (status, pagination)  
**Output:** `InvitationListResponse`

**Flow:**
1. Find all invitations where inviter matches user
2. Apply status filter
3. Apply pagination
4. Mark expired invitations
5. Return list with metadata

---

#### 6. ResendInvitationCode (`application/use_cases/resend_invitation_code.py`)

**Input:** `invitation_id`, `user_id`  
**Output:** `MessageResponse`

**Flow:**
1. Find invitation by ID
2. Check user is the inviter
3. Check invitation can be resent (pending, not too many resends)
4. Generate new OTP code
5. Hash with bcrypt
6. Update invitation code and expiration
7. Send new email with code
8. Return success message

---

### DTOs

#### Request DTOs (`application/dtos/invitation_requests.py`)

```python
class CreateInvitationRequest(BaseModel):
    invitee_email: EmailStr
    camera_ids: List[UUID]            # 1+ cameras to share
    permission_level: PermissionLevel
    message: Optional[str]            # max 500 chars
    expires_in_days: int = 7          # 1-30 days

class AcceptInvitationRequest(BaseModel):
    code: str                         # 6-digit OTP

class InvitationFilterParams(BaseModel):
    status: Optional[InvitationStatus]
    page: int = 1
    limit: int = 20
```

#### Response DTOs (`application/dtos/invitation_responses.py`)

```python
class CameraInfo(BaseModel):
    camera_id: UUID
    camera_name: str

class InvitationResponse(BaseModel):
    id: UUID
    inviter_id: UUID
    inviter_email: Optional[str]      # Included for invitee
    invitee_email: str
    invitee_id: Optional[UUID]
    permission_level: PermissionLevel
    status: InvitationStatus
    cameras: List[CameraInfo]
    message: Optional[str]
    expires_at: datetime
    accepted_at: Optional[datetime]
    declined_at: Optional[datetime]
    created_at: datetime

class InvitationListResponse(BaseModel):
    invitations: List[InvitationResponse]
    total: int
    page: int
    limit: int
    has_more: bool

class MembershipCameraInfo(BaseModel):
    camera_id: UUID
    camera_name: str
    permission: PermissionLevel

class MembershipResponse(BaseModel):
    id: UUID
    user_id: UUID
    owner_id: UUID
    owner_email: str
    cameras: List[MembershipCameraInfo]
    is_active: bool
    created_at: datetime

class MembershipListResponse(BaseModel):
    memberships: List[MembershipResponse]
    total: int
    page: int
    limit: int

class MessageResponse(BaseModel):
    message: str
    success: bool = True
```

---

## API Layer

### Members Routes (`api/routes/members_routes.py`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/members/invitations` | ✓ | Create invitation |
| `GET` | `/members/invitations/received` | ✓ | List received invitations |
| `GET` | `/members/invitations/sent` | ✓ | List sent invitations |
| `POST` | `/members/invitations/{id}/accept` | ✓ | Accept with OTP |
| `POST` | `/members/invitations/{id}/decline` | ✓ | Decline invitation |
| `POST` | `/members/invitations/{id}/resend` | ✓ | Resend OTP code |

### Request/Response Examples

#### Create Invitation

```http
POST /api/v1/members/invitations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "invitee_email": "friend@example.com",
  "camera_ids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "permission_level": "reader",
  "message": "Here's access to my home cameras!",
  "expires_in_days": 7
}
```

**Response (201 Created):**
```json
{
  "id": "invitation-uuid",
  "inviter_id": "your-user-uuid",
  "invitee_email": "friend@example.com",
  "permission_level": "reader",
  "status": "pending",
  "cameras": [
    {"camera_id": "...", "camera_name": "Front Door"},
    {"camera_id": "...", "camera_name": "Back Yard"}
  ],
  "message": "Here's access to my home cameras!",
  "expires_at": "2024-01-22T10:30:00Z",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Accept Invitation

```http
POST /api/v1/members/invitations/{invitation_id}/accept
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

**Response (200 OK):**
```json
{
  "id": "membership-uuid",
  "user_id": "invitee-user-uuid",
  "owner_id": "inviter-user-uuid",
  "owner_email": "owner@example.com",
  "cameras": [
    {"camera_id": "...", "camera_name": "Front Door", "permission": "reader"},
    {"camera_id": "...", "camera_name": "Back Yard", "permission": "reader"}
  ],
  "is_active": true,
  "created_at": "2024-01-15T12:00:00Z"
}
```

#### List Received Invitations

```http
GET /api/v1/members/invitations/received?status=pending&page=1&limit=10
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "invitations": [
    {
      "id": "invitation-uuid",
      "inviter_email": "owner@example.com",
      "invitee_email": "you@example.com",
      "permission_level": "reader",
      "status": "pending",
      "cameras": [...],
      "message": "Check out my cameras!",
      "expires_at": "2024-01-22T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "has_more": false
}
```

---

## Infrastructure Layer

### Configuration (`infrastructure/config/settings.py`)

| Setting | Default | Environment Variable |
|---------|---------|---------------------|
| `database_url` | PostgreSQL | `DATABASE_URL` |
| `jwt_secret_key` | - | `JWT_SECRET_KEY` |
| `jwt_algorithm` | HS256 | `JWT_ALGORITHM` |
| `invitation_expire_days` | 7 | `INVITATION_EXPIRE_DAYS` |
| `max_invitation_resends` | 3 | `MAX_INVITATION_RESENDS` |
| `otp_length` | 6 | `OTP_LENGTH` |
| `smtp_host` | smtp.gmail.com | `SMTP_HOST` |
| `smtp_port` | 587 | `SMTP_PORT` |
| `smtp_username` | - | `SMTP_USERNAME` |
| `smtp_password` | - | `SMTP_PASSWORD` |

### Security Components

#### OTP Generator (`infrastructure/security/otp_generator.py`)

```python
class OTPGenerator:
    @staticmethod
    def generate(length: int = 6) -> str:
        """Generate cryptographically secure numeric OTP"""
        return ''.join(secrets.choice('0123456789') for _ in range(length))
```

#### Password Hasher (`infrastructure/security/password_hasher.py`)

```python
class PasswordHasher:
    ROUNDS = 12
    
    @staticmethod
    def hash(value: str) -> str:
        """Hash OTP code with bcrypt"""
        return bcrypt.hashpw(value.encode(), bcrypt.gensalt(ROUNDS)).decode()
    
    @staticmethod
    def verify(plain: str, hashed: str) -> bool:
        """Verify OTP code against hash"""
        return bcrypt.checkpw(plain.encode(), hashed.encode())
```

### Email Sender (`infrastructure/external/email_sender.py`)

```python
class EmailSender:
    def send_invitation(
        self,
        to_email: str,
        inviter_name: str,
        cameras: List[str],
        permission: str,
        otp_code: str,
        expires_at: datetime,
        message: Optional[str]
    ) -> bool

    def send_invitation_accepted(
        self,
        to_email: str,
        invitee_name: str,
        cameras: List[str]
    ) -> bool

    def send_invitation_declined(
        self,
        to_email: str,
        invitee_name: str
    ) -> bool
```

### Database Models

#### InvitationModel (`infrastructure/persistence/models/invitation_model.py`)

```sql
Table: invitations
- id: UUID (PK)
- inviter_id: UUID NOT NULL INDEXED
- invitee_email: VARCHAR(255) NOT NULL INDEXED
- invitee_id: UUID INDEXED
- permission_level: ENUM('reader', 'editor') NOT NULL
- status: ENUM('pending', 'accepted', 'declined', 'canceled', 'expired')
- code_hash: VARCHAR(255) NOT NULL    -- Bcrypt hashed OTP
- message: TEXT
- resend_count: INTEGER DEFAULT 0
- expires_at: TIMESTAMP NOT NULL
- accepted_at: TIMESTAMP
- declined_at: TIMESTAMP
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL

INDEX(inviter_id, status)
INDEX(invitee_email, status)
```

#### InvitationCameraModel (`infrastructure/persistence/models/invitation_camera_model.py`)

```sql
Table: invitation_cameras
- id: UUID (PK)
- invitation_id: UUID (FK -> invitations.id) ON DELETE CASCADE
- camera_id: UUID NOT NULL
- camera_name: VARCHAR(100) NOT NULL  -- Snapshot at invitation time
- created_at: TIMESTAMP NOT NULL

UNIQUE(invitation_id, camera_id)
```

#### MembershipModel (`infrastructure/persistence/models/membership_model.py`)

```sql
Table: memberships
- id: UUID (PK)
- user_id: UUID NOT NULL INDEXED
- owner_id: UUID NOT NULL INDEXED
- invitation_id: UUID (FK -> invitations.id)
- is_active: BOOLEAN DEFAULT TRUE
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL

UNIQUE(user_id, owner_id)            -- One membership per owner-member pair
```

#### MembershipCameraModel (`infrastructure/persistence/models/membership_camera_model.py`)

```sql
Table: membership_cameras
- id: UUID (PK)
- membership_id: UUID (FK -> memberships.id) ON DELETE CASCADE
- camera_id: UUID NOT NULL
- permission: ENUM('reader', 'editor') NOT NULL
- created_at: TIMESTAMP NOT NULL
- updated_at: TIMESTAMP NOT NULL

UNIQUE(membership_id, camera_id)
```

---

## Invitation Flow

### Complete Invitation Lifecycle

```
Owner                         Service                        Invitee
  │                              │                              │
  │── Create Invitation ────────>│                              │
  │   (email, cameras, perm)     │                              │
  │                              │── Validate ownership         │
  │                              │── Generate OTP               │
  │                              │── Hash OTP (bcrypt)          │
  │                              │── Create Invitation          │
  │                              │── Send Email ───────────────>│
  │<── InvitationResponse ──────│                              │
  │                              │                              │
  │                              │                              │
  │                              │<── List Received ────────────│
  │                              │── Return pending invitations │
  │                              │                              │
  │                              │                              │
  │                              │<── Accept (invitation_id, OTP)│
  │                              │── Verify OTP (bcrypt)        │
  │                              │── Create Membership          │
  │                              │── Create camera_access       │
  │<── Notification ────────────│                              │
  │                              │──────────────────────────────>│
  │                              │                      MembershipResponse
```

### State Transitions

```
                    ┌──────────────────────────┐
                    │                          │
                    ▼                          │
              ┌─────────┐                      │
   Create ───>│ PENDING │──── Resend ─────────┘
              └────┬────┘
                   │
       ┌───────────┼───────────┬───────────────┐
       │           │           │               │
       ▼           ▼           ▼               ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐   ┌──────────┐
  │ACCEPTED │ │DECLINED │ │CANCELED │   │ EXPIRED  │
  └─────────┘ └─────────┘ └─────────┘   └──────────┘
       │                                      ▲
       │                                      │
       ▼                                      │
  ┌─────────────┐                    (auto after expires_at)
  │ MEMBERSHIP  │
  │  CREATED    │
  └─────────────┘
```

---

## Permission Levels

### Reader vs Editor

| Action | Reader | Editor |
|--------|--------|--------|
| View live stream | ✓ | ✓ |
| View recordings | ✓ | ✓ |
| View camera info | ✓ | ✓ |
| Download clips | ✓ | ✓ |
| Change camera name | ✗ | ✓ |
| Update stream URL | ✗ | ✓ |
| Enable/disable camera | ✗ | ✓ |
| Delete camera | ✗ | ✗ |
| Invite others | ✗ | ✗ |

### Integration with Camera Management

When an invitation is accepted:
1. Membership is created in Members Invitation service
2. `camera_access` record is created in Camera Management service
3. Permission level maps: `reader` → `VIEW`, `editor` → `MANAGE`

```python
# Mapping
PermissionLevel.READER -> AccessPermission.VIEW
PermissionLevel.EDITOR -> AccessPermission.MANAGE
```

---

## Security Considerations

### OTP Security

| Aspect | Implementation |
|--------|---------------|
| Generation | `secrets.choice()` - cryptographically secure |
| Length | 6 digits (1,000,000 combinations) |
| Storage | Bcrypt hashed (12 rounds) |
| Verification | Timing-safe comparison via bcrypt |
| Expiration | 7 days by default |
| Rate Limiting | Max 3 resends per invitation |

### Access Control

```python
# Creating invitation - must own all cameras
for camera_id in request.camera_ids:
    camera = camera_repo.get_by_id(camera_id)
    if camera.owner_id != inviter_id:
        raise CameraNotOwnedException(camera_id)

# Accepting invitation - must be the invitee
if invitation.invitee_email != current_user.email:
    raise InvitationAccessDeniedException()

# Resending code - must be the inviter
if invitation.inviter_id != current_user.id:
    raise InvitationAccessDeniedException()
```

### Preventing Abuse

- Cannot invite yourself
- Cannot create duplicate pending invitations
- Cannot accept expired invitations
- Max 3 code resends per invitation
- Invitations expire after 7 days

---

## Integration with Other Services

### With Auth Service
- Validates JWT tokens using shared secret
- Looks up user info for notifications

### With Camera Management Service
- Validates camera ownership during invitation
- Creates `camera_access` records on acceptance
- Queries camera names for invitation display

**Option 1: Shared Database**
```python
# Direct query to cameras table
camera = session.query(CameraModel).filter_by(id=camera_id).first()
```

**Option 2: API Call**
```python
# Call Camera Management API
response = await http_client.get(
    f"{CAMERA_SERVICE_URL}/cameras/{camera_id}",
    headers={"Authorization": f"Bearer {internal_token}"}
)
```

---

## Dependencies

```
# FastAPI
fastapi>=0.115.0
uvicorn[standard]>=0.32.0

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

# HTTP Client (for internal API calls)
httpx>=0.28.0
```

---

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql+pg8000://user:pass@localhost:5432/membersdb"
export JWT_SECRET_KEY="shared-secret-with-auth-service"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

## API Documentation

Once running, access:
- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc
