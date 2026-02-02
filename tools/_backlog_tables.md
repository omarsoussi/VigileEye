# VigileEye — Product Backlog (Short)

## Product Backlog

| Sprint | Title | Priority | Type | Description |
|---|---|---|---|---|
| Sprint 1 | Camera Management Backend | Highest | Sprint | Build the Camera Management microservice as the core infrastructure for video surveillance. This sprint… |
| Sprint 2 | Authentication Backend | Highest | Sprint | Develop the Authentication microservice as the security foundation for the entire system. Implements user… |
| Sprint 3 | Members Invitation Backend | High | Sprint | Develop the Members Invitation microservice enabling camera owners to share access with other users… |
| Sprint 4 | Video Streaming Backend | High | Sprint | Develop the Video Streaming microservice providing real-time video delivery from various camera sources. Implements… |

---

## Sprint 1 — Camera Management Backend

| Type | Title | Priority | Description |
|---|---|---|---|
| Backend | 1.1 — Project Setup & Database Schema | Highest | Initialize Camera Management microservice with Clean Architecture folder structure, configure PostgreSQL database connection, and… |
| Backend | 1.2 — Domain Layer: Camera Entity & Value Objects | Highest | Implement Camera domain entity with business logic, enumerations (CameraStatus, CameraType), and CameraLocation value object… |
| Backend | 1.3 — Domain Layer: CameraAccess & CameraHealth Entities | High | Implement access control entity for sharing cameras and health monitoring entity for tracking camera… |
| Backend | 1.4 — Domain Layer: Repository Interfaces | Highest | Define abstract repository interfaces following Dependency Inversion Principle for Camera, CameraAccess, and CameraHealth persistence. |
| Backend | 1.5 — Infrastructure: SQLAlchemy Models & Mappers | Highest | Create SQLAlchemy ORM models for database persistence and mapper classes to convert between domain… |
| Backend | 1.6 — Infrastructure: Repository Implementations | Highest | Implement concrete repository classes using SQLAlchemy to handle database operations for cameras, access control… |
| Backend | 1.7 — Application Layer: Use Cases | Highest | Implement all camera management use cases as independent classes following single responsibility principle. |
| Backend | 1.8 — Application Layer: DTOs (Request/Response) | High | Define Pydantic models for API request validation and response serialization. |
| Backend | 1.9 — API Layer: FastAPI Routes | Highest | Create RESTful API endpoints for camera operations with JWT authentication, error handling, and proper… |
| Backend | 1.10 — API Layer: JWT Authentication Dependencies | Highest | Implement JWT validation dependencies to extract and verify access tokens from Auth service. |
| Backend | 1.11 — Database Migrations | Highest | Create Alembic migration scripts for cameras, camera_access, and camera_health tables. |
| Testing | 1.12 — Unit Tests: Domain Layer | High | Write comprehensive unit tests for domain entities, value objects, and business logic. |
| Testing | 1.13 — Integration Tests: API Endpoints | High | Write integration tests for all API endpoints using TestClient with in-memory SQLite database. |
| Frontend | 1.14 — Frontend: Camera Management Pages | High | Build React components for camera CRUD operations with TypeScript, responsive design, and API integration. |
| Documentation | 1.15 — Documentation & Deployment Prep | Medium | Write API documentation, README, and prepare deployment configuration. |

---

## Sprint 2 — Authentication Backend

| Type | Title | Priority | Description |
|---|---|---|---|
| Backend | 2.1 — Project Setup & Database Schema | Highest | Initialize Auth microservice with Clean Architecture structure, configure database, and setup dependencies. |
| Backend | 2.2 — Domain Layer: User Entity | Highest | Implement User domain entity with business logic for account management, email verification, login attempts… |
| Backend | 2.3 — Domain Layer: OTP Entity | Highest | Create OTP (One-Time Password) entity for email verification, 2FA login, and password reset with… |
| Backend | 2.4 — Domain Layer: Value Objects | High | Create immutable value objects for Email and Password with validation logic. |
| Backend | 2.5 — Domain Layer: Repository Interfaces | Highest | Define abstract repository interfaces for User and OTP persistence. |
| Backend | 2.6 — Infrastructure: SQLAlchemy Models | Highest | Create ORM models for users and otps tables with proper constraints and relationships. |
| Backend | 2.7 — Infrastructure: Repository Implementations | Highest | Implement concrete repositories with SQLAlchemy for database operations. |
| Backend | 2.8 — Infrastructure: Security Utilities | Highest | Implement password hashing, JWT token handling, and OTP generation utilities. |
| Backend | 2.9 — Infrastructure: Email Service | High | Implement SMTP email sender for OTP delivery with templating. |
| Backend | 2.10 — Infrastructure: Google OAuth Client | Medium | Integrate Google OAuth for social login using Authlib. |
| Backend | 2.11 — Application Layer: Use Cases (Registration & Verification) | Highest | Implement user registration and email verification use cases. |
| Backend | 2.12 — Application Layer: Use Cases (Login & 2FA) | Highest | Implement two-step login process with credential validation and OTP confirmation. |
| Backend | 2.13 — Application Layer: Use Cases (Password Reset) | High | Implement forgot password and reset password flows with OTP validation. |
| Backend | 2.14 — Application Layer: Use Cases (OAuth & Token Refresh) | Medium | Implement Google OAuth authentication and refresh token use cases. |
| Backend | 2.15 — Application Layer: Auth Service & DTOs | High | Create facade service orchestrating use cases and define request/response DTOs. |
| Backend | 2.16 — API Layer: Authentication Routes | Highest | Create REST API endpoints for all authentication flows. |
| Backend | 2.17 — API Layer: Protected Route Dependencies | High | Create reusable dependencies for protecting routes with JWT authentication. |
| Backend | 2.18 — Database Migrations | Highest | Create Alembic migrations for users and otps tables. |
| Testing | 2.19 — Unit Tests: Domain & Security | High | Write unit tests for domain entities, value objects, and security utilities. |
| Testing | 2.20 — Integration Tests: Auth API | High | Write end-to-end integration tests for all authentication flows. |
| Frontend | 2.21 — Frontend: Authentication Pages | High | Build React authentication UI with registration, login, verification, and password reset flows. |
| Documentation | 2.22 — Documentation | Medium | Document authentication flows, API endpoints, and security considerations. |

