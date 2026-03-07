graph TB

%% Actors
User((User))
Admin((Admin))

%% Main Use Cases
UC1([Start Recording])
UC2([Stop Recording])
UC3([View Recordings])
UC4([Download Recording])
UC5([Stream Recording])
UC6([Manage Storage Settings])
UC7([Delete Recording])
UC8([System Cleanup])

%% Actor relationships
User --> UC1
User --> UC2
User --> UC3
User --> UC4
User --> UC5
User --> UC6
User --> UC7

Admin --> UC8

%% Include relationships
UC4 -.->|<<include>> Generate Download Token| UC9([Generate Token])
UC1 -.->|<<include>> Check Storage Settings| UC10([Get Storage Settings])

%% Extend relationships
UC5 -.->|<<extend>> Partial Streaming| UC4
