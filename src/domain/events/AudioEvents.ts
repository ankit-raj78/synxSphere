import { DomainEvent } from './DomainEvent';

/**
 * Event fired when audio analysis is completed
 */
export class AudioAnalyzedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      fileId: string;
      userId: string;
      analysisId: string;
      fileName: string;
      duration: number;
      bpm?: number;
      key?: string;
      energy?: number;
      danceability?: number;
      genres?: string[];
    }
  ) {
    super(data.fileId);
  }

  getEventName(): string {
    return 'audio.analyzed';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): AudioAnalyzedEvent {
    return new AudioAnalyzedEvent(obj.data);
  }
}

/**
 * Event fired when audio upload starts
 */
export class AudioUploadStartedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      fileId: string;
      userId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }
  ) {
    super(data.fileId);
  }

  getEventName(): string {
    return 'audio.upload_started';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): AudioUploadStartedEvent {
    return new AudioUploadStartedEvent(obj.data);
  }
}

/**
 * Event fired when audio upload completes
 */
export class AudioUploadCompletedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      fileId: string;
      userId: string;
      fileName: string;
      filePath: string;
      fileSize: number;
      duration?: number;
    }
  ) {
    super(data.fileId);
  }

  getEventName(): string {
    return 'audio.upload_completed';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): AudioUploadCompletedEvent {
    return new AudioUploadCompletedEvent(obj.data);
  }
}

/**
 * Event fired when audio processing fails
 */
export class AudioProcessingFailedEvent extends DomainEvent {
  constructor(
    public readonly data: {
      fileId: string;
      userId: string;
      fileName: string;
      error: string;
      errorCode: string;
    }
  ) {
    super(data.fileId);
  }

  getEventName(): string {
    return 'audio.processing_failed';
  }

  getEventData(): any {
    return this.data;
  }

  static fromPlainObject(obj: any): AudioProcessingFailedEvent {
    return new AudioProcessingFailedEvent(obj.data);
  }
}
