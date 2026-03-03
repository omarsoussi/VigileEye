/**
 * Domain exceptions for the streaming service.
 */

export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class CameraNotFoundError extends DomainError {
  constructor(cameraId: string) {
    super(`Camera ${cameraId} not found`, 'CAMERA_NOT_FOUND');
    this.name = 'CameraNotFoundError';
  }
}

export class StreamAlreadyActiveError extends DomainError {
  constructor(cameraId: string) {
    super(`Stream already active for camera ${cameraId}`, 'STREAM_ALREADY_ACTIVE');
    this.name = 'StreamAlreadyActiveError';
  }
}

export class StreamNotFoundError extends DomainError {
  constructor(cameraId: string) {
    super(`No active stream for camera ${cameraId}`, 'STREAM_NOT_FOUND');
    this.name = 'StreamNotFoundError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Access denied to this camera') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class StreamConnectionError extends DomainError {
  constructor(cameraId: string, reason: string) {
    super(`Failed to connect stream for camera ${cameraId}: ${reason}`, 'STREAM_CONNECTION_ERROR');
    this.name = 'StreamConnectionError';
  }
}

export class TransportNotFoundError extends DomainError {
  constructor(transportId: string) {
    super(`WebRTC transport ${transportId} not found`, 'TRANSPORT_NOT_FOUND');
    this.name = 'TransportNotFoundError';
  }
}

export class ConsumerNotFoundError extends DomainError {
  constructor(consumerId: string) {
    super(`Consumer ${consumerId} not found`, 'CONSUMER_NOT_FOUND');
    this.name = 'ConsumerNotFoundError';
  }
}

export class ProducerNotFoundError extends DomainError {
  constructor(cameraId: string) {
    super(`No active producer for camera ${cameraId}`, 'PRODUCER_NOT_FOUND');
    this.name = 'ProducerNotFoundError';
  }
}

export class SFUNotReadyError extends DomainError {
  constructor() {
    super('SFU workers not initialized', 'SFU_NOT_READY');
    this.name = 'SFUNotReadyError';
  }
}

export class IngestFailedError extends DomainError {
  constructor(cameraId: string, reason: string) {
    super(`Failed to ingest camera ${cameraId}: ${reason}`, 'INGEST_FAILED');
    this.name = 'IngestFailedError';
  }
}
