```mermaid
graph TB
    subgraph Actors
        User((User/Viewer))
        Admin((Admin/Owner))
        CamMgmt[Camera Management<br/>Service]
        AuthSvc[Auth Service]
    end

    subgraph "Streaming Service Use Cases"
        UC1([Start Stream])
        UC2([Stop Stream])
        UC3([Get Stream Status])
        UC4([List Active Streams])
        UC5([Get Real-Time Info])
        UC6([WebRTC Negotiate<br/>SDP Offer/Answer])
        UC7([Add ICE Candidate])
        UC8([Disconnect Viewer])
        UC9([Get ICE Servers])
        UC10([Get Latest Frame<br/>HTTP Polling Fallback])
        UC11([Probe Stream URL])
        UC12([Health Check])
    end

    %% User interactions
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC12

    %% Admin interactions
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC5
    Admin --> UC6
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10
    Admin --> UC11

    %% Service dependencies
    UC1 -.-> CamMgmt : Fetch camera details
    UC6 -.-> CamMgmt : Auto-start stream
    UC1 -.-> AuthSvc : Validate JWT
    UC2 -.-> AuthSvc : Validate JWT
    UC6 -.-> AuthSvc : Validate JWT

    %% Include relationships
    UC6 -.->|includes| UC1 : Auto-start if needed

    style UC6 fill:#f9a825,stroke:#333,stroke-width:2px
    style UC1 fill:#66bb6a,stroke:#333
    style UC2 fill:#ef5350,stroke:#333
```
