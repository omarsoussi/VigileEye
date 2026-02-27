# Diagramme de Cas d'Utilisation – Module d'Authentification & Gestion des Utilisateurs

> **Figure X.X** – Use Case Diagram – Authentication & User Management Module

```mermaid
---
title: Use Case Diagram – Authentication & User Management
---
flowchart LR

    %% ═══════════════════════════════════════════
    %%           PRIMARY ACTORS (Left)
    %% ═══════════════════════════════════════════

    User["👤 User"]
    AuthUser["👤 Authenticated\nUser"]

    %% ═══════════════════════════════════════════
    %%            SYSTEM BOUNDARY
    %% ═══════════════════════════════════════════

    subgraph System["🔐 Camera Monitoring System – Authentication Module"]
        direction TB

        ```mermaid
        ---
        title: Use Case Diagram – Authentication & User Management
        ---
        usecaseDiagram

            actor User
            actor "Authenticated User" as AuthUser
            actor "Google OAuth API" as Google
            actor "SMTP Server" as SMTP

            User --> (Register Account)
            User --> (Login (Credentials))
            User --> (Confirm Login (2FA))
            User --> (Verify Email)
            User --> (Forgot Password)
            User --> (Reset Password)
            User --> (Login with Google OAuth)

            AuthUser --> (Refresh Token)
            AuthUser --> (View Login History)

            (Register Account) ..> (Validate Password) : <<include>>
            (Register Account) ..> (Send OTP Email) : <<include>>

            (Login (Credentials)) ..> (Validate Credentials) : <<include>>
            (Login (Credentials)) ..> (Send OTP Email) : <<include>>

            (Confirm Login (2FA)) ..> (Validate OTP Code) : <<include>>
            (Confirm Login (2FA)) ..> (Generate JWT Tokens) : <<include>>

            (Verify Email) ..> (Validate OTP Code) : <<include>>

            (Forgot Password) ..> (Send OTP Email) : <<include>>

            (Reset Password) ..> (Validate OTP Code) : <<include>>
            (Reset Password) ..> (Validate Password) : <<include>>

            (Login with Google OAuth) ..> (Generate JWT Tokens) : <<include>>
            (Refresh Token) ..> (Generate JWT Tokens) : <<include>>

            (Login (Credentials)) ..> (Lock Account) : <<extend>>

            %% External system relations
            (Login with Google OAuth) --> Google
            (Send OTP Email) --> SMTP

            %% Generalization: Authenticated User is a specialization of User
            AuthUser --|> User

        ```
    User --- UC6
    User --- UC7

    AuthUser --- UC8
    AuthUser --- UC9

    %% ═══════════════════════════════════════════
    %%     «include» RELATIONSHIPS (dotted)
    %% ═══════════════════════════════════════════

    UC1 -.->|"«include»"| UC10
    UC1 -.->|"«include»"| UC11

    UC2 -.->|"«include»"| UC14
    UC2 -.->|"«include»"| UC11

    UC3 -.->|"«include»"| UC12
    UC3 -.->|"«include»"| UC13

    UC4 -.->|"«include»"| UC12

    UC5 -.->|"«include»"| UC11

    UC6 -.->|"«include»"| UC12
    UC6 -.->|"«include»"| UC10

    UC7 -.->|"«include»"| UC13

    UC8 -.->|"«include»"| UC13

    %% ═══════════════════════════════════════════
    %%     «extend» RELATIONSHIPS (dotted)
    %% ═══════════════════════════════════════════

    UC15 -.->|"«extend»"| UC2

    %% ═══════════════════════════════════════════
    %%       EXTERNAL SYSTEM CONNECTIONS
    %% ═══════════════════════════════════════════

    UC7 --- Google
    UC11 --- SMTP

    %% ═══════════════════════════════════════════
    %%               STYLING
    %% ═══════════════════════════════════════════

    classDef actor fill:#DCEDC8,stroke:#33691E,stroke-width:2px,color:#1B5E20,font-weight:bold
    classDef external fill:#E3F2FD,stroke:#1565C0,stroke-width:2px,color:#0D47A1,font-weight:bold
    classDef usecase fill:#FFF9C4,stroke:#F57F17,stroke-width:1px,color:#000
    classDef support fill:#F3E5F5,stroke:#7B1FA2,stroke-width:1px,color:#000
    classDef authuc fill:#E8F5E9,stroke:#2E7D32,stroke-width:1px,color:#000

    class User,AuthUser actor
    class Google,SMTP external
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7 usecase
    class UC8,UC9 authuc
    class UC10,UC11,UC12,UC13,UC14,UC15 support
```

## Actors

| Actor | Type | Description |
|-------|------|-------------|
| **User** | Primary | Non-authenticated user (visitor) |
| **Authenticated User** | Primary | Logged-in user (inherits from User) |
| **Google OAuth API** | External | Google's OAuth 2.0 service for social login |
| **SMTP Server** | External | Email server for sending OTP codes |

## Use Cases Summary

| # | Use Case | Description |
|---|----------|-------------|
| UC1 | Register Account | Create new account with email + username + password |
| UC2 | Login (Credentials) | Step 1 – Validate email & password |
| UC3 | Confirm Login (2FA) | Step 2 – Verify 6-digit OTP for two-factor auth |
| UC4 | Verify Email | Confirm email ownership with OTP after registration |
| UC5 | Forgot Password | Request password reset (sends OTP to email) |
| UC6 | Reset Password | Set new password using OTP verification |
| UC7 | Login with Google OAuth | Authenticate via Google social login |
| UC8 | Refresh Token | Obtain new JWT access token using refresh token |
| UC9 | View Login History | Browse past login attempts with filters |

## Include / Extend Relationships

| Relationship | Base → Included/Extended |
|-------------|--------------------------|
| `«include»` | Register → Validate Password, Send OTP Email |
| `«include»` | Login → Validate Credentials, Send OTP Email |
| `«include»` | Confirm Login → Validate OTP, Generate JWT |
| `«include»` | Verify Email → Validate OTP |
| `«include»` | Forgot Password → Send OTP Email |
| `«include»` | Reset Password → Validate OTP, Validate Password |
| `«include»` | Login with Google → Generate JWT |
| `«include»` | Refresh Token → Generate JWT |
| `«extend»` | Lock Account → Login *(triggered after 3 failed attempts)* |
