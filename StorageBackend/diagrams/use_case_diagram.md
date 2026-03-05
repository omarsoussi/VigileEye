```mermaid
graph TB
    subgraph Actors
        User((User/Owner))
        Admin((Admin))
        CamMgmt[Camera Management<br/>Service]
        AuthSvc[Auth Service]
        StreamSvc[Streaming Service<br/>MediaMTX]
    end

    subgraph "Storage Service Use Cases"
        UC1([Start Recording])
        UC2([Stop Recording])
        UC3([List Recordings<br/>by Camera])
        UC4([List Recordings<br/>by User])
        UC5([Get Active<br/>Recordings])
        UC6([Delete Recording])
        UC7([Download Recording])
        UC8([Stream Recording<br/>HTTP Range])
        UC9([Get Thumbnail])
        UC10([Get Camera<br/>Storage Settings])
        UC11([Update Camera<br/>Storage Settings])
        UC12([List All User<br/>Settings])
        UC13([Get Camera<br/>Storage Metrics])
        UC14([Get User<br/>Storage Metrics])
        UC15([Get Download<br/>Token])
        UC16([Update<br/>Subscription Tier])
        UC17([Health Check])
        UC18([Auto Retention<br/>Cleanup])
    end

    %% User interactions
    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15
    User --> UC17

    %% Admin interactions
    Admin --> UC16
    Admin --> UC18

    %% Service dependencies
    UC1 -.-> CamMgmt : Verify camera ownership
    UC1 -.-> AuthSvc : Validate JWT
    UC1 -.-> StreamSvc : Pull RTSP stream via FFmpeg
    UC2 -.-> AuthSvc : Validate JWT
    UC7 -.-> AuthSvc : Validate JWT
    UC11 -.-> AuthSvc : Validate JWT

    %% Include relationships
    UC1 -.->|includes| UC10 : Get or create config
    UC7 -.->|includes| UC15 : Generate signed URL
    UC18 -.->|includes| UC6 : Delete expired recordings

    %% Extend relationships
    UC8 -.->|extends| UC7 : Partial content streaming

    style UC1 fill:#66bb6a,stroke:#333
    style UC2 fill:#ef5350,stroke:#333
    style UC7 fill:#42a5f5,stroke:#333
    style UC18 fill:#f9a825,stroke:#333,stroke-width:2px
    style UC11 fill:#ab47bc,stroke:#333
```
