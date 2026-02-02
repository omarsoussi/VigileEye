# VigileEye — Product Backlog & Sprint Plan

**Project**: VigileEye Security Camera Management System  
**Architecture**: Microservices (Clean Architecture)  
**Total Sprints**: 4  
**Sprint Duration**: 2 weeks each  

---

## 🎯 Product Vision

Build a scalable, real-time security camera management system with advanced video streaming, multi-user collaboration, and comprehensive access control using microservices architecture.

---

## 📊 Technology Stack

### Backend (Python)
- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL with SQLAlchemy 2.0+ ORM
- **Migrations**: Alembic 1.13+
- **Security**: JWT (python-jose), Bcrypt, OAuth2
- **Video Processing**: OpenCV, FFmpeg, yt-dlp, streamlink
- **Communication**: WebSockets, REST APIs
- **Testing**: Pytest, pytest-asyncio
- **Validation**: Pydantic 2.10+

### Frontend (TypeScript/React)
- **Framework**: React 18.2 with TypeScript 4.9
- **Routing**: React Router DOM 6.20
- **UI/UX**: Framer Motion, Lucide React Icons
- **Mobile**: Capacitor 8.0 (iOS/Android)
- **State Management**: Context API
- **Styling**: CSS Modules

### Infrastructure
- **Containerization**: Docker (planned)
- **API Gateway**: Nginx (planned)
- **Message Queue**: RabbitMQ (planned for async tasks)

---

# 📅 SPRINT 1: Camera Management Backend

**Sprint Goal**: Implement complete camera CRUD operations with location tracking, health monitoring, and access control foundation.

**Duration**: 2 weeks (10 working days)  
**Story Points**: 34

## Sprint Description

Build the Camera Management microservice as the core infrastructure for video surveillance. This sprint establishes the foundational backend for managing camera lifecycle, configuration, status monitoring, and basic access permissions. Implements Clean Architecture with domain-driven design, full test coverage, and RESTful API endpoints.

**Technologies**: FastAPI, SQLAlchemy, PostgreSQL, Alembic, Python-jose (JWT), Bcrypt, Pydantic, Pytest

**Key Deliverables**:
- Camera CRUD API with validation
- Health monitoring system
- Database schema and migrations
- Access control foundation
- Unit & integration tests
- API documentation

---

## 📋 Sprint 1 Tasks

### 1.1 — Project Setup & Database Schema
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Initialize Camera Management microservice with Clean Architecture folder structure, configure PostgreSQL database connection, and set up Alembic migrations.

**Acceptance Criteria**:
- ✅ FastAPI project structure created (api, application, domain, infrastructure layers)
- ✅ Database connection configured with SQLAlchemy
- ✅ Environment variables setup (.env, .env.example)
- ✅ Alembic initialized with initial migration
- ✅ Requirements.txt with all dependencies

**Subtasks**:
- [x] Create project folder structure (api/, application/, domain/, infrastructure/)
- [x] Install FastAPI, SQLAlchemy, pg8000, pydantic dependencies
- [x] Configure database settings with Pydantic Settings
- [x] Initialize Alembic and create migration environment
- [x] Create .env.example with DATABASE_URL, JWT_SECRET_KEY templates
- [x] Setup main.py with FastAPI app initialization

**Technologies**: FastAPI 0.109+, SQLAlchemy 2.0.36, pg8000, Alembic 1.13+, Pydantic Settings

---

### 1.2 — Domain Layer: Camera Entity & Value Objects
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement Camera domain entity with business logic, enumerations (CameraStatus, CameraType), and CameraLocation value object. Follow domain-driven design principles.

**Acceptance Criteria**:
- ✅ Camera entity with all attributes (id, owner_user_id, name, stream_url, protocol, resolution, fps, encoding, status, type, location)
- ✅ CameraStatus enum (ONLINE, OFFLINE, DISABLED)
- ✅ CameraType enum (INDOOR, OUTDOOR, THERMAL, FISHEYE, PTZ)
- ✅ CameraLocation value object with building, floor, zone, room, GPS coordinates
- ✅ Business methods: enable(), disable(), mark_online(), mark_offline(), update_config()
- ✅ Factory method: create() with validation

**Subtasks**:
- [x] Create domain/entities/camera.py with Camera dataclass
- [x] Implement CameraStatus enum (ONLINE, OFFLINE, DISABLED)
- [x] Implement CameraType enum (INDOOR, OUTDOOR, THERMAL, FISHEYE, PTZ)
- [x] Create CameraLocation value object with GPS validation
- [x] Add enable/disable business methods
- [x] Add mark_online/mark_offline methods with timestamp update
- [x] Implement update_config method with partial updates
- [x] Add create() factory method with default status=OFFLINE

**Technologies**: Python dataclasses, typing, UUID, datetime, enum

---

### 1.3 — Domain Layer: CameraAccess & CameraHealth Entities
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement access control entity for sharing cameras and health monitoring entity for tracking camera performance metrics.

**Acceptance Criteria**:
- ✅ CameraAccess entity with camera_id, user_id, permission (VIEW/MANAGE)
- ✅ CameraPermission enum (VIEW, MANAGE)
- ✅ CameraHealth entity with latency_ms, frame_drop_rate, uptime_percentage
- ✅ Timestamp tracking (granted_at, last_heartbeat, recorded_at)

**Subtasks**:
- [x] Create domain/entities/camera_access.py
- [x] Implement CameraPermission enum (VIEW, MANAGE)
- [x] Add CameraAccess entity with granted_at timestamp
- [x] Create domain/entities/camera_health.py
- [x] Implement CameraHealth with performance metrics
- [x] Add create() factory methods for both entities

**Technologies**: Python dataclasses, enum, UUID, datetime

---

### 1.4 — Domain Layer: Repository Interfaces
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Define abstract repository interfaces following Dependency Inversion Principle for Camera, CameraAccess, and CameraHealth persistence.

**Acceptance Criteria**:
- ✅ CameraRepositoryInterface with CRUD methods
- ✅ CameraAccessRepositoryInterface for permission management
- ✅ CameraHealthRepositoryInterface for health tracking
- ✅ All interfaces use ABC (Abstract Base Class)

**Subtasks**:
- [x] Create domain/repositories/camera_repository.py (CameraRepositoryInterface)
- [x] Add methods: find_by_id, find_by_owner, save, update, delete
- [x] Create domain/repositories/camera_access_repository.py
- [x] Add methods: find_by_camera, find_by_user, grant_access, revoke_access
- [x] Create domain/repositories/camera_health_repository.py
- [x] Add methods: find_latest, save, get_history

**Technologies**: Python ABC (Abstract Base Class), typing

---

### 1.5 — Infrastructure: SQLAlchemy Models & Mappers
**Priority**: Highest  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create SQLAlchemy ORM models for database persistence and mapper classes to convert between domain entities and database models.

**Acceptance Criteria**:
- ✅ CameraModel with all columns matching Camera entity
- ✅ CameraAccessModel for permissions table
- ✅ CameraHealthModel for health records table
- ✅ Proper foreign key relationships
- ✅ Indexes on owner_user_id, camera_id
- ✅ Mapper classes for entity ↔ model conversion

**Subtasks**:
- [x] Create infrastructure/persistence/models/camera_model.py
- [x] Define CameraModel with UUID primary key, enums, JSON for location
- [x] Create infrastructure/persistence/models/camera_access_model.py
- [x] Create infrastructure/persistence/models/camera_health_model.py
- [x] Add foreign key constraints (camera_id → cameras.id)
- [x] Create indexes on owner_user_id, camera_id, status
- [x] Create infrastructure/persistence/mappers/ folder
- [x] Implement CameraMapper.to_entity() and to_model()

**Technologies**: SQLAlchemy 2.0, PostgreSQL UUID, ENUM types, JSON columns

---

### 1.6 — Infrastructure: Repository Implementations
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement concrete repository classes using SQLAlchemy to handle database operations for cameras, access control, and health monitoring.

**Acceptance Criteria**:
- ✅ SQLAlchemyCameraRepository implementing CameraRepositoryInterface
- ✅ SQLAlchemyCameraAccessRepository
- ✅ SQLAlchemyCameraHealthRepository
- ✅ Proper session management
- ✅ Error handling for not found, duplicate entries
- ✅ Transaction support

**Subtasks**:
- [x] Create infrastructure/persistence/repositories/camera_repository_impl.py
- [x] Implement find_by_id with CameraNotFoundException
- [x] Implement find_by_owner returning List[Camera]
- [x] Implement save, update, delete with session commit
- [x] Create camera_access_repository_impl.py
- [x] Implement grant_access, revoke_access, find_by_camera
- [x] Create camera_health_repository_impl.py
- [x] Implement save, find_latest, get_history with date filtering

**Technologies**: SQLAlchemy Session, Query API, Exception handling

---

### 1.7 — Application Layer: Use Cases
**Priority**: Highest  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Implement all camera management use cases as independent classes following single responsibility principle.

**Acceptance Criteria**:
- ✅ CreateCameraUseCase with ownership assignment
- ✅ ListUserCamerasUseCase returning user's cameras
- ✅ GetCameraUseCase with ownership verification
- ✅ UpdateCameraUseCase with partial updates
- ✅ DeleteCameraUseCase with cascade cleanup
- ✅ ToggleCameraUseCase (Enable/Disable)
- ✅ RecordHealthUseCase for performance metrics
- ✅ Each use case validates business rules

**Subtasks**:
- [x] Create application/use_cases/create_camera.py
- [x] Validate stream_url format, assign owner_user_id
- [x] Create application/use_cases/list_user_cameras.py
- [x] Create application/use_cases/get_camera.py with ownership check
- [x] Create application/use_cases/update_camera.py
- [x] Allow partial updates (name, description, stream_url, location)
- [x] Create application/use_cases/delete_camera.py
- [x] Create application/use_cases/toggle_camera.py
- [x] Implement enable/disable camera logic
- [x] Create application/use_cases/record_health.py
- [x] Update camera.last_heartbeat, create CameraHealth record

**Technologies**: Python classes, dependency injection, business logic validation

---

### 1.8 — Application Layer: DTOs (Request/Response)
**Priority**: High  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Define Pydantic models for API request validation and response serialization.

**Acceptance Criteria**:
- ✅ CreateCameraRequest with all required fields
- ✅ UpdateCameraRequest with optional fields
- ✅ RecordHealthRequest with performance metrics
- ✅ CameraResponse with full camera details
- ✅ CameraListResponse for array responses
- ✅ HealthResponse for health metrics
- ✅ Proper validation (HttpUrl, positive integers, enums)

**Subtasks**:
- [x] Create application/dtos/camera_requests.py
- [x] Define CreateCameraRequest (name, stream_url, protocol, resolution, fps, encoding, type, location)
- [x] Define UpdateCameraRequest with Optional fields
- [x] Define RecordHealthRequest (latency_ms, frame_drop_rate, uptime_percentage)
- [x] Create application/dtos/camera_responses.py
- [x] Define CameraResponse matching Camera entity structure
- [x] Define CameraListResponse with List[CameraResponse]
- [x] Define HealthResponse with latest health data

**Technologies**: Pydantic 2.10+, BaseModel, Field validators, HttpUrl

---

