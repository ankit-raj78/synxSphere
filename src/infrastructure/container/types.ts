/**
 * Dependency injection type constants
 * Used to identify dependencies in the IoC container
 */
export const TYPES = {
  // Database Clients
  PrismaClient: Symbol.for('PrismaClient'),
  RedisClient: Symbol.for('RedisClient'),
  MongoClient: Symbol.for('MongoClient'),

  // Repositories
  UserRepository: Symbol.for('UserRepository'),
  RoomRepository: Symbol.for('RoomRepository'),
  AudioFileRepository: Symbol.for('AudioFileRepository'),
  AudioAnalysisRepository: Symbol.for('AudioAnalysisRepository'),
  SessionRepository: Symbol.for('SessionRepository'),

  // Domain Services
  UserDomainService: Symbol.for('UserDomainService'),
  RoomDomainService: Symbol.for('RoomDomainService'),
  AudioDomainService: Symbol.for('AudioDomainService'),

  // Infrastructure Services
  PasswordService: Symbol.for('PasswordService'),
  TokenService: Symbol.for('TokenService'),
  EmailService: Symbol.for('EmailService'),
  FileStorageService: Symbol.for('FileStorageService'),
  AudioAnalysisService: Symbol.for('AudioAnalysisService'),
  EventBus: Symbol.for('EventBus'),
  EventStore: Symbol.for('EventStore'),
  Logger: Symbol.for('Logger'),

  // Use Cases
  CreateUserUseCase: Symbol.for('CreateUserUseCase'),
  GetUserUseCase: Symbol.for('GetUserUseCase'),
  UpdateUserUseCase: Symbol.for('UpdateUserUseCase'),
  DeleteUserUseCase: Symbol.for('DeleteUserUseCase'),
  LoginUseCase: Symbol.for('LoginUseCase'),
  RegisterUseCase: Symbol.for('RegisterUseCase'),
  RefreshTokenUseCase: Symbol.for('RefreshTokenUseCase'),
  
  CreateRoomUseCase: Symbol.for('CreateRoomUseCase'),
  JoinRoomUseCase: Symbol.for('JoinRoomUseCase'),
  GetRoomUseCase: Symbol.for('GetRoomUseCase'),
  UpdateRoomUseCase: Symbol.for('UpdateRoomUseCase'),
  
  AnalyzeAudioUseCase: Symbol.for('AnalyzeAudioUseCase'),
  UploadAudioUseCase: Symbol.for('UploadAudioUseCase'),

  // Controllers
  AuthController: Symbol.for('AuthController'),
  UserController: Symbol.for('UserController'),
  RoomController: Symbol.for('RoomController'),
  AudioController: Symbol.for('AudioController'),
  SessionController: Symbol.for('SessionController'),

  // Configuration
  DatabaseConfig: Symbol.for('DatabaseConfig'),
  AppConfig: Symbol.for('AppConfig'),
} as const;
