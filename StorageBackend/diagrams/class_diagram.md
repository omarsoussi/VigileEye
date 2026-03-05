```mermaid
classDiagram
    direction TB

    %% Domain Layer
    subgraph "Domain Layer"
        class Recording {
            +string ID
            +string CameraID
            +RecordingStatus Status
            +StorageMode StorageMode
            +time.Time CreatedAt
            +time.Time UpdatedAt
        }

        class CameraStorageConfig {
            +string CameraID
            +StorageMode StorageMode
            +int RetentionDays
            +float64 QuotaGB
        }

        class RecordingStatus {
            <<enumeration>>
            recording
            completed
            failed
        }

        class StorageMode {
            <<enumeration>>
            local
            cloud
        }

        class Camera {
            +string ID
            +string OwnerUserID
            +bool IsOnline
        }
    end

    %% Application Layer
    subgraph "Application Layer"
        class StartRecordingUseCase {
            -RecordingRepository recordingRepo
            -CameraService cameraService
            +Execute(userID, cameraID) Recording
        }

        class StopRecordingUseCase {
            -RecordingRepository recordingRepo
            +Execute(userID, cameraID)
        }

        class ListRecordingsUseCase {
            -RecordingRepository recordingRepo
            +ByCamera(cameraID) []Recording
        }
    end

    %% Infrastructure Layer
    subgraph "Infrastructure Layer"
        class RecordingRepository {
            <<interface>>
            +GetByID(id) Recording
            +Save(recording Recording)
        }

        class CameraService {
            <<interface>>
            +GetCamera(cameraID) Camera
        }
    end

    %% Relationships
    Recording "1" --> "1" Camera : belongs to
    CameraStorageConfig "1" --> "1" Camera : configures
    StartRecordingUseCase --> RecordingRepository : uses
    StartRecordingUseCase --> CameraService : uses
    StopRecordingUseCase --> RecordingRepository : uses
    ListRecordingsUseCase --> RecordingRepository : uses