### 1.9 — API Layer: FastAPI Routes
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Create RESTful API endpoints for camera operations with JWT authentication, error handling, and proper HTTP status codes.

**Acceptance Criteria**:
- ✅ POST /cameras — Create camera
- ✅ GET /cameras — List user's cameras
- ✅ GET /cameras/{camera_id} — Get camera details
- ✅ PUT /cameras/{camera_id} — Update camera
- ✅ DELETE /cameras/{camera_id} — Delete camera
- ✅ PATCH /cameras/{camera_id}/enable — Enable camera
- ✅ PATCH /cameras/{camera_id}/disable — Disable camera
- ✅ POST /cameras/{camera_id}/health — Record health metrics
- ✅ JWT authentication on all endpoints
- ✅ Ownership validation
- ✅ OpenAPI documentation

**Subtasks**:
- [x] Create api/routes/camera_routes.py with APIRouter
- [x] Implement POST /cameras endpoint
- [x] Add JWT dependency (get_current_user)
- [x] Implement GET /cameras (list user cameras)
- [x] Implement GET /cameras/{camera_id} with ownership check
- [x] Implement PUT /cameras/{camera_id}
- [x] Implement DELETE /cameras/{camera_id}
- [x] Implement PATCH /cameras/{camera_id}/enable
- [x] Implement PATCH /cameras/{camera_id}/disable
- [x] Implement POST /cameras/{camera_id}/health
- [x] Add error handling (404 Not Found, 403 Forbidden, 400 Bad Request)
- [x] Add response models to all endpoints

**Technologies**: FastAPI, APIRouter, Depends, HTTPException, status codes

---

### 1.10 — API Layer: JWT Authentication Dependencies
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement JWT validation dependencies to extract and verify access tokens from Auth service.

**Acceptance Criteria**:
- ✅ JWTHandler class for token validation
- ✅ get_current_user dependency extracting user_id and email
- ✅ HTTPBearer security scheme
- ✅ TokenExpiredException and InvalidTokenException handling
- ✅ Shared JWT_SECRET_KEY with Auth service

**Subtasks**:
- [x] Create infrastructure/security/jwt_handler.py
- [x] Implement verify_token(token) method
- [x] Validate signature, expiry, token type
- [x] Create api/dependencies/auth_deps.py
- [x] Implement get_current_user dependency
- [x] Extract token from Authorization header
- [x] Return CurrentUser(user_id, email) NamedTuple
- [x] Handle 401 Unauthorized errors

**Technologies**: python-jose, JWT, HTTPBearer, FastAPI Depends

---

### 1.11 — Database Migrations
**Priority**: Highest  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Create Alembic migration scripts for cameras, camera_access, and camera_health tables.

**Acceptance Criteria**:
- ✅ Migration creates cameras table with all columns
- ✅ Migration creates camera_access table
- ✅ Migration creates camera_health table
- ✅ Foreign key constraints added
- ✅ Indexes created for performance
- ✅ Downgrade scripts working

**Subtasks**:
- [x] Run `alembic revision --autogenerate -m "Create camera tables"`
- [x] Review generated migration script
- [x] Add indexes on owner_user_id, status, camera_id
- [x] Test migration: alembic upgrade head
- [x] Test rollback: alembic downgrade -1
- [x] Commit migration to version control

**Technologies**: Alembic, PostgreSQL DDL, SQL migrations

---

### 1.12 — Unit Tests: Domain Layer
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Write comprehensive unit tests for domain entities, value objects, and business logic.

**Acceptance Criteria**:
- ✅ Test Camera entity methods (enable, disable, mark_online, update_config)
- ✅ Test CameraLocation validation
- ✅ Test CameraAccess creation
- ✅ Test CameraHealth creation
- ✅ Test enum values
- ✅ 80%+ code coverage on domain layer

**Subtasks**:
- [x] Create tests/unit/test_camera_entity.py
- [x] Test camera creation with factory method
- [x] Test enable/disable status changes
- [x] Test mark_online updates last_heartbeat
- [x] Test update_config partial updates
- [x] Create tests/unit/test_camera_location.py
- [x] Test GPS coordinate validation
- [x] Create tests/unit/test_camera_access.py
- [x] Create tests/unit/test_camera_health.py

**Technologies**: Pytest, unittest.mock, datetime mocking

---

### 1.13 — Integration Tests: API Endpoints
**Priority**: High  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Write integration tests for all API endpoints using TestClient with in-memory SQLite database.

**Acceptance Criteria**:
- ✅ Test POST /cameras creates camera in database
- ✅ Test GET /cameras returns user's cameras only
- ✅ Test GET /cameras/{id} with ownership validation
- ✅ Test PUT /cameras/{id} updates camera
- ✅ Test DELETE /cameras/{id} removes camera
- ✅ Test enable/disable endpoints
- ✅ Test health recording endpoint
- ✅ Test 401/403/404 error scenarios
- ✅ Test JWT authentication

**Subtasks**:
- [x] Create tests/integration/test_camera_api.py
- [x] Setup test database fixture with SQLite
- [x] Create mock JWT tokens for authentication
- [x] Test camera creation endpoint (POST /cameras)
- [x] Test list cameras endpoint (GET /cameras)
- [x] Test get camera by ID (GET /cameras/{id})
- [x] Test update camera (PUT /cameras/{id})
- [x] Test delete camera (DELETE /cameras/{id})
- [x] Test enable/disable endpoints
- [x] Test health recording (POST /cameras/{id}/health)
- [x] Test ownership validation (403 Forbidden)
- [x] Test non-existent camera (404 Not Found)

**Technologies**: Pytest, FastAPI TestClient, SQLite, pytest fixtures

---

### 1.14 — Frontend: Camera Management Pages
**Priority**: High  
**Story Points**: 8  
**Duration**: 3 days  
**Assignee**: Frontend Developer  

**Description**: Build React components for camera CRUD operations with TypeScript, responsive design, and API integration.

**Acceptance Criteria**:
- ✅ MyCamerasPage with camera list/grid view
- ✅ Create camera modal/form with validation
- ✅ Edit camera modal with pre-filled data
- ✅ Delete camera confirmation dialog
- ✅ Camera detail view with health metrics
- ✅ Enable/disable toggle switch
- ✅ Location display (building, floor, zone)
- ✅ Real-time status indicators (online/offline/disabled)
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Error handling and loading states

**Subtasks**:
- [x] Create src/pages/MyCamerasPageNew.tsx
- [x] Implement camera grid with status badges
- [x] Add create camera button and modal
- [x] Create CameraForm component with validation
- [x] Implement stream_url input with protocol selector
- [x] Add location fields (building, floor, zone, room)
- [x] Create camera card component with actions menu
- [x] Implement edit camera modal
- [x] Add delete confirmation dialog
- [x] Create enable/disable toggle with API call
- [x] Add camera detail view page
- [x] Display health metrics (latency, frame drops, uptime)
- [x] Implement responsive grid (1 col mobile, 2 tablet, 3 desktop)
- [x] Add loading spinners and error messages
- [x] Create src/services/api.ts camera service methods
- [x] Implement API calls: createCamera, getCameras, updateCamera, deleteCamera

**Technologies**: React 18, TypeScript, React Router, Lucide Icons, CSS Modules, Fetch API

---

### 1.15 — Documentation & Deployment Prep
**Priority**: Medium  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Write API documentation, README, and prepare deployment configuration.

**Acceptance Criteria**:
- ✅ README.md with setup instructions
- ✅ API documentation (OpenAPI/Swagger auto-generated)
- ✅ Environment variables documented
- ✅ Database setup instructions
- ✅ Alembic migration guide

**Subtasks**:
- [x] Create comprehensive README.md
- [x] Document all environment variables
- [x] Add database setup instructions
- [x] Document API endpoints with examples
- [x] Add Alembic migration commands
- [x] Create .env.example with all variables

**Technologies**: Markdown, OpenAPI/Swagger UI (FastAPI auto-generated)

---

# 📅 SPRINT 2: Authentication Backend

**Sprint Goal**: Build secure user authentication system with 2FA, email verification, password reset, OAuth integration, and JWT token management.

**Duration**: 2 weeks (10 working days)  
**Story Points**: 40

## Sprint Description

Develop the Authentication microservice as the security foundation for the entire system. Implements user registration with email OTP verification, multi-factor authentication (2FA) for login, password reset flow, Google OAuth integration, and JWT-based session management. Follows Clean Architecture with comprehensive security best practices including bcrypt password hashing, account lockout after failed attempts, and token refresh mechanisms.

**Technologies**: FastAPI, SQLAlchemy, PostgreSQL, Alembic, Python-jose (JWT), Bcrypt, Authlib (OAuth), SMTP (email), Pyotp, Pydantic, Pytest

**Key Deliverables**:
- User registration with email verification
- 2FA login with OTP codes
- Password reset flow
- Google OAuth integration
- JWT access/refresh token system
- Account lockout mechanism
- Email service integration
- Comprehensive test suite
- Frontend auth pages

---

## 📋 Sprint 2 Tasks

### 2.1 — Project Setup & Database Schema
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Initialize Auth microservice with Clean Architecture structure, configure database, and setup dependencies.

**Acceptance Criteria**:
- ✅ FastAPI project structure (api, application, domain, infrastructure)
- ✅ SQLAlchemy database configuration
- ✅ Alembic migration environment
- ✅ All security dependencies installed
- ✅ Environment variables configured

**Subtasks**:
- [x] Create Backend/ folder with clean architecture structure
- [x] Install dependencies: fastapi, sqlalchemy, bcrypt, python-jose, authlib, pyotp
- [x] Configure infrastructure/config/settings.py with Pydantic Settings
- [x] Setup database connection (PostgreSQL via pg8000)
- [x] Initialize Alembic for migrations
- [x] Create .env.example with JWT_SECRET_KEY, DATABASE_URL, SMTP settings
- [x] Setup main.py with CORS, routers

**Technologies**: FastAPI 0.115+, SQLAlchemy 2.0.36, Alembic, Pydantic Settings

---

### 2.2 — Domain Layer: User Entity
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement User domain entity with business logic for account management, email verification, login attempts, and lockout mechanisms.

**Acceptance Criteria**:
- ✅ User entity with email, username, password_hash, is_verified
- ✅ failed_login_attempts and lockout_until tracking
- ✅ google_id for OAuth integration
- ✅ Business methods: is_locked(), verify_email(), update_password()
- ✅ increment_failed_attempts() and reset_failed_attempts()
- ✅ lock_account() and unlock_account() methods
- ✅ update_last_login() timestamp tracking

**Subtasks**:
- [x] Create domain/entities/user.py with User dataclass
- [x] Add attributes: email, username, password_hash, is_verified, google_id
- [x] Add failed_login_attempts, lockout_until, last_login
- [x] Add created_at, updated_at timestamps
- [x] Implement is_locked() checking lockout_until against current time
- [x] Implement verify_email() setting is_verified=True
- [x] Implement increment_failed_attempts() incrementing counter
- [x] Implement reset_failed_attempts() resetting counter and lockout
- [x] Implement lock_account(until: datetime) method
- [x] Implement unlock_account() method
- [x] Implement update_last_login() updating timestamp
- [x] Implement update_password(hash: str) method