---

## Sprint 3 — Members Invitation Backend

| Type | Title | Priority | Description |
|---|---|---|---|
| Backend | 3.1 — Project Setup & Database Schema | Highest | Initialize Members Invitation microservice with Clean Architecture and database configuration. |
| Backend | 3.2 — Domain Layer: Invitation Entity | Highest | Implement Invitation domain entity with status tracking, permission levels, and expiry logic. |
| Backend | 3.3 — Domain Layer: Membership Entity | Highest | Create Membership entity representing granted camera access after invitation acceptance. |
| Backend | 3.4 — Domain Layer: Repository Interfaces | Highest | Define abstract repository interfaces for invitations and memberships. |
| Backend | 3.5 — Infrastructure: SQLAlchemy Models | Highest | Create ORM models for invitations, memberships, and junction tables for camera associations. |
| Backend | 3.6 — Infrastructure: Repository Implementations | Highest | Implement concrete repositories with SQLAlchemy for database operations. |
| Backend | 3.7 — Infrastructure: Security & Email | High | Implement approval code generation, hashing, and email sending for invitations. |
| Backend | 3.8 — Application Layer: Use Cases (Invitation Management) | Highest | Implement use cases for creating, listing, and managing invitations. |
| Backend | 3.9 — Application Layer: Use Cases (Invitation Actions) | Highest | Implement use cases for accepting and declining invitations. |
| Backend | 3.10 — Application Layer: DTOs | High | Define Pydantic models for invitation requests and responses. |
| Backend | 3.11 — API Layer: Invitation Routes | Highest | Create REST API endpoints for invitation management. |
| Backend | 3.12 — Database Migrations | Highest | Create Alembic migrations for invitation and membership tables. |
| Testing | 3.13 — Unit Tests: Domain Layer | High | Write unit tests for invitation and membership entities. |
| Testing | 3.14 — Integration Tests: Invitation API | High | Write integration tests for invitation flows. |
| Frontend | 3.15 — Frontend: Members & Invitation Pages | High | Build React UI for sending invitations, viewing memberships, and managing received invitations. |
| Documentation | 3.16 — Documentation | Medium | Document invitation system, API endpoints, and workflows. |

---

## Sprint 4 — Video Streaming Backend

| Type | Title | Priority | Description |
|---|---|---|---|
| Backend | 4.1 — Project Setup & Database Schema | Highest | Initialize Video Streaming microservice with dependencies for video processing and WebSocket support. |
| Backend | 4.2 — Domain Layer: StreamSession Entity | Highest | Implement StreamSession entity tracking active video streams with status management and health checks. |
| Backend | 4.3 — Domain Layer: StreamConfig & VideoFrame Entities | High | Create configuration and frame entities for stream control and data transfer. |
| Backend | 4.4 — Domain Layer: Repository Interface | High | Define abstract repository interface for stream session persistence. |
| Backend | 4.5 — Infrastructure: SQLAlchemy Model & Repository | High | Create ORM model and repository for stream sessions. |
| Backend | 4.6 — Infrastructure: StreamResolver (URL Detection) | Highest | Implement universal stream URL resolver for detecting stream types and extracting playable URLs. |
| Backend | 4.7 — Infrastructure: FFmpegStreamReader | Highest | Implement FFmpeg-based stream reader for complex streams (HLS, YouTube, RTSP, RTMP). |
| Backend | 4.8 — Infrastructure: CameraStreamReader (OpenCV) | High | Implement OpenCV-based reader for simple streams (MJPEG, local files). |
| Backend | 4.9 — Infrastructure: FrameEncoder | High | Implement frame encoder converting numpy arrays to JPEG/PNG for transmission. |
| Backend | 4.10 — Infrastructure: StreamBroadcaster (WebSocket) | Highest | Implement WebSocket subscription manager for broadcasting frames to multiple clients. |
| Backend | 4.11 — Infrastructure: StreamManager (Orchestrator) | Highest | Implement stream manager orchestrating readers, encoding, and broadcasting. |
| Backend | 4.12 — Application Layer: Use Cases | Highest | Implement use cases for stream control and monitoring. |
| Backend | 4.13 — Application Layer: DTOs | High | Define request/response DTOs for streaming API. |
| Backend | 4.14 — API Layer: Stream REST Routes | Highest | Create REST API endpoints for stream control. |
| Backend | 4.15 — API Layer: WebSocket Endpoint | Highest | Create WebSocket endpoint for live frame streaming to clients. |
| Backend | 4.16 — Database Migrations | High | Create Alembic migration for stream_sessions table. |
| Testing | 4.17 — Unit Tests: Domain & Streaming | High | Write unit tests for domain entities and streaming infrastructure. |
| Testing | 4.18 — Integration Tests: Streaming API | High | Write integration tests for stream control and WebSocket broadcasting. |
| Frontend | 4.19 — Frontend: Live Video Player Component | Highest | Build React component for live video streaming with WebSocket integration. |
| Frontend | 4.20 — Frontend: Stream Management Integration | High | Integrate streaming controls into camera pages (Monitoring, Detail views). |
| Documentation | 4.21 — Documentation | Medium | Document streaming architecture, supported protocols, and API usage. |


