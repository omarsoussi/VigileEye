# Members Invitation Backend

FastAPI microservice for managing member invitations and camera sharing permissions.

## Features
- Create invitations to share cameras with a member (Reader/Editor)
- Invitation expiry (date or unlimited)
- Email approval code (OTP) sent to recipient
- Recipient can approve (with code) or decline
- Creates membership + camera access records upon approval

## Setup

1) Create and configure `.env` (see `.env.example`).

2) Install dependencies:
- `pip install -r requirements.txt`

3) Run migrations (optional in dev; app can auto-create tables):
- `alembic upgrade head`

4) Run the API:
- Default port is `8001` (configurable via `PORT` in `.env`).
- `uvicorn main:app --reload --port 8001`
- or `python main.py`

## API
Base prefix: `/api/v1`

- `POST /members/invitations` create invitation
- `GET /members/invitations/sent` list invitations you sent
- `GET /members/invitations/received` list invitations sent to your email
- `POST /members/invitations/{invitation_id}/accept` accept with `code`
- `POST /members/invitations/{invitation_id}/decline` decline
- `POST /members/invitations/{invitation_id}/resend-code` resend approval code