**Technologies**: Python dataclasses, datetime, UUID, typing

---

### 2.3 — Domain Layer: OTP Entity
**Priority**: Highest  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create OTP (One-Time Password) entity for email verification, 2FA login, and password reset with expiry logic.

**Acceptance Criteria**:
- ✅ OTP entity with user_id, code, purpose, expires_at, is_used
- ✅ OTPPurpose enum (EMAIL_VERIFICATION, LOGIN_2FA, PASSWORD_RESET)
- ✅ is_expired() method checking expiry
- ✅ is_valid() checking both expiry and usage
- ✅ mark_as_used() method
- ✅ create() factory method with configurable expiry

**Subtasks**:
- [x] Create domain/entities/otp.py with OTP dataclass
- [x] Create OTPPurpose enum (EMAIL_VERIFICATION, LOGIN_2FA, PASSWORD_RESET)
- [x] Add attributes: user_id, code, purpose, expires_at, is_used, created_at
- [x] Implement is_expired() checking current time vs expires_at
- [x] Implement is_valid() returning not expired AND not used
- [x] Implement mark_as_used() setting is_used=True
- [x] Add create() factory with default 5-minute expiry
- [x] Handle timezone-aware datetime comparisons

**Technologies**: Python dataclasses, enum, datetime with timezone, UUID

---

### 2.4 — Domain Layer: Value Objects
**Priority**: High  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create immutable value objects for Email and Password with validation logic.

**Acceptance Criteria**:
- ✅ Email value object with regex validation
- ✅ Password value object with strength validation
- ✅ Frozen dataclasses (immutable)
- ✅ Raises InvalidEmailException, InvalidPasswordException
- ✅ Password requirements: min 8 chars, uppercase, lowercase, digit, special char

**Subtasks**:
- [x] Create domain/value_objects/email.py
- [x] Create Email frozen dataclass with value: str
- [x] Add validate() method with regex (RFC 5322)
- [x] Raise InvalidEmailException for invalid format
- [x] Create domain/value_objects/password.py
- [x] Create Password frozen dataclass
- [x] Add validate() checking length >= 8
- [x] Check for uppercase, lowercase, digit, special character
- [x] Raise InvalidPasswordException with specific message

**Technologies**: Python dataclasses (frozen=True), regex, custom exceptions

---

### 2.5 — Domain Layer: Repository Interfaces
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Define abstract repository interfaces for User and OTP persistence.

**Acceptance Criteria**:
- ✅ UserRepositoryInterface with CRUD and query methods
- ✅ OTPRepositoryInterface with find and invalidate methods
- ✅ All methods properly typed with return types
- ✅ Using ABC for interface enforcement

**Subtasks**:
- [x] Create domain/repositories/user_repository.py (UserRepositoryInterface)
- [x] Add methods: find_by_id, find_by_email, find_by_google_id, save, update, delete
- [x] Create domain/repositories/otp_repository.py (OTPRepositoryInterface)
- [x] Add methods: find_valid_otp(user_id, purpose), save, invalidate_all(user_id, purpose)

**Technologies**: Python ABC, typing (Optional, List)

---

### 2.6 — Infrastructure: SQLAlchemy Models
**Priority**: Highest  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create ORM models for users and otps tables with proper constraints and relationships.

**Acceptance Criteria**:
- ✅ UserModel with all user attributes
- ✅ OTPModel with foreign key to UserModel
- ✅ Unique constraints on email, username
- ✅ Indexes for performance
- ✅ Proper column types (UUID, String, Boolean, DateTime, Integer)

**Subtasks**:
- [x] Create infrastructure/persistence/models/user_model.py
- [x] Define UserModel with UUID primary key
- [x] Add unique constraints on email, username
- [x] Add columns: password_hash, is_verified, failed_login_attempts, lockout_until
- [x] Add google_id column (nullable)
- [x] Add created_at, updated_at with server defaults
- [x] Create infrastructure/persistence/models/otp_model.py
- [x] Define OTPModel with UUID primary key
- [x] Add foreign key to users.id
- [x] Add purpose enum column
- [x] Add is_used, expires_at, created_at columns
- [x] Create index on (user_id, purpose, is_used)

**Technologies**: SQLAlchemy, PostgreSQL UUID, ENUM, DateTime, unique constraints

---

### 2.7 — Infrastructure: Repository Implementations
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement concrete repositories with SQLAlchemy for database operations.

**Acceptance Criteria**:
- ✅ SQLAlchemyUserRepository with all CRUD operations
- ✅ SQLAlchemyOTPRepository with OTP management
- ✅ Proper entity ↔ model mapping
- ✅ Transaction management
- ✅ Error handling (not found, duplicate)

**Subtasks**:
- [x] Create infrastructure/persistence/repositories/user_repository_impl.py
- [x] Implement find_by_id, find_by_email, find_by_google_id
- [x] Implement save, update (merge and commit)
- [x] Add UserMapper for entity ↔ model conversion
- [x] Create infrastructure/persistence/repositories/otp_repository_impl.py
- [x] Implement find_valid_otp querying by user_id, purpose, not is_used, not expired
- [x] Implement save(otp) creating new OTP record
- [x] Implement invalidate_all marking all user's OTPs as used
- [x] Create infrastructure/persistence/mappers/user_mapper.py
- [x] Create infrastructure/persistence/mappers/otp_mapper.py

**Technologies**: SQLAlchemy Session, Query filtering, joins, mappers

---

### 2.8 — Infrastructure: Security Utilities
**Priority**: Highest  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement password hashing, JWT token handling, and OTP generation utilities.

**Acceptance Criteria**:
- ✅ PasswordHasher with bcrypt (hash, verify methods)
- ✅ JWTHandler (create_access_token, create_refresh_token, verify_token)
- ✅ OTPGenerator generating secure 6-digit codes
- ✅ Token expiry handling
- ✅ TokenExpiredException, InvalidTokenException

**Subtasks**:
- [x] Create infrastructure/security/password_hasher.py
- [x] Implement hash(password) using bcrypt with 12 rounds
- [x] Implement verify(plain, hashed) returning bool
- [x] Create infrastructure/security/jwt_handler.py
- [x] Implement create_access_token(user_id, email) with 15min expiry
- [x] Implement create_refresh_token(user_id) with 7 day expiry
- [x] Implement verify_token(token, type) validating signature and expiry
- [x] Implement get_user_id_from_token(token)
- [x] Create infrastructure/security/otp_generator.py
- [x] Implement generate(length=6) using secrets module
- [x] Generate cryptographically secure random digits

**Technologies**: Bcrypt, python-jose (JWT), secrets module, datetime timedelta

---

### 2.9 — Infrastructure: Email Service
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement SMTP email sender for OTP delivery with templating.

**Acceptance Criteria**:
- ✅ EmailSenderInterface with abstract methods
- ✅ SMTPEmailSender implementation using smtplib
- ✅ MockEmailSender for testing
- ✅ send_verification_otp, send_login_otp, send_password_reset_otp methods
- ✅ HTML email templates
- ✅ Environment configuration for SMTP

**Subtasks**:
- [x] Create infrastructure/external/email_sender.py
- [x] Define EmailSenderInterface ABC
- [x] Create SMTPEmailSender class
- [x] Configure SMTP host, port, username, password from env
- [x] Implement send_verification_otp with HTML template
- [x] Implement send_login_otp with HTML template
- [x] Implement send_password_reset_otp with HTML template
- [x] Create MockEmailSender logging to console for dev/test
- [x] Add get_email_sender() factory function

**Technologies**: smtplib (Python standard library), email.mime, HTML templates

---

### 2.10 — Infrastructure: Google OAuth Client
**Priority**: Medium  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Integrate Google OAuth for social login using Authlib.

