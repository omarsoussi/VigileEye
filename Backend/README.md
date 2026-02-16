# Camera Monitoring System - Backend API

A robust authentication and user management backend built with FastAPI following Clean Architecture principles.

## 🚀 Features

- **User Registration** with email verification (6-digit OTP)
- **Two-Factor Authentication (2FA)** via email OTP for login
- **JWT Token Authentication** with access and refresh tokens
- **Google OAuth Integration** for social login
- **Password Reset** functionality with OTP verification
- **Account Lockout** after 3 failed login attempts (1 hour lockout)
- **Secure Password Hashing** using bcrypt
- **Email Validation** and verification
- **Rate Limiting** on authentication attempts

## 📁 Project Structure

```
project_root/
├── application/
│   ├── dtos/              # Data Transfer Objects (Pydantic models)
│   ├── services/          # Application services (AuthService)
│   └── use_cases/         # Business logic use cases
├── domain/
│   ├── entities/          # Domain entities (User, OTP)
│   ├── repositories/      # Abstract repository interfaces
│   ├── value_objects/     # Value objects (Email, Password)
│   └── exceptions.py      # Domain exceptions
├── infrastructure/
│   ├── config/            # Configuration (Settings)
│   ├── persistence/       # SQLAlchemy models & repositories
│   ├── security/          # Password hashing, JWT, OTP
│   └── external/          # Email sender, Google OAuth
├── api/
│   ├── routes/            # FastAPI route handlers
│   └── dependencies/      # Auth dependencies
├── alembic/               # Database migrations
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── main.py                # FastAPI application entry
├── requirements.txt       # Python dependencies
├── alembic.ini            # Alembic configuration
└── .env                   # Environment variables
```

## 🛠️ Setup Instructions

### Prerequisites

- Python 3.10+
- PostgreSQL 12+
- pip or pipenv

### 1. Clone and Navigate

```bash
cd /path/to/Backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

Copy the example environment file and update with your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database (already configured for your setup)
DATABASE_URL=postgresql://camera_user:admin@pfe@localhost:5432/CameraMonitoringDB

# JWT Secret (change in production!)
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production

# SMTP (already configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=soussiomar213@gmail.com
SMTP_PASSWORD=hmjc gimq uayg zayc

# Google OAuth (configure if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 5. Database Setup

Ensure PostgreSQL is running and the database exists:

```bash
# The database should already exist: CameraMonitoringDB
# Tables will be created automatically on startup
```

Or run migrations manually:

```bash
alembic upgrade head
```

### 6. Run the Application

```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or directly
python main.py
```

You can also configure the port via `.env` using `PORT=8000`.

The API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔐 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/verify` | Verify email with OTP |
| POST | `/api/v1/auth/login` | Login (step 1 - credentials) |
| POST | `/api/v1/auth/login/confirm` | Login (step 2 - 2FA OTP) |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with OTP |
| POST | `/api/v1/auth/refresh` | Refresh JWT tokens |
| GET | `/api/v1/auth/google` | Get Google OAuth URL |
| GET | `/api/v1/auth/google/callback` | Google OAuth callback |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/` | API info |

## 📝 API Usage Examples

### Register a User

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "myuser",
    "password": "SecurePass123!"
  }'
```

### Verify Email

```bash
curl -X POST "http://localhost:8000/api/v1/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp_code": "123456"
  }'
```

### Login (Step 1)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Login Confirm (Step 2)

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login/confirm" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp_code": "654321"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "myuser",
    "is_verified": true
  },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer"
  },
  "message": "Login successful"
}
```

## 🧪 Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run unit tests only
pytest tests/unit/

# Run integration tests only
pytest tests/integration/

# Run specific test file
pytest tests/unit/test_password.py -v
```

## 🔒 Security Features

### Password Requirements
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*...)

### Account Security
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with configurable expiry
- Account lockout after 3 failed attempts (1 hour)
- Email verification required for login
- 2FA via email OTP for every login
- OTP expires in 5 minutes

## 🏗️ Architecture

This project follows **Clean Architecture** principles:

1. **Domain Layer** (innermost)
   - Entities, Value Objects, Repository Interfaces
   - Pure business logic, no external dependencies

2. **Application Layer**
   - Use Cases (business operations)
   - DTOs (data transfer objects)
   - Services (orchestration)

3. **Infrastructure Layer** (outermost)
   - Database (SQLAlchemy, PostgreSQL)
   - Security (JWT, bcrypt, OTP)
   - External services (Email, OAuth)

4. **API Layer**
   - FastAPI routes
   - Request/Response handling
   - Dependency injection

## 📦 Dependencies

Key libraries:
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **passlib[bcrypt]** - Password hashing
- **python-jose** - JWT handling
- **httpx** - HTTP client (for OAuth)
- **email-validator** - Email validation

## 🐳 Docker (Optional)

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Run with Docker:
```bash
docker build -t camera-monitoring-api .
docker run -p 8000:8000 --env-file .env camera-monitoring-api
```

## 📄 License

This project is part of the PFE (Projet de Fin d'Études) for a smart video surveillance system.
