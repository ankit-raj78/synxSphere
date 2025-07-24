# 🎵 SynxSphere - Music Collaboration Platform

SynxSphere is a modern music collaboration platform built with Clean Architecture principles, featuring AI-powered musician matching, real-time collaboration, and professional audio mixing capabilities.

## ✨ Features

- **🤖 AI-Powered Matching**: Connect with compatible musicians using intelligent algorithms
- **�️ Real-time Audio Collaboration**: Professional-grade mixing with live WebSocket synchronization
- **� AI Source Separation**: Advanced stem isolation (bass, drums, vocals, other)
- **� Integrated openDAW Studio**: Full-featured Digital Audio Workstation accessible at `/studio`
- **💬 Live Chat & Collaboration**: Event-driven real-time communication
- **🔒 Secure Authentication**: JWT-based authentication with refresh tokens
- **📱 Cross-platform**: Responsive design for all devices

## 🏗️ Clean Architecture Overview

SynxSphere implements Clean Architecture with clear separation of concerns:

### Domain Layer (`src/domain/`)
- **Entities**: Core business objects (User, Room, AudioFile, Collaboration)
- **Value Objects**: Immutable types (UserId, Email, AudioMetadata)
- **Domain Events**: Business events (UserRegistered, RoomCreated, AudioUploaded)
- **Repository Interfaces**: Data access contracts

### Application Layer (`src/application/`)
- **Use Cases**: Business logic operations (CreateUser, JoinRoom, UploadAudio)
- **DTOs**: Data transfer objects for external communication
- **Services**: Application-specific logic and orchestration

### Infrastructure Layer (`src/infrastructure/`)
- **Database**: Prisma ORM with PostgreSQL integration
- **WebSocket**: Real-time communication with Socket.IO
- **Event Bus**: Domain event handling and broadcasting
- **External Services**: Third-party integrations

### Presentation Layer (`src/presentation/`)
- **HTTP Controllers**: RESTful API endpoints with error handling
- **Middleware**: Authentication, validation, and request processing
- **WebSocket Handlers**: Real-time event management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL
- npm or yarn

### Setup & Installation
```bash
# Clone and install dependencies
git clone <repository-url>
cd synxSphere
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and other settings

# Setup database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Access the Application
- **Main App**: http://localhost:3000
- **Studio**: http://localhost:3000/studio
- **API Docs**: http://localhost:3000/api

## 🔧 Development
npm run dev

# Full service control
npm run services:start    # Start all
npm run services:stop     # Stop all
npm run services:restart  # Restart all
```

### Access Points
- **🎵 Main App**: http://localhost:3000
- **🎧 Studio Integration**: http://localhost:3000/studio/opendaw
- **🎹 Direct OpenDAW**: https://localhost:8080
```

The application will be available at:
- **Main App**: http://localhost:3000
- **openDAW Studio**: http://localhost:3000/studio
- **API Documentation**: http://localhost:3000/api-docs

### Starting Individual Services
```bash
# Audio service (separate terminal)
cd services/audio-service && npm start

# Session service (separate terminal)
cd services/session-service && npm start

# User service (separate terminal)
cd services/user-service && npm start
```

### AWS Deployment (macOS)
```bash
# Complete deployment guide
open DEPLOY_MACOS.md

