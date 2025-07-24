import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { TYPES } from './types';

// Domain Services
import { UserDomainService } from '../../domain/services/UserDomainService';
import { RoomDomainService } from '../../domain/services/RoomDomainService';

// Repository Interfaces
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { IRoomRepository } from '../../domain/repositories/IRoomRepository';

// Repository Implementations
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { PrismaRoomRepository } from '../repositories/PrismaRoomRepository';

// Use Cases
import { CreateUserUseCase } from '../../application/use-cases/CreateUserUseCase';
import { GetUserUseCase } from '../../application/use-cases/GetUserUseCase';
import { UpdateUserUseCase } from '../../application/use-cases/UpdateUserUseCase';
import { CreateRoomUseCase } from '../../application/use-cases/CreateRoomUseCase';
import { JoinRoomUseCase } from '../../application/use-cases/JoinRoomUseCase';

// Infrastructure Services
import { BcryptPasswordService } from '../services/BcryptPasswordService';
import { JWTTokenService } from '../services/JWTTokenService';
import { ConsoleLogger } from '../services/ConsoleLogger';

/**
 * Dependency Injection Container
 * Manages all application dependencies and their lifecycles
 */
export class DIContainer {
  private container: Container;

  constructor() {
    this.container = new Container();
    this.registerDependencies();
  }

  private registerDependencies(): void {
    this.registerDatabase();
    this.registerRepositories();
    this.registerDomainServices();
    this.registerInfrastructureServices();
    this.registerUseCases();
  }

  private registerDatabase(): void {
    // Register Prisma client as singleton
    this.container.bind<PrismaClient>(TYPES.PrismaClient)
      .toConstantValue(new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      }));
  }

  private registerRepositories(): void {
    // User Repository
    this.container.bind<IUserRepository>(TYPES.UserRepository)
      .to(PrismaUserRepository)
      .inSingletonScope();

    // Room Repository
    this.container.bind<IRoomRepository>(TYPES.RoomRepository)
      .to(PrismaRoomRepository)
      .inSingletonScope();
  }

  private registerDomainServices(): void {
    // User Domain Service
    this.container.bind<UserDomainService>(TYPES.UserDomainService)
      .to(UserDomainService)
      .inSingletonScope();

    // Room Domain Service
    this.container.bind<RoomDomainService>(TYPES.RoomDomainService)
      .to(RoomDomainService)
      .inSingletonScope();
  }

  private registerInfrastructureServices(): void {
    // Password Service
    this.container.bind(TYPES.PasswordService)
      .to(BcryptPasswordService)
      .inSingletonScope();

    // Token Service
    this.container.bind(TYPES.TokenService)
      .to(JWTTokenService)
      .inSingletonScope();

    // Logger
    this.container.bind(TYPES.Logger)
      .to(ConsoleLogger)
      .inSingletonScope();
  }

  private registerUseCases(): void {
    // User Use Cases
    this.container.bind<CreateUserUseCase>(TYPES.CreateUserUseCase)
      .to(CreateUserUseCase)
      .inTransientScope();

    this.container.bind<GetUserUseCase>(TYPES.GetUserUseCase)
      .to(GetUserUseCase)
      .inTransientScope();

    this.container.bind<UpdateUserUseCase>(TYPES.UpdateUserUseCase)
      .to(UpdateUserUseCase)
      .inTransientScope();

    // Room Use Cases
    this.container.bind<CreateRoomUseCase>(TYPES.CreateRoomUseCase)
      .to(CreateRoomUseCase)
      .inTransientScope();

    this.container.bind<JoinRoomUseCase>(TYPES.JoinRoomUseCase)
      .to(JoinRoomUseCase)
      .inTransientScope();
  }

  /**
   * Get a dependency from the container
   */
  public get<T>(identifier: symbol): T {
    return this.container.get<T>(identifier);
  }

  /**
   * Check if a dependency is bound
   */
  public isBound(identifier: symbol): boolean {
    return this.container.isBound(identifier);
  }

  /**
   * Rebind a dependency (useful for testing)
   */
  public rebind<T>(identifier: symbol): any {
    return this.container.rebind<T>(identifier);
  }

  /**
   * Unbind a dependency
   */
  public unbind(identifier: symbol): void {
    if (this.container.isBound(identifier)) {
      this.container.unbind(identifier);
    }
  }

  /**
   * Get the underlying Inversify container (for advanced usage)
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Dispose of the container and clean up resources
   */
  public async dispose(): Promise<void> {
    try {
      // Close database connections
      const prisma = this.container.get<PrismaClient>(TYPES.PrismaClient);
      await prisma.$disconnect();
    } catch (error) {
      console.error('Error disposing container:', error);
    }
  }
}

// Export singleton instance
export const container = new DIContainer();