**Acceptance Criteria**:
- ✅ GoogleOAuthClient with OAuth2 flow
- ✅ get_authorization_url() generating OAuth URL
- ✅ get_user_info(code) exchanging code for user data
- ✅ GoogleUser dataclass with id, email, name, picture
- ✅ Environment configuration (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

**Subtasks**:
- [x] Create infrastructure/external/google_oauth.py
- [x] Install authlib library
- [x] Create GoogleOAuthClient class
- [x] Configure OAuth2 with Google endpoints
- [x] Implement get_authorization_url() with state parameter
- [x] Implement get_user_info(code) exchanging authorization code
- [x] Parse user info (id, email, name, picture)
- [x] Create GoogleUser dataclass
- [x] Add error handling for invalid codes

**Technologies**: Authlib, OAuth2, httpx, Google OAuth2 API

---

### 2.11 — Application Layer: Use Cases (Registration & Verification)
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement user registration and email verification use cases.

**Acceptance Criteria**:
- ✅ RegisterUserUseCase creating user, generating OTP, sending email
- ✅ VerifyEmailUseCase validating OTP and marking user verified
- ✅ Password hashing before storage
- ✅ Duplicate email/username detection
- ✅ OTP expiry validation

**Subtasks**:
- [x] Create application/use_cases/register_user.py
- [x] Validate email format using Email value object
- [x] Validate password strength using Password value object
- [x] Hash password with PasswordHasher
- [x] Check for duplicate email/username
- [x] Create User entity with is_verified=False
- [x] Save user to repository
- [x] Generate 6-digit OTP with OTPGenerator
- [x] Save OTP with purpose=EMAIL_VERIFICATION
- [x] Send verification email with EmailSender
- [x] Create application/use_cases/verify_email.py
- [x] Find user by email
- [x] Find valid OTP for EMAIL_VERIFICATION
- [x] Check OTP code matches
- [x] Mark OTP as used
- [x] Call user.verify_email()
- [x] Update user in repository

**Technologies**: Use case pattern, dependency injection, business logic

---

### 2.12 — Application Layer: Use Cases (Login & 2FA)
**Priority**: Highest  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Implement two-step login process with credential validation and OTP confirmation.

**Acceptance Criteria**:
- ✅ LoginUserUseCase validating credentials, sending 2FA OTP
- ✅ ConfirmLoginUseCase validating OTP, issuing JWT tokens
- ✅ Account lockout after 5 failed attempts
- ✅ Failed attempt tracking
- ✅ Token pair generation (access + refresh)

**Subtasks**:
- [x] Create application/use_cases/login_user.py
- [x] Find user by email
- [x] Check if account is locked (user.is_locked())
- [x] Verify password with PasswordHasher.verify()
- [x] If password wrong: increment failed attempts
- [x] Lock account after 5 failed attempts (30 min lockout)
- [x] If password correct: reset failed attempts
- [x] Check user.is_verified
- [x] Generate 6-digit OTP for LOGIN_2FA
- [x] Send login OTP via email
- [x] Create application/use_cases/confirm_login.py
- [x] Find user by email
- [x] Find valid OTP for LOGIN_2FA
- [x] Validate OTP code
- [x] Mark OTP as used
- [x] Update user.last_login
- [x] Create JWT token pair with JWTHandler
- [x] Return access_token, refresh_token, token_type="bearer"

**Technologies**: Business logic, password verification, JWT generation, OTP validation

---

### 2.13 — Application Layer: Use Cases (Password Reset)
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement forgot password and reset password flows with OTP validation.

**Acceptance Criteria**:
- ✅ ForgotPasswordUseCase generating reset OTP
- ✅ ResetPasswordUseCase validating OTP and updating password
- ✅ Password strength validation
- ✅ OTP expiry enforcement

**Subtasks**:
- [x] Create application/use_cases/forgot_password.py
- [x] Find user by email
- [x] Generate 6-digit OTP for PASSWORD_RESET
- [x] Save OTP with 10-minute expiry
- [x] Send password reset email with OTP
- [x] Create application/use_cases/reset_password.py
- [x] Find user by email
- [x] Find valid OTP for PASSWORD_RESET purpose
- [x] Validate OTP code
- [x] Validate new password strength
- [x] Hash new password
- [x] Call user.update_password(hash)
- [x] Mark OTP as used
- [x] Update user in repository

**Technologies**: OTP validation, password hashing, email delivery

---

### 2.14 — Application Layer: Use Cases (OAuth & Token Refresh)
**Priority**: Medium  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement Google OAuth authentication and refresh token use cases.

**Acceptance Criteria**:
- ✅ GoogleOAuthUseCase handling OAuth callback, creating/finding user
- ✅ RefreshTokenUseCase validating refresh token and issuing new access token
- ✅ Auto-verified OAuth users
- ✅ Linking Google account to existing users

**Subtasks**:
- [x] Create application/use_cases/google_oauth.py
- [x] Call GoogleOAuthClient.get_user_info(code)
- [x] Find user by google_id
- [x] If not found, find by email
- [x] If found by email: link google_id to existing user
- [x] If not found: create new user (auto-verified, no password)
- [x] Generate JWT token pair
- [x] Create application/use_cases/refresh_token.py
- [x] Verify refresh token with JWTHandler
- [x] Extract user_id from token
- [x] Find user by ID
- [x] Generate new access token
- [x] Return new token pair

**Technologies**: OAuth2 flow, JWT refresh, user linking logic

---

### 2.15 — Application Layer: Auth Service & DTOs
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create facade service orchestrating use cases and define request/response DTOs.

**Acceptance Criteria**:
- ✅ AuthService with methods for all auth operations
- ✅ Request DTOs: RegisterRequest, LoginRequest, VerifyOTPRequest, etc.
- ✅ Response DTOs: TokenResponse, UserResponse, MessageResponse
- ✅ Proper validation with Pydantic

**Subtasks**:
- [x] Create application/services/auth_service.py
- [x] Implement register(email, username, password) calling RegisterUserUseCase
- [x] Implement verify_email(email, otp_code)
- [x] Implement login(email, password)
- [x] Implement confirm_login(email, otp_code)
- [x] Implement forgot_password(email)
- [x] Implement reset_password(email, otp, new_password)
- [x] Implement refresh_token(refresh_token)
- [x] Implement google_auth(code)
- [x] Create application/dtos/auth_requests.py
- [x] Define RegisterRequest, LoginRequest, VerifyOTPRequest
- [x] Define ForgotPasswordRequest, ResetPasswordRequest, RefreshTokenRequest
- [x] Create application/dtos/auth_responses.py
- [x] Define TokenResponse (access_token, refresh_token, token_type)
- [x] Define UserResponse, MessageResponse

**Technologies**: Pydantic BaseModel, EmailStr, Field validators, service pattern

---

### 2.16 — API Layer: Authentication Routes
**Priority**: Highest  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Create REST API endpoints for all authentication flows.

**Acceptance Criteria**:
- ✅ POST /auth/register — User registration
- ✅ POST /auth/verify-email — Email verification
- ✅ POST /auth/login — Credential validation (step 1)
- ✅ POST /auth/confirm-login — 2FA confirmation (step 2)
- ✅ POST /auth/forgot-password — Password reset request
- ✅ POST /auth/reset-password — Password reset confirmation
- ✅ POST /auth/refresh — Token refresh
- ✅ GET /auth/google/login — OAuth initiation
- ✅ GET /auth/google/callback — OAuth callback
- ✅ Proper HTTP status codes
- ✅ Error handling

**Subtasks**:
- [x] Create api/routes/auth_routes.py with APIRouter
- [x] Implement POST /auth/register endpoint
- [x] Return 201 Created on success
- [x] Implement POST /auth/verify-email
- [x] Implement POST /auth/login (step 1)
- [x] Return message: "OTP sent to email"
- [x] Implement POST /auth/confirm-login (step 2)
- [x] Return TokenResponse with JWT tokens
- [x] Implement POST /auth/forgot-password
- [x] Implement POST /auth/reset-password
- [x] Implement POST /auth/refresh
- [x] Implement GET /auth/google/login
- [x] Redirect to Google OAuth URL
- [x] Implement GET /auth/google/callback
- [x] Exchange code for tokens
- [x] Add error handling (400, 401, 404, 409, 500)
- [x] Mount router in main.py

**Technologies**: FastAPI, APIRouter, status codes, HTTPException, RedirectResponse

---

### 2.17 — API Layer: Protected Route Dependencies
**Priority**: High  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create reusable dependencies for protecting routes with JWT authentication.

**Acceptance Criteria**:
- ✅ get_current_user_id dependency extracting user ID from token
- ✅ get_current_user dependency returning full User entity
- ✅ get_current_active_user dependency checking is_verified
- ✅ optional_auth dependency for optional authentication
- ✅ HTTPBearer security scheme

**Subtasks**:
- [x] Create api/dependencies/auth_deps.py
- [x] Implement get_current_user_id extracting from Authorization header
- [x] Verify token with JWTHandler
- [x] Return UUID user_id
- [x] Implement get_current_user querying user from repository
- [x] Implement get_current_active_user checking is_verified
- [x] Implement optional_auth returning Optional[UUID]
- [x] Add HTTPBearer security to OpenAPI schema

**Technologies**: FastAPI Depends, HTTPBearer, Optional typing

---

### 2.18 — Database Migrations
**Priority**: Highest  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Create Alembic migrations for users and otps tables.

**Acceptance Criteria**:
- ✅ Migration creates users table with all columns
- ✅ Migration creates otps table with foreign key
- ✅ Unique constraints on email, username
- ✅ Indexes for performance
- ✅ Enum types for OTPPurpose

**Subtasks**:
- [x] Run `alembic revision --autogenerate -m "Create auth tables"`
- [x] Review migration script
- [x] Add indexes on email, google_id
- [x] Test migration: alembic upgrade head
- [x] Test rollback: alembic downgrade -1

**Technologies**: Alembic, PostgreSQL, unique constraints, indexes

---

### 2.19 — Unit Tests: Domain & Security
**Priority**: High  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Write unit tests for domain entities, value objects, and security utilities.

**Acceptance Criteria**:
- ✅ Test User entity methods
- ✅ Test OTP entity validation
- ✅ Test Email and Password value objects
- ✅ Test PasswordHasher
- ✅ Test JWTHandler
- ✅ Test OTPGenerator
- ✅ 80%+ domain layer coverage

**Subtasks**:
- [x] Create tests/unit/test_user_entity.py
- [x] Test is_locked(), verify_email(), increment_failed_attempts()
- [x] Create tests/unit/test_otp_entity.py
- [x] Test is_valid(), is_expired(), mark_as_used()
- [x] Create tests/unit/test_email.py (Email value object)
- [x] Create tests/unit/test_password.py (Password validation)
- [x] Create tests/unit/test_password_hasher.py
- [x] Test hash and verify methods
- [x] Create tests/unit/test_jwt_handler.py
- [x] Test token creation, verification, expiry
- [x] Create tests/unit/test_otp_generator.py
- [x] Test OTP format and randomness

**Technologies**: Pytest, unittest.mock, freezegun (datetime mocking)

---

### 2.20 — Integration Tests: Auth API
**Priority**: High  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Write end-to-end integration tests for all authentication flows.

**Acceptance Criteria**:
- ✅ Test complete registration flow
- ✅ Test email verification flow
- ✅ Test 2FA login flow
- ✅ Test password reset flow
- ✅ Test token refresh
- ✅ Test account lockout
- ✅ Test OAuth flow (mocked)
- ✅ Test error scenarios

**Subtasks**:
- [x] Create tests/integration/test_auth_api.py
- [x] Setup test database fixture
- [x] Test POST /auth/register creates user
- [x] Test POST /auth/verify-email with valid OTP
- [x] Test POST /auth/login sends OTP
- [x] Test POST /auth/confirm-login with valid OTP returns tokens
- [x] Test account lockout after 5 failed login attempts
- [x] Test POST /auth/forgot-password sends reset OTP
- [x] Test POST /auth/reset-password with valid OTP
- [x] Test POST /auth/refresh with valid refresh token
- [x] Test duplicate email returns 409 Conflict
- [x] Test invalid OTP returns 400 Bad Request
- [x] Test expired OTP returns 400
- [x] Mock Google OAuth client for OAuth tests

**Technologies**: Pytest, TestClient, SQLite test DB, unittest.mock

---

### 2.21 — Frontend: Authentication Pages
**Priority**: High  
**Story Points**: 10  
**Duration**: 3 days  
**Assignee**: Frontend Developer  

**Description**: Build React authentication UI with registration, login, verification, and password reset flows.

**Acceptance Criteria**:
- ✅ RegisterPage with form validation
- ✅ VerifyOTPPage for email verification
- ✅ LoginPage with email/password
- ✅ ConfirmLoginPage for 2FA OTP
- ✅ ForgotPasswordPage with email input
- ✅ ResetPasswordPage with OTP and new password
- ✅ Google OAuth button
- ✅ AuthCallbackPage handling OAuth redirect
- ✅ Form validation and error messages
- ✅ Loading states
- ✅ Responsive design
- ✅ AuthContext for global auth state

**Subtasks**:
- [x] Create src/pages/RegisterPage.tsx
- [x] Add email, username, password fields with validation
- [x] Implement registration API call
- [x] Redirect to VerifyOTPPage on success
- [x] Create src/pages/VerifyOTPPage.tsx
- [x] Add 6-digit OTP input
- [x] Implement verify-email API call
- [x] Redirect to LoginPage on success
- [x] Create src/pages/LoginPage.tsx
- [x] Add email/password form
- [x] Add Google OAuth button
- [x] Implement login API call
- [x] Redirect to OTP confirmation on success
- [x] Create ConfirmLoginPage for 2FA OTP
- [x] Store JWT tokens in localStorage
- [x] Redirect to Dashboard on success
- [x] Create src/pages/ForgotPasswordPage.tsx
- [x] Add email input
- [x] Implement forgot-password API call
- [x] Create ResetPasswordPage with OTP + new password
- [x] Create src/pages/AuthCallbackPage.tsx
- [x] Handle OAuth callback with code parameter
- [x] Exchange code for tokens
- [x] Create src/contexts/AuthContext.tsx
- [x] Implement login, logout, register methods
- [x] Store user state and tokens
- [x] Create ProtectedRoute component
- [x] Add loading spinners and error states
- [x] Style with CSS modules (responsive)

**Technologies**: React 18, TypeScript, React Router, Context API, localStorage, Fetch API

---

### 2.22 — Documentation
**Priority**: Medium  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Document authentication flows, API endpoints, and security considerations.

**Acceptance Criteria**:
- ✅ README with setup instructions
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Authentication flow diagrams
- ✅ Environment variables documented
- ✅ Security best practices documented

**Subtasks**:
- [x] Create comprehensive README.md
- [x] Document 2FA login flow
- [x] Document password reset flow
- [x] Document OAuth flow
- [x] Add curl examples for each endpoint
- [x] Document JWT token structure
- [x] Add security considerations section

**Technologies**: Markdown, OpenAPI/Swagger auto-generated docs

---

# 📅 SPRINT 3: Members Invitation Backend

**Sprint Goal**: Build camera sharing system with invitation management, email-based approval codes, and membership access control.

**Duration**: 2 weeks (10 working days)  
**Story Points**: 32

## Sprint Description

Develop the Members Invitation microservice enabling camera owners to share access with other users through a secure invitation system. Implements email-based invitations with approval codes, permission levels (READER/EDITOR), camera selection, expiration management, and membership tracking. Integrates with Auth service for user validation and Camera service for access control.

**Technologies**: FastAPI, SQLAlchemy, PostgreSQL, Alembic, Python-jose (JWT), Bcrypt (code hashing), SMTP (email), Pydantic, Pytest

**Key Deliverables**:
- Invitation CRUD with email delivery
- Approval code generation and validation
- Membership creation on acceptance
- Permission levels (READER/EDITOR)
- Invitation expiry management
- Email notification system
- Frontend invitation UI
- Comprehensive tests

---

## 📋 Sprint 3 Tasks

### 3.1 — Project Setup & Database Schema
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Initialize Members Invitation microservice with Clean Architecture and database configuration.

**Acceptance Criteria**:
- ✅ FastAPI project structure created
- ✅ Database connection configured
- ✅ Alembic migrations initialized
- ✅ Dependencies installed
- ✅ Environment variables setup

**Subtasks**:
- [x] Create MembersInvitationBackend/ folder structure
- [x] Install dependencies: fastapi, sqlalchemy, pg8000, bcrypt, python-jose
- [x] Configure infrastructure/config/settings.py
- [x] Setup database connection
- [x] Initialize Alembic
- [x] Create .env.example with SMTP, JWT_SECRET_KEY
- [x] Setup main.py with CORS and router

**Technologies**: FastAPI 0.115+, SQLAlchemy 2.0.36, Alembic, Pydantic Settings

---

### 3.2 — Domain Layer: Invitation Entity
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement Invitation domain entity with status tracking, permission levels, and expiry logic.

**Acceptance Criteria**:
- ✅ Invitation entity with inviter_user_id, recipient_email, camera_ids
- ✅ InvitationStatus enum (PENDING, ACCEPTED, DECLINED, CANCELED, EXPIRED)
- ✅ PermissionLevel enum (READER, EDITOR)
- ✅ code_hash for approval code storage
- ✅ expires_at and unlimited flag
- ✅ is_expired() and can_accept() methods

**Subtasks**:
- [x] Create domain/entities/invitation.py
- [x] Create InvitationStatus enum
- [x] Create PermissionLevel enum (READER, EDITOR)
- [x] Add attributes: inviter_user_id, inviter_email, recipient_email
- [x] Add camera_ids: List[str], permission: PermissionLevel
- [x] Add status, code_hash, code_expires_at
- [x] Add created_at, expires_at, unlimited, handled_at
- [x] Implement is_expired(now) checking expires_at
- [x] Implement can_accept(now) checking status and expiry

**Technologies**: Python dataclasses, enum, List typing, datetime

---

### 3.3 — Domain Layer: Membership Entity
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create Membership entity representing granted camera access after invitation acceptance.

**Acceptance Criteria**:
- ✅ Membership entity with owner_user_id, member_user_id, camera_ids
- ✅ permission field (READER/EDITOR)
- ✅ revoked_at timestamp for access revocation
- ✅ is_active() method checking revoked_at

**Subtasks**:
- [x] Create domain/entities/membership.py
- [x] Add attributes: owner_user_id, member_user_id, member_email
- [x] Add camera_ids: List[str], permission: PermissionLevel
- [x] Add created_at, revoked_at timestamps
- [x] Implement is_active() returning revoked_at is None

**Technologies**: Python dataclasses, List, Optional, datetime

---

### 3.4 — Domain Layer: Repository Interfaces
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Define abstract repository interfaces for invitations and memberships.

**Acceptance Criteria**:
- ✅ InvitationRepositoryInterface with CRUD methods
- ✅ MembershipRepositoryInterface with query methods
- ✅ Methods for finding by inviter, recipient, status

**Subtasks**:
- [x] Create domain/repositories/invitation_repository.py
- [x] Add methods: find_by_id, find_by_inviter, find_by_recipient, save, update
- [x] Create domain/repositories/membership_repository.py
- [x] Add methods: find_by_id, find_by_owner, find_by_member, save, revoke

**Technologies**: Python ABC, typing (List, Optional)

---

### 3.5 — Infrastructure: SQLAlchemy Models
**Priority**: Highest  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create ORM models for invitations, memberships, and junction tables for camera associations.

**Acceptance Criteria**:
- ✅ InvitationModel with all invitation attributes
- ✅ MembershipModel with membership data
- ✅ InvitationCameraModel junction table for many-to-many
- ✅ MembershipCameraModel junction table
- ✅ Proper foreign keys and constraints

**Subtasks**:
- [x] Create infrastructure/persistence/models/invitation_model.py
- [x] Define InvitationModel with UUID primary key
- [x] Add columns: inviter_user_id, inviter_email, recipient_email
- [x] Add status enum, permission enum, code_hash, code_expires_at
- [x] Add created_at, expires_at, unlimited, handled_at
- [x] Create infrastructure/persistence/models/invitation_camera_model.py
- [x] Define junction table (invitation_id, camera_id) with composite PK
- [x] Create infrastructure/persistence/models/membership_model.py
- [x] Define MembershipModel with owner_user_id, member_user_id
- [x] Create infrastructure/persistence/models/membership_camera_model.py
- [x] Add relationships: invitation.cameras, membership.cameras

**Technologies**: SQLAlchemy, junction tables, relationship(), backref

---

### 3.6 — Infrastructure: Repository Implementations
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement concrete repositories with SQLAlchemy for database operations.

**Acceptance Criteria**:
- ✅ SQLAlchemyInvitationRepository with CRUD operations
- ✅ SQLAlchemyMembershipRepository
- ✅ Proper camera_ids list handling
- ✅ Junction table management
- ✅ Error handling

**Subtasks**:
- [x] Create infrastructure/persistence/repositories/invitation_repository_impl.py
- [x] Implement find_by_id with eager loading of cameras
- [x] Implement find_by_inviter filtering by inviter_user_id
- [x] Implement find_by_recipient filtering by recipient_email
- [x] Implement save creating invitation + junction records
- [x] Implement update modifying invitation status
- [x] Create infrastructure/persistence/repositories/membership_repository_impl.py
- [x] Implement find_by_owner, find_by_member
- [x] Implement save creating membership + camera associations
- [x] Implement revoke setting revoked_at timestamp
- [x] Create mappers for entity ↔ model conversion

**Technologies**: SQLAlchemy Session, joinedload, relationship handling

---

### 3.7 — Infrastructure: Security & Email
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement approval code generation, hashing, and email sending for invitations.

**Acceptance Criteria**:
- ✅ OTPGenerator for 6-digit approval codes
- ✅ PasswordHasher for code hashing (reuse from Auth)
- ✅ EmailSender for invitation emails
- ✅ JWTHandler for Auth token validation

**Subtasks**:
- [x] Create infrastructure/security/otp_generator.py
- [x] Implement generate(length=6) for invitation codes
- [x] Create infrastructure/security/password_hasher.py
- [x] Reuse bcrypt hashing for code_hash
- [x] Create infrastructure/external/email_sender.py
- [x] Implement send_invitation_email(recipient, code, inviter_email, cameras)
- [x] Create HTML template with code, camera list, expiry
- [x] Create infrastructure/security/jwt_handler.py
- [x] Implement verify_token for Auth service integration

**Technologies**: secrets module, bcrypt, smtplib, python-jose (JWT)

---

### 3.8 — Application Layer: Use Cases (Invitation Management)
**Priority**: Highest  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Implement use cases for creating, listing, and managing invitations.

**Acceptance Criteria**:
- ✅ CreateInvitationUseCase generating code and sending email
- ✅ ListSentInvitationsUseCase for owners
- ✅ ListReceivedInvitationsUseCase for recipients
- ✅ ResendInvitationCodeUseCase for code regeneration
- ✅ Validation: camera ownership, expiry dates, permission levels

**Subtasks**:
- [x] Create application/use_cases/create_invitation.py
- [x] Validate inviter owns cameras (future: call Camera service)
- [x] Generate 6-digit approval code
- [x] Hash code with bcrypt
- [x] Create Invitation entity with PENDING status
- [x] Set code_expires_at (24 hours)
- [x] Save invitation to repository
- [x] Send invitation email with code
- [x] Create application/use_cases/list_sent_invitations.py
- [x] Query by inviter_user_id
- [x] Create application/use_cases/list_received_invitations.py
- [x] Query by recipient_email
- [x] Create application/use_cases/resend_invitation_code.py
- [x] Find invitation by ID
- [x] Check status is PENDING
- [x] Generate new code and hash
- [x] Update code_hash and code_expires_at
- [x] Send email with new code

**Technologies**: Use case pattern, business logic, email delivery

---

### 3.9 — Application Layer: Use Cases (Invitation Actions)
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement use cases for accepting and declining invitations.

**Acceptance Criteria**:
- ✅ AcceptInvitationUseCase validating code and creating Membership
- ✅ DeclineInvitationUseCase marking invitation as declined
- ✅ Code validation with bcrypt
- ✅ Status transitions (PENDING → ACCEPTED/DECLINED)
- ✅ Membership creation on acceptance

**Subtasks**:
- [x] Create application/use_cases/accept_invitation.py
- [x] Find invitation by ID
- [x] Check can_accept() (PENDING, not expired)
- [x] Verify recipient_email matches acceptor
- [x] Verify approval code with PasswordHasher
- [x] Update invitation status to ACCEPTED, set handled_at
- [x] Create Membership entity with camera_ids, permission
- [x] Save membership to repository
- [x] Return Membership
- [x] Create application/use_cases/decline_invitation.py
- [x] Find invitation by ID
- [x] Check status is PENDING
- [x] Update status to DECLINED, set handled_at
- [x] Update invitation in repository

**Technologies**: Code verification, state transitions, entity creation

---

### 3.10 — Application Layer: DTOs
**Priority**: High  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Define Pydantic models for invitation requests and responses.

**Acceptance Criteria**:
- ✅ CreateInvitationRequest with validation
- ✅ AcceptInvitationRequest with code
- ✅ InvitationResponse with full details
- ✅ MembershipResponse
- ✅ Email validation

**Subtasks**:
- [x] Create application/dtos/invitation_requests.py
- [x] Define CreateInvitationRequest (recipient_email, camera_ids, permission, expires_at, unlimited)
- [x] Define AcceptInvitationRequest (code: str)
- [x] Create application/dtos/invitation_responses.py
- [x] Define InvitationResponse with all invitation fields
- [x] Define MembershipResponse with membership details
- [x] Define MessageResponse for success/error messages

**Technologies**: Pydantic, EmailStr, Field, datetime validation

---

### 3.11 — API Layer: Invitation Routes
**Priority**: Highest  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Create REST API endpoints for invitation management.

**Acceptance Criteria**:
- ✅ POST /invitations — Create invitation
- ✅ GET /invitations/sent — List sent invitations
- ✅ GET /invitations/received — List received invitations
- ✅ POST /invitations/{id}/accept — Accept invitation
- ✅ POST /invitations/{id}/decline — Decline invitation
- ✅ POST /invitations/{id}/resend — Resend code
- ✅ JWT authentication
- ✅ Error handling

**Subtasks**:
- [x] Create api/routes/invitation_routes.py
- [x] Implement POST /invitations with JWT auth
- [x] Extract inviter_user_id from token
- [x] Return 201 Created
- [x] Implement GET /invitations/sent
- [x] Filter by current user as inviter
- [x] Implement GET /invitations/received
- [x] Extract user email from token
- [x] Filter by recipient_email
- [x] Implement POST /invitations/{id}/accept
- [x] Validate code in request body
- [x] Return MembershipResponse
- [x] Implement POST /invitations/{id}/decline
- [x] Implement POST /invitations/{id}/resend
- [x] Add error handling (400, 401, 403, 404, 409)
- [x] Mount router in main.py

**Technologies**: FastAPI, APIRouter, status codes, HTTPException

---

### 3.12 — Database Migrations
**Priority**: Highest  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Create Alembic migrations for invitation and membership tables.

**Acceptance Criteria**:
- ✅ Migration creates invitations, memberships tables
- ✅ Junction tables created
- ✅ Foreign keys and constraints
- ✅ Indexes for performance

**Subtasks**:
- [x] Run `alembic revision --autogenerate -m "Create invitation tables"`
- [x] Review migration script
- [x] Add indexes on inviter_user_id, recipient_email, status
- [x] Test migration: alembic upgrade head
- [x] Test rollback

**Technologies**: Alembic, PostgreSQL, junction tables

---

### 3.13 — Unit Tests: Domain Layer
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Write unit tests for invitation and membership entities.

**Acceptance Criteria**:
- ✅ Test Invitation.is_expired()
- ✅ Test Invitation.can_accept()
- ✅ Test Membership.is_active()
- ✅ Test status transitions
- ✅ 80%+ domain coverage

**Subtasks**:
- [x] Create tests/unit/test_invitation_entity.py
- [x] Test is_expired with various dates
- [x] Test can_accept with different statuses
- [x] Test unlimited invitations
- [x] Create tests/unit/test_membership_entity.py
- [x] Test is_active() with/without revoked_at

**Technologies**: Pytest, freezegun, datetime mocking

---

### 3.14 — Integration Tests: Invitation API
**Priority**: High  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Write integration tests for invitation flows.

**Acceptance Criteria**:
- ✅ Test complete invitation creation flow
- ✅ Test accept invitation with valid code
- ✅ Test decline invitation
- ✅ Test resend code
- ✅ Test expired invitation rejection
- ✅ Test invalid code rejection
- ✅ Test duplicate acceptance prevention

**Subtasks**:
- [x] Create tests/integration/test_invitation_api.py
- [x] Setup test database
- [x] Test POST /invitations creates invitation + sends email
- [x] Test GET /invitations/sent returns user's invitations
- [x] Test GET /invitations/received filters by email
- [x] Test POST /invitations/{id}/accept with valid code
- [x] Test acceptance creates membership
- [x] Test POST /invitations/{id}/decline
- [x] Test POST /invitations/{id}/resend
- [x] Test expired invitation cannot be accepted
- [x] Test invalid code returns 400
- [x] Test already accepted invitation returns 400
- [x] Mock email sender

**Technologies**: Pytest, TestClient, SQLite, unittest.mock

---

### 3.15 — Frontend: Members & Invitation Pages
**Priority**: High  
**Story Points**: 9  
**Duration**: 3 days  
**Assignee**: Frontend Developer  

**Description**: Build React UI for sending invitations, viewing memberships, and managing received invitations.

**Acceptance Criteria**:
- ✅ MembersPageNew with tabs (Sent/Received/Memberships)
- ✅ Create invitation modal with camera selection
- ✅ Permission level selector (READER/EDITOR)
- ✅ Expiry date picker
- ✅ Invitation list with status badges
- ✅ Accept/decline buttons
- ✅ Approval code input modal
- ✅ Resend code functionality
- ✅ Membership list showing granted cameras
- ✅ Responsive design

**Subtasks**:
- [x] Create src/pages/MembersPageNew.tsx
- [x] Create tab navigation (Sent, Received, Memberships)
- [x] Create "Send Invitation" button and modal
- [x] Add InvitationForm component
- [x] Implement recipient email input with validation
- [x] Add camera multi-select checkboxes
- [x] Add permission radio buttons (READER/EDITOR)
- [x] Add expiry date picker (or unlimited checkbox)
- [x] Implement create invitation API call
- [x] Create SentInvitationsList component
- [x] Display invitations with status badges
- [x] Add resend code button for PENDING invitations
- [x] Create ReceivedInvitationsList component
- [x] Add Accept/Decline buttons
- [x] Create AcceptInvitationModal with code input
- [x] Implement accept/decline API calls
- [x] Create MembershipsList component
- [x] Display granted cameras and permissions
- [x] Add loading states and error handling
- [x] Style with CSS modules (responsive)
- [x] Add success/error toast notifications

**Technologies**: React 18, TypeScript, React Router, Lucide Icons, CSS Modules

---

### 3.16 — Documentation
**Priority**: Medium  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Document invitation system, API endpoints, and workflows.

**Acceptance Criteria**:
- ✅ README with setup instructions
- ✅ API documentation
- ✅ Invitation flow diagrams
- ✅ Permission levels explained

**Subtasks**:
- [x] Create README.md
- [x] Document invitation creation flow
- [x] Document acceptance/decline flow
- [x] Add API endpoint examples
- [x] Document permission levels
- [x] Add email template examples

**Technologies**: Markdown, OpenAPI/Swagger

---

# 📅 SPRINT 4: Video Streaming Backend

**Sprint Goal**: Build real-time video streaming infrastructure with WebSocket delivery, FFmpeg processing, HLS/RTSP/YouTube support, and frame broadcasting.

**Duration**: 2 weeks (10 working days)  
**Story Points**: 38

## Sprint Description

Develop the Video Streaming microservice providing real-time video delivery from various camera sources. Implements FFmpeg-based stream processing for HLS, RTSP, RTMP, YouTube URLs, and HTTP streams, with automatic stream type detection and reader selection. Features WebSocket-based frame broadcasting, session management, health monitoring, and reconnection logic for robust streaming.

**Technologies**: FastAPI, WebSockets, SQLAlchemy, PostgreSQL, OpenCV (opencv-python-headless), FFmpeg (subprocess), yt-dlp, streamlink, NumPy, asyncio, Pydantic, Pytest

**Key Deliverables**:
- Multi-protocol stream support (RTSP, HLS, YouTube, RTMP, HTTP)
- FFmpeg and OpenCV dual reader system
- WebSocket frame broadcasting
- Stream session management
- Auto-reconnection and health monitoring
- Frontend live video player
- Comprehensive tests

---

## 📋 Sprint 4 Tasks

### 4.1 — Project Setup & Database Schema
**Priority**: Highest  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Initialize Video Streaming microservice with dependencies for video processing and WebSocket support.

**Acceptance Criteria**:
- ✅ FastAPI project with WebSocket support
- ✅ OpenCV and FFmpeg dependencies installed
- ✅ Database configured
- ✅ Alembic initialized
- ✅ Environment variables setup

**Subtasks**:
- [x] Create VideoStreamingBackend/ folder structure
- [x] Install dependencies: fastapi, websockets, opencv-python-headless, numpy
- [x] Install yt-dlp, streamlink for URL resolution
- [x] Install sqlalchemy, pg8000, alembic
- [x] Configure infrastructure/config/settings.py
- [x] Setup database connection
- [x] Initialize Alembic
- [x] Create .env.example with DATABASE_URL, FFMPEG_PATH
- [x] Setup main.py with WebSocket support

**Technologies**: FastAPI 0.109+, WebSockets 12.0, OpenCV 4.9+, FFmpeg, yt-dlp, NumPy, SQLAlchemy

---

### 4.2 — Domain Layer: StreamSession Entity
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement StreamSession entity tracking active video streams with status management and health checks.

**Acceptance Criteria**:
- ✅ StreamSession entity with camera_id, stream_url, status, fps
- ✅ StreamStatus enum (PENDING, CONNECTING, ACTIVE, RECONNECTING, STOPPED, ERROR)
- ✅ Timestamps: started_at, last_frame_at, stopped_at
- ✅ reconnect_attempts tracking
- ✅ Business methods: start(), activate(), stop(), mark_error(), mark_reconnecting()
- ✅ is_alive() health check method

**Subtasks**:
- [x] Create domain/entities/stream_session.py
- [x] Create StreamStatus enum
- [x] Add attributes: camera_id, stream_url, status, fps
- [x] Add started_at, last_frame_at, stopped_at, error_message
- [x] Add reconnect_attempts, created_at, updated_at
- [x] Implement create() factory method
- [x] Implement start() setting status=CONNECTING, started_at
- [x] Implement activate() setting status=ACTIVE
- [x] Implement stop() setting status=STOPPED, stopped_at
- [x] Implement mark_error(message) setting status=ERROR
- [x] Implement mark_reconnecting() incrementing attempts
- [x] Implement update_last_frame() updating timestamp
- [x] Implement is_alive(timeout_seconds) checking frame recency

**Technologies**: Python dataclasses, enum, datetime, timedelta

---

### 4.3 — Domain Layer: StreamConfig & VideoFrame Entities
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create configuration and frame entities for stream control and data transfer.

**Acceptance Criteria**:
- ✅ StreamConfig with fps, quality, width, height, max_reconnects
- ✅ VideoFrame with camera_id, timestamp, frame_bytes, dimensions
- ✅ FrameEncoding enum (JPEG, PNG, RAW)
- ✅ Validation in StreamConfig __post_init__
- ✅ VideoFrame.create() factory

**Subtasks**:
- [x] Create domain/entities/stream_config.py
- [x] Add attributes: fps, quality, width, height, max_reconnects
- [x] Add __post_init__ validation (fps 1-60, quality 1-100)
- [x] Create domain/entities/video_frame.py
- [x] Create FrameEncoding enum (JPEG, PNG, RAW)
- [x] Add attributes: camera_id, timestamp, frame_bytes, width, height, encoding, sequence
- [x] Add create() factory with current timestamp

**Technologies**: Python dataclasses, validation, bytes type

---

### 4.4 — Domain Layer: Repository Interface
**Priority**: High  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Define abstract repository interface for stream session persistence.

**Acceptance Criteria**:
- ✅ StreamSessionRepositoryInterface with CRUD methods
- ✅ find_by_camera, find_active methods
- ✅ Proper typing

**Subtasks**:
- [x] Create domain/repositories/stream_session_repository.py
- [x] Add methods: find_by_id, find_by_camera, find_active, save, update

**Technologies**: Python ABC, typing

---

### 4.5 — Infrastructure: SQLAlchemy Model & Repository
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Create ORM model and repository for stream sessions.

**Acceptance Criteria**:
- ✅ StreamSessionModel with all session attributes
- ✅ SQLAlchemyStreamSessionRepository implementation
- ✅ Proper indexing on camera_id, status

**Subtasks**:
- [x] Create infrastructure/persistence/models/stream_session_model.py
- [x] Define StreamSessionModel with UUID primary key
- [x] Add columns: camera_id, stream_url, status enum, fps
- [x] Add timestamps, error_message, reconnect_attempts
- [x] Create index on camera_id
- [x] Create infrastructure/persistence/repositories/stream_session_repository_impl.py
- [x] Implement find_by_camera returning latest session
- [x] Implement find_active filtering by status=ACTIVE
- [x] Implement save and update methods

**Technologies**: SQLAlchemy, PostgreSQL, indexes

---

### 4.6 — Infrastructure: StreamResolver (URL Detection)
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement universal stream URL resolver for detecting stream types and extracting playable URLs.

**Acceptance Criteria**:
- ✅ StreamType enum (RTSP, RTMP, HLS, MJPEG, HTTP_VIDEO, YOUTUBE, FILE, WEBCAM, UNKNOWN)
- ✅ detect_stream_type(url) classifying URLs
- ✅ resolve(url) extracting actual stream URLs (especially for YouTube)
- ✅ yt-dlp integration for YouTube URL extraction
- ✅ Error handling for unsupported URLs

**Subtasks**:
- [x] Create infrastructure/streaming/stream_resolver.py
- [x] Create StreamType enum
- [x] Implement detect_stream_type(url) with regex patterns
- [x] Check for rtsp://, rtmp://, .m3u8, youtube.com patterns
- [x] Implement resolve(url) async method
- [x] For YouTube: use yt-dlp to extract direct stream URL
- [x] For HLS/RTSP/RTMP: return URL as-is
- [x] Return tuple: (resolved_url, stream_type, error_message)
- [x] Add YOUTUBE_PATTERNS regex list
- [x] Handle yt-dlp errors gracefully

**Technologies**: yt-dlp, regex, urllib.parse, asyncio, subprocess

---

### 4.7 — Infrastructure: FFmpegStreamReader
**Priority**: Highest  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Implement FFmpeg-based stream reader for complex streams (HLS, YouTube, RTSP, RTMP).

**Acceptance Criteria**:
- ✅ FFmpegStreamReader class with subprocess management
- ✅ open() and open_async() methods
- ✅ read_frame() and read_frame_async() returning numpy arrays
- ✅ Frame queue for buffering
- ✅ Proper cleanup on close()
- ✅ Error handling and logging

**Subtasks**:
- [x] Create infrastructure/streaming/ffmpeg_stream_reader.py
- [x] Initialize with camera_id, stream_url, config
- [x] Implement _build_ffmpeg_command() creating FFmpeg args
- [x] Use FFmpeg to decode stream to rawvideo
- [x] Output to stdout in RGB24 format
- [x] Implement open() starting subprocess.Popen
- [x] Create reader thread consuming stdout
- [x] Parse raw bytes into numpy arrays (reshape by width*height*3)
- [x] Implement read_frame() returning (frame_array, width, height)
- [x] Implement close() terminating subprocess
- [x] Add frame queue (maxsize=30) for async reading
- [x] Handle subprocess errors and reconnection

**Technologies**: subprocess.Popen, threading, Queue, NumPy, cv2 (for encoding)

---

### 4.8 — Infrastructure: CameraStreamReader (OpenCV)
**Priority**: High  
**Story Points**: 4  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement OpenCV-based reader for simple streams (MJPEG, local files).

**Acceptance Criteria**:
- ✅ CameraStreamReader using cv2.VideoCapture
- ✅ open() method with backend selection
- ✅ read_frame() returning frame array
- ✅ RTSP TCP transport configuration
- ✅ Error handling and retry logic

**Subtasks**:
- [x] Create infrastructure/streaming/camera_stream_reader.py
- [x] Initialize with camera_id, stream_url, config
- [x] Implement _detect_stream_type() classifying URL
- [x] Implement open() creating cv2.VideoCapture
- [x] Configure RTSP with TCP transport via environment
- [x] Set buffer size, timeouts
- [x] Implement read_frame() calling capture.read()
- [x] Return (frame, width, height) tuple
- [x] Implement close() releasing capture
- [x] Add read_frame_async() wrapper with asyncio.to_thread

**Technologies**: OpenCV (cv2.VideoCapture), NumPy, asyncio

---

### 4.9 — Infrastructure: FrameEncoder
**Priority**: High  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Implement frame encoder converting numpy arrays to JPEG/PNG for transmission.

**Acceptance Criteria**:
- ✅ FrameEncoder with quality setting
- ✅ encode_jpeg(frame) returning bytes
- ✅ encode_png(frame) returning bytes
- ✅ encode(frame, encoding) with FrameEncoding enum

**Subtasks**:
- [x] Create infrastructure/streaming/frame_encoder.py
- [x] Initialize with quality parameter
- [x] Implement encode_jpeg using cv2.imencode('.jpg', frame, params)
- [x] Set JPEG quality parameter
- [x] Implement encode_png using cv2.imencode('.png', frame)
- [x] Implement encode() method switching on FrameEncoding enum
- [x] Return bytes from buffer.tobytes()

**Technologies**: OpenCV (cv2.imencode), NumPy

---

### 4.10 — Infrastructure: StreamBroadcaster (WebSocket)
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement WebSocket subscription manager for broadcasting frames to multiple clients.

**Acceptance Criteria**:
- ✅ StreamBroadcaster managing camera_id → WebSocket connections
- ✅ subscribe(camera_id, websocket) adding subscriber
- ✅ unsubscribe(camera_id, websocket) removing subscriber
- ✅ broadcast_frame(frame) sending to all subscribers
- ✅ Auto-cleanup of disconnected WebSockets
- ✅ Thread-safe with asyncio.Lock

**Subtasks**:
- [x] Create infrastructure/streaming/stream_broadcaster.py
- [x] Create _subscribers: Dict[UUID, Set[WebSocket]]
- [x] Add asyncio.Lock for thread safety
- [x] Implement subscribe(camera_id, websocket) adding to set
- [x] Implement unsubscribe(camera_id, websocket) removing from set
- [x] Implement broadcast_frame(frame: VideoFrame) async method
- [x] Iterate over subscribers, call ws.send_bytes(frame_data)
- [x] Handle WebSocket errors, collect disconnected sockets
- [x] Remove disconnected sockets from subscribers
- [x] Return sent_count
- [x] Implement broadcast_json(camera_id, data) for metadata
- [x] Implement get_subscriber_count(camera_id)
- [x] Implement close_all(camera_id) closing all connections

**Technologies**: FastAPI WebSocket, asyncio, Dict, Set, Lock

---

### 4.11 — Infrastructure: StreamManager (Orchestrator)
**Priority**: Highest  
**Story Points**: 7  
**Duration**: 2.5 days  
**Assignee**: Backend Developer  

**Description**: Implement stream manager orchestrating readers, encoding, and broadcasting.

**Acceptance Criteria**:
- ✅ StreamManager coordinating stream lifecycle
- ✅ Auto-selection of FFmpeg vs OpenCV reader based on stream type
- ✅ start_stream(session, config) initiating streaming
- ✅ _stream_loop() reading frames and broadcasting
- ✅ stop_stream(camera_id) cleanup
- ✅ FPS throttling
- ✅ Error handling and reconnection

**Subtasks**:
- [x] Create infrastructure/streaming/stream_manager.py
- [x] Initialize with session_repository, broadcaster, frame_quality
- [x] Create _readers: Dict[UUID, Union[FFmpeg, Camera]Reader]
- [x] Create _tasks: Dict[UUID, asyncio.Task]
- [x] Implement start_stream(session, config)
- [x] Detect stream type with StreamResolver
- [x] Choose FFmpeg reader for HLS, YouTube, RTSP, RTMP, FILE
- [x] Choose OpenCV reader for MJPEG, WEBCAM
- [x] Create reader instance
- [x] Create asyncio task for _stream_loop
- [x] Implement _stream_loop(session, reader, config)
- [x] Open reader (await open_async for FFmpeg)
- [x] Loop: read frame, encode JPEG, create VideoFrame
- [x] Broadcast frame via broadcaster
- [x] Update session.update_last_frame()
- [x] Throttle to target FPS with asyncio.sleep
- [x] Handle errors: mark session as ERROR
- [x] Implement stop_stream(camera_id) cancelling task
- [x] Close reader and broadcaster connections
- [x] Implement is_streaming(camera_id) checking active tasks

**Technologies**: asyncio (tasks, loops), StreamResolver, readers, broadcaster

---

### 4.12 — Application Layer: Use Cases
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Implement use cases for stream control and monitoring.

**Acceptance Criteria**:
- ✅ StartStreamUseCase creating session and starting manager
- ✅ StopStreamUseCase stopping stream and updating session
- ✅ GetStreamStatusUseCase checking active status
- ✅ ListActiveStreamsUseCase returning all active streams
- ✅ PublishFrameUseCase for manual frame publishing
- ✅ MonitorHealthUseCase detecting stale streams

**Subtasks**:
- [x] Create application/use_cases/start_stream.py
- [x] Create StreamSession entity
- [x] Save session to repository
- [x] Call stream_manager.start_stream(session, config)
- [x] Return StreamSession
- [x] Create application/use_cases/stop_stream.py
- [x] Call stream_manager.stop_stream(camera_id)
- [x] Find session, set status=STOPPED, stopped_at
- [x] Update session in repository
- [x] Create application/use_cases/get_stream_status.py
- [x] Check stream_manager.is_streaming(camera_id)
- [x] Find session from repository
- [x] Return (is_streaming, session)
- [x] Create application/use_cases/list_active_streams.py
- [x] Query repository.find_active()
- [x] Create application/use_cases/publish_frame.py
- [x] Call broadcaster.broadcast_frame(frame)
- [x] Create application/use_cases/monitor_health.py
- [x] Find all active sessions
- [x] Check session.is_alive(timeout_seconds)
- [x] Return list of stale sessions for recovery

**Technologies**: Use case pattern, business orchestration

---

### 4.13 — Application Layer: DTOs
**Priority**: High  
**Story Points**: 3  
**Duration**: 1 day  
**Assignee**: Backend Developer  

**Description**: Define request/response DTOs for streaming API.

**Acceptance Criteria**:
- ✅ StartStreamRequest with camera_id, stream_url, config
- ✅ StopStreamRequest with camera_id
- ✅ StreamConfigRequest with fps, quality, dimensions
- ✅ StreamSessionResponse with session details
- ✅ StreamStatusResponse with is_streaming flag
- ✅ ActiveStreamsResponse with session list

**Subtasks**:
- [x] Create application/dtos/stream_requests.py
- [x] Define StartStreamRequest (camera_id: UUID, stream_url: str, config: Optional[StreamConfigRequest])
- [x] Define StopStreamRequest (camera_id: UUID)
- [x] Define StreamConfigRequest (fps, quality, width, height, max_reconnects)
- [x] Create application/dtos/stream_responses.py
- [x] Define StreamSessionResponse matching StreamSession fields
- [x] Define StreamStatusResponse (is_streaming: bool, session: Optional[StreamSessionResponse])
- [x] Define ActiveStreamsResponse (sessions: List[StreamSessionResponse])

**Technologies**: Pydantic, UUID, Optional, nested models

---

### 4.14 — API Layer: Stream REST Routes
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Create REST API endpoints for stream control.

**Acceptance Criteria**:
- ✅ POST /streams/start — Start streaming
- ✅ POST /streams/stop — Stop streaming
- ✅ GET /streams/status/{camera_id} — Get stream status
- ✅ GET /streams/active — List active streams
- ✅ JWT authentication
- ✅ Error handling

**Subtasks**:
- [x] Create api/routes/stream_routes.py
- [x] Implement POST /streams/start
- [x] Call StartStreamUseCase with camera_id, stream_url, config
- [x] Return 201 Created with StreamSessionResponse
- [x] Implement POST /streams/stop
- [x] Call StopStreamUseCase with camera_id
- [x] Return 200 OK with updated session
- [x] Implement GET /streams/status/{camera_id}
- [x] Call GetStreamStatusUseCase
- [x] Return StreamStatusResponse
- [x] Implement GET /streams/active
- [x] Call ListActiveStreamsUseCase
- [x] Return ActiveStreamsResponse
- [x] Add JWT authentication dependency
- [x] Add error handling (400, 404, 500)
- [x] Mount router in main.py

**Technologies**: FastAPI, APIRouter, status codes, async endpoints

---

### 4.15 — API Layer: WebSocket Endpoint
**Priority**: Highest  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Create WebSocket endpoint for live frame streaming to clients.

**Acceptance Criteria**:
- ✅ WS /ws/stream/{camera_id} endpoint
- ✅ Subscribe client to broadcaster on connect
- ✅ Keep connection alive
- ✅ Unsubscribe on disconnect
- ✅ Error handling
- ✅ Optional JWT authentication

**Subtasks**:
- [x] Create api/websocket/stream_websocket.py
- [x] Define @app.websocket("/ws/stream/{camera_id}")
- [x] Accept WebSocket connection
- [x] Extract camera_id from path
- [x] Call broadcaster.subscribe(camera_id, websocket)
- [x] Enter infinite loop: await websocket.receive_text() (keep-alive)
- [x] On disconnect: call broadcaster.unsubscribe(camera_id, websocket)
- [x] Handle WebSocketDisconnect exception
- [x] Add error logging
- [x] Mount WebSocket route in main.py

**Technologies**: FastAPI WebSocket, asyncio, exception handling

---

### 4.16 — Database Migrations
**Priority**: High  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Create Alembic migration for stream_sessions table.

**Acceptance Criteria**:
- ✅ Migration creates stream_sessions table
- ✅ All columns and constraints
- ✅ Indexes on camera_id, status

**Subtasks**:
- [x] Run `alembic revision --autogenerate -m "Create stream_sessions table"`
- [x] Review migration
- [x] Add index on camera_id
- [x] Test migration

**Technologies**: Alembic, PostgreSQL

---

### 4.17 — Unit Tests: Domain & Streaming
**Priority**: High  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Backend Developer  

**Description**: Write unit tests for domain entities and streaming infrastructure.

**Acceptance Criteria**:
- ✅ Test StreamSession state transitions
- ✅ Test StreamConfig validation
- ✅ Test VideoFrame creation
- ✅ Test StreamResolver URL detection
- ✅ Test FrameEncoder JPEG encoding
- ✅ 80%+ coverage

**Subtasks**:
- [x] Create tests/unit/test_stream_session.py
- [x] Test start(), activate(), stop(), mark_error()
- [x] Test is_alive() with various timestamps
- [x] Create tests/unit/test_stream_config.py
- [x] Test validation (fps, quality ranges)
- [x] Create tests/unit/test_video_frame.py
- [x] Create tests/unit/test_stream_resolver.py
- [x] Test detect_stream_type for various URLs
- [x] Create tests/unit/test_frame_encoder.py
- [x] Test JPEG encoding quality

**Technologies**: Pytest, NumPy arrays, freezegun

---

### 4.18 — Integration Tests: Streaming API
**Priority**: High  
**Story Points**: 6  
**Duration**: 2 days  
**Assignee**: Backend Developer  

**Description**: Write integration tests for stream control and WebSocket broadcasting.

**Acceptance Criteria**:
- ✅ Test POST /streams/start creates session
- ✅ Test POST /streams/stop stops stream
- ✅ Test GET /streams/status returns correct status
- ✅ Test WebSocket connection receives frames
- ✅ Test multiple subscribers
- ✅ Test error handling

**Subtasks**:
- [x] Create tests/integration/test_stream_api.py
- [x] Setup test database
- [x] Test POST /streams/start with test video file
- [x] Verify session created in database
- [x] Test GET /streams/status shows is_streaming=True
- [x] Test POST /streams/stop
- [x] Verify status updated to STOPPED
- [x] Create tests/integration/test_stream_websocket.py
- [x] Setup test WebSocket client
- [x] Connect to /ws/stream/{camera_id}
- [x] Start stream via REST API
- [x] Receive frames via WebSocket
- [x] Verify frame format (bytes)
- [x] Test multiple concurrent subscribers
- [x] Test subscriber cleanup on disconnect
- [x] Mock FFmpeg for controlled testing

**Technologies**: Pytest, TestClient, WebSocket testing, asyncio, mock

---

### 4.19 — Frontend: Live Video Player Component
**Priority**: Highest  
**Story Points**: 8  
**Duration**: 3 days  
**Assignee**: Frontend Developer  

**Description**: Build React component for live video streaming with WebSocket integration.

**Acceptance Criteria**:
- ✅ VideoPlayer component with canvas rendering
- ✅ WebSocket connection to /ws/stream/{camera_id}
- ✅ Base64 JPEG frame decoding and display
- ✅ Loading states and error handling
- ✅ Start/stop stream controls
- ✅ FPS display
- ✅ Reconnection on connection loss
- ✅ Responsive design

**Subtasks**:
- [x] Create src/components/VideoPlayer.tsx
- [x] Add canvas element for frame rendering
- [x] Implement useVideoStream custom hook
- [x] Create WebSocket connection to STREAMING_WS_URL
- [x] Handle WebSocket onmessage receiving frame bytes
- [x] Convert bytes to Base64 data URL
- [x] Create Image object and draw to canvas
- [x] Track FPS (frames received per second)
- [x] Implement start/stop stream buttons
- [x] Call POST /streams/start API endpoint
- [x] Handle WebSocket reconnection on close
- [x] Add loading spinner while connecting
- [x] Display error messages on failure
- [x] Create src/hooks/useVideoStream.ts
- [x] Manage WebSocket lifecycle (connect, disconnect, reconnect)
- [x] Expose isStreaming, fps, error state
- [x] Update MonitoringPageNew to use VideoPlayer
- [x] Style with CSS modules (aspect ratio, responsive)

**Technologies**: React 18, TypeScript, Canvas API, WebSocket API, custom hooks

---

### 4.20 — Frontend: Stream Management Integration
**Priority**: High  
**Story Points**: 5  
**Duration**: 1.5 days  
**Assignee**: Frontend Developer  

**Description**: Integrate streaming controls into camera pages (Monitoring, Detail views).

**Acceptance Criteria**:
- ✅ MonitoringPageNew displays live streams in grid
- ✅ Camera detail page with fullscreen player
- ✅ Start/stop stream buttons
- ✅ Stream status indicators
- ✅ Error handling and retry
- ✅ API integration for stream control

**Subtasks**:
- [x] Update src/pages/MonitoringPageNew.tsx
- [x] Add VideoPlayer to each camera card
- [x] Implement grid layout with responsive columns
- [x] Add start stream button on camera card
- [x] Call API: POST /streams/start with camera_id and stream_url
- [x] Add stop stream button
- [x] Show stream status badge (ACTIVE/STOPPED/ERROR)
- [x] Update CameraDetailPage with fullscreen player
- [x] Add PTZ controls overlay (if camera supports)
- [x] Add snapshot button (capture current frame)
- [x] Add recording toggle (future feature indicator)
- [x] Create src/services/api.ts streaming methods
- [x] Implement startStream(camera_id, stream_url, config)
- [x] Implement stopStream(camera_id)
- [x] Implement getStreamStatus(camera_id)
- [x] Handle errors with toast notifications

**Technologies**: React, TypeScript, Fetch API, CSS Grid, error handling

---

### 4.21 — Documentation
**Priority**: Medium  
**Story Points**: 2  
**Duration**: 0.5 day  
**Assignee**: Backend Developer  

**Description**: Document streaming architecture, supported protocols, and API usage.

**Acceptance Criteria**:
- ✅ README with setup and FFmpeg installation
- ✅ Supported stream types documented
- ✅ API endpoint examples
- ✅ WebSocket protocol documented
- ✅ Troubleshooting guide

**Subtasks**:
- [x] Create README.md
- [x] Document supported stream types (RTSP, HLS, YouTube, etc.)
- [x] Add FFmpeg installation instructions
- [x] Document REST API endpoints with curl examples
- [x] Document WebSocket protocol (frame format)
- [x] Add troubleshooting section (FFmpeg errors, connection issues)
- [x] Document configuration options (fps, quality, reconnects)

**Technologies**: Markdown, API documentation

---

## 📈 Sprint Summary

| Sprint | Duration | Story Points | Key Focus | Backend Tech | Frontend Tech |
|--------|----------|--------------|-----------|--------------|---------------|
| **Sprint 1** | 2 weeks | 34 | Camera Management | FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT, Pytest | React, TypeScript, CSS Modules |
| **Sprint 2** | 2 weeks | 40 | Authentication & 2FA | FastAPI, SQLAlchemy, Bcrypt, Python-jose, Authlib, SMTP, Pytest | React, Context API, localStorage |
| **Sprint 3** | 2 weeks | 32 | Invitation System | FastAPI, SQLAlchemy, Bcrypt, SMTP, Pytest | React, TypeScript, Forms |
| **Sprint 4** | 2 weeks | 38 | Video Streaming | FastAPI, WebSockets, OpenCV, FFmpeg, yt-dlp, asyncio, Pytest | React, WebSocket, Canvas API |
| **Total** | **8 weeks** | **144** | **Full System** | **Python Microservices** | **React SPA + Mobile** |

---

## 🎯 Prioritization Legend

- **Highest**: Critical path, blocking other tasks
- **High**: Important for sprint goal
- **Medium**: Nice to have, can be deferred
- **Low**: Optional, future iteration

---

## ⏱️ Duration Guidelines

- **0.5 day**: 4 hours
- **1 day**: 8 hours
- **1.5 days**: 12 hours
- **2 days**: 16 hours
- **3 days**: 24 hours

---

## ✅ Definition of Done

Each task is considered complete when:
1. ✅ Code implemented following Clean Architecture
2. ✅ Unit tests written with 80%+ coverage
3. ✅ Integration tests passing
4. ✅ Code reviewed and merged
5. ✅ API documentation updated (Swagger)
6. ✅ Manual testing completed
7. ✅ No blocking bugs

---

**End of Product Backlog**