# Quick deployment
./check-prerequisites.sh    # Check requirements
./build-and-test.sh        # Build and test locally
./deploy-aws.sh            # Deploy to AWS
./setup-aws-database.sh    # Setup database
./validate-aws-deployment.sh # Validate deployment
```

## 📖 Documentation

- **[macOS AWS Deployment Guide](DEPLOY_MACOS.md)** - Complete AWS deployment for macOS
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Local development setup
- **[Audio Features Documentation](AUDIO_FEATURES_COMPLETE.md)** - Audio processing capabilities
- **[API Documentation](API_DOCS.md)** - REST API reference

## 🏗️ Architecture

### Clean Architecture Implementation
SynxSphere follows Clean Architecture principles with clear separation of concerns:

#### Domain Layer (`src/domain/`)
- **Entities**: Core business objects (User, Room, AudioFile, Collaboration)
- **Value Objects**: Immutable types (UserId, Email, AudioMetadata) 
- **Domain Events**: Business events (UserRegistered, RoomCreated, AudioUploaded)
- **Repository Interfaces**: Data access contracts

#### Application Layer (`src/application/`)
- **Use Cases**: Business logic (CreateUser, JoinRoom, UploadAudio)
- **DTOs**: Data transfer objects for API communication
- **Services**: Application-specific logic and orchestration

#### Infrastructure Layer (`src/infrastructure/`)
- **Database**: Prisma ORM with PostgreSQL
- **WebSocket**: Real-time communication with Socket.IO
- **Event Bus**: Domain event handling system
- **External Integrations**: Third-party service connections

#### Presentation Layer (`src/presentation/`)
- **Controllers**: RESTful API endpoints with clean error handling
- **Middleware**: Authentication, validation, request processing
- **WebSocket Handlers**: Real-time event management

### Technology Stack
- **Next.js 14** with TypeScript and App Router
- **Prisma ORM** with PostgreSQL database
- **Socket.IO** for real-time WebSocket communication
- **Tailwind CSS** for responsive styling
- **JWT Authentication** with refresh token support
- **Inversify** for dependency injection
- **Jest** for comprehensive testing
- **Zod** for runtime type validation
- **Integrated openDAW Studio** - Full-featured DAW accessible at `/studio`

### Event-Driven Architecture
- Domain events trigger side effects (notifications, analytics)
- WebSocket integration for real-time updates
- Loose coupling between components via EventBus
- Scalable event handling with proper error boundaries

## 🛠️ Available Scripts

### Development Commands
```bash
# Development server
npm run dev                 # Start Next.js development server

# Database operations  
npx prisma generate        # Generate Prisma client
npx prisma db push         # Push schema changes to database
npx prisma studio          # Open Prisma Studio GUI

# Testing
npm run test               # Run Jest tests
npm run test:watch         # Run tests in watch mode

# Build & Production
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint for code quality
```

### API Testing with curl
```bash
# User Registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# User Login  
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Create Room (with auth token)
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"My Music Room","description":"Let'\''s make music!"}'

# Health Check
curl http://localhost:3000/api/health
```

### Application URLs
- **Main Application**: http://localhost:3000
- **openDAW Studio**: http://localhost:3000/studio  
- **Dashboard**: http://localhost:3000/dashboard
- **API Health Check**: http://localhost:3000/api/health

### WebSocket Events
Real-time features support these events:
- `join-room`: Join a collaboration room
- `audio-upload`: Share audio files in real-time
- `playback-sync`: Synchronize audio playback
- `chat-message`: Send messages to room participants

## 🔐 Authentication & Security

### JWT Authentication Flow
1. User registers/logs in via `/api/auth/register` or `/api/auth/login`
2. Server returns access token (15min) and refresh token (7 days)
3. Client includes access token in Authorization header
4. Use refresh token at `/api/auth/refresh` to get new access token

### Security Features
- Password hashing with bcrypt
- JWT token validation middleware
- CORS protection
- Input validation with Zod schemas
- SQL injection prevention with Prisma

## 📦 Tech Stack

### Core Technologies
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Prisma ORM**: Database management with PostgreSQL  
- **Socket.IO**: Real-time WebSocket communication
- **Tailwind CSS**: Utility-first styling

### Architecture Patterns
- **Clean Architecture**: Separation of concerns with dependency inversion
- **Domain-Driven Design**: Rich domain models and bounded contexts
- **Event-Driven Architecture**: Loose coupling with domain events
- **Repository Pattern**: Data access abstraction
- **Use Case Pattern**: Business logic encapsulation

### Quality Assurance
- **Jest**: Unit and integration testing
- **Zod**: Runtime type validation
- **ESLint + Prettier**: Code quality and formatting
- **Inversify**: Dependency injection container

## 🌟 Key Features Deep Dive

### AI-Powered Matching
- Musical style analysis and compatibility scoring
- Collaboration history tracking
- Real-time availability matching
- Genre-based musician discovery

### Real-time Audio Collaboration  
- Live WebSocket synchronization
- Multi-user audio mixing interface
- Individual track volume controls
- Professional EQ and effects processing

### Integrated openDAW Studio
- Full-featured Digital Audio Workstation
- MIDI sequencing and editing capabilities
- Multi-track audio recording and playback
- Professional mixing and mastering tools
- Plugin support and built-in effects
- Project save/load functionality
- Accessible at `/studio` route

### Event-Driven Architecture
- Domain events for loose coupling
- Real-time notifications via WebSocket
- Scalable event handling system
- Comprehensive error boundaries

## 🔧 Environment Setup

### Required Environment Variables
```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/synxsphere"

# JWT Configuration  
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-token-secret"

# Application Configuration
NODE_ENV="development"
PORT=3000

# Optional: File Upload Configuration
MAX_FILE_SIZE=50000000  # 50MB
UPLOAD_DIR="./uploads"
```

### Development Setup
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client and setup database
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

## 📊 Performance & Scalability

### Clean Architecture Benefits
- **Maintainability**: Clear separation of concerns
- **Testability**: Isolated business logic for comprehensive testing
- **Scalability**: Event-driven architecture for horizontal scaling
- **Flexibility**: Easy to swap implementations (database, external services)

### Real-time Features
- **WebSocket Communication**: Low-latency bi-directional communication
- **Event-Driven Updates**: Efficient real-time synchronization
- **Connection Management**: Robust connection handling with reconnection
- **Room-based Broadcasting**: Targeted message delivery

### Database Optimization
- **Prisma ORM**: Type-safe queries with connection pooling
- **PostgreSQL**: ACID compliance for data integrity
- **Efficient Queries**: Optimized for collaboration workflows
- **Migration Support**: Version-controlled schema changes
- **Scalability**: Containerized microservices architecture
- **Storage**: Efficient audio file compression and streaming

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Follow Clean Architecture principles:
   - Add entities to `src/domain/entities/`
   - Create use cases in `src/application/use-cases/`
   - Implement repositories in `src/infrastructure/database/`
   - Add controllers to `src/presentation/http/controllers/`
4. Write tests for your changes (`npm run test`)
5. Ensure TypeScript compilation passes (`npx tsc --noEmit`)
6. Commit your changes (`git commit -m 'Add some amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Style Guidelines
- Follow TypeScript best practices
- Use dependency injection with Inversify
- Implement proper error handling
- Add comprehensive tests
- Document public APIs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql

# Test database connection
npx prisma db push

# Check Prisma client generation
npx prisma generate
```

#### Development Server Issues
```bash
# Check if port 3000 is available
lsof -ti:3000

# Kill process using port 3000 if needed
kill -9 $(lsof -ti:3000)

# Clear Next.js cache
rm -rf .next
npm run dev

# Check environment variables
cat .env | grep -v '^#'
```

#### openDAW Studio Not Loading
```bash
# Verify studio page is accessible
curl -I http://localhost:3000/studio

# Check for console errors in browser
# Open http://localhost:3000/studio and check Developer Tools

# Verify static assets are served
curl -I http://localhost:3000/_next/static/
```

#### TypeScript Compilation Errors
```bash
# Regenerate Prisma client
npx prisma generate

# Check TypeScript configuration
npx tsc --noEmit

# Clear and rebuild
rm -rf .next node_modules
npm install
npm run dev
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Check server logs
tail -f .next/trace
```

### Documentation
- [Clean Architecture Guide](docs/CLEAN_ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)
- [WebSocket Events](docs/WEBSOCKET_EVENTS.md)

### Getting Help
1. Check the troubleshooting steps above
2. Verify environment setup with `npm run dev`
3. Test API endpoints with provided curl commands
4. Check the [Issues](https://github.com/your-username/synxSphere/issues) page for known problems

---

**Built with ❤️ for the global music community using Clean Architecture principles**