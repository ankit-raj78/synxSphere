# 🎵 SyncSphere - AI-Powered Music Collaboration Platform

SyncSphere is an innovative platform that connects musicians worldwide through intelligent AI matching and collaborative music creation. Create, share, and mix music together in real-time with advanced audio processing capabilities.

## ✨ Features

- **🤖 AI-Powered Matching**: Find perfect musical collaborators based on style, genre, and compatibility
- **🎚️ Real-time Audio Mixing**: Professional-grade mixing interface with individual track controls
- **🎵 Audio Separation**: AI-powered source separation for stems (bass, drums, vocals, other)
- **🌐 Global Collaboration**: Connect with musicians worldwide in virtual music rooms
- **📊 Audio Analysis**: Automatic tempo, key, and musical analysis
- **🎧 High-Quality Processing**: Professional audio tools and effects
- **🔒 Secure Platform**: User authentication and secure file storage

## 🚀 Quick Start

### Prerequisites Check
```bash
./check-prerequisites.sh
```

### Local Development
```bash
# Install dependencies
npm install

# Start local services (PostgreSQL, MongoDB, Redis)
brew services start postgresql
brew services start mongodb-community
brew services start redis

# Start the application
npm run dev

# Start audio service (separate terminal)
cd services/audio-service && npm start
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

### Frontend
- **Next.js 14** with TypeScript
- **Tailwind CSS** for styling
- **React** components for UI
- **Real-time WebSocket** connections

### Backend Services
- **Audio Service** (Node.js/Express) - Audio processing and analysis
- **User Service** (Node.js/Express) - Authentication and user management
- **Recommendation Service** (Python/FastAPI) - AI matching algorithms
- **Session Service** (Node.js/Express) - Real-time collaboration

### Databases
- **PostgreSQL** - User data, rooms, audio metadata
- **MongoDB** - Recommendations and analytics
- **Redis** - Sessions and caching

### Audio Processing
- **FFmpeg** - Audio format conversion
- **AI Models** - Source separation and analysis
- **Web Audio API** - Client-side audio manipulation

## 🛠️ Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
```

### macOS Deployment
```bash
./check-prerequisites.sh    # Check system requirements
./build-and-test.sh        # Build and test application
./deploy-aws.sh            # Deploy to AWS
./setup-aws-database.sh    # Setup RDS PostgreSQL
./validate-aws-deployment.sh # Validate deployment
```

### Service Management
```bash
# Start all services locally
./start-dev.sh

# Test complete workflow
./test-complete-mixing-workflow.js

# Health checks
curl http://localhost:3000/api/health
curl http://localhost:3002/health
```

## 📦 Tech Stack

### Frontend
- Next.js 14
- TypeScript
- Tailwind CSS
- React Hook Form
- Framer Motion

### Backend
- Node.js / Express
- Python / FastAPI
- PostgreSQL
- MongoDB
- Redis

### Audio Processing
- FFmpeg
- Web Audio API
- AI/ML Models for source separation

### Infrastructure
- AWS ECS Fargate
- AWS RDS PostgreSQL
- AWS ECR
- AWS Secrets Manager
- Docker containerization

## 🌟 Key Features Deep Dive

### AI-Powered Matching
- Musical style analysis
- Genre compatibility scoring
- Collaboration history tracking
- Real-time availability matching

### Audio Mixing Interface
- Individual track volume controls
- Real-time effects processing
- Professional EQ and filters
- Export capabilities

### Source Separation
- AI-powered stem isolation
- Bass, drums, vocals, other separation
- High-quality audio processing
- Real-time preview

## 🔧 Environment Setup

### Required Environment Variables
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=syncsphere
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# Services
AUDIO_SERVICE_URL=http://localhost:3002
USER_SERVICE_URL=http://localhost:3001
RECOMMENDATION_SERVICE_URL=http://localhost:8000

# Optional: Cloud Storage
S3_BUCKET_NAME=your-bucket
AWS_REGION=us-east-1
```

## 📊 Performance

- **Audio Processing**: Real-time source separation
- **Collaboration**: Low-latency WebSocket connections
- **Scalability**: Containerized microservices architecture
- **Storage**: Efficient audio file compression and streaming

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- [macOS Deployment Guide](DEPLOY_MACOS.md)
- [Development Setup](DEVELOPMENT_GUIDE.md)
- [Troubleshooting](TROUBLESHOOTING.md)

### Getting Help
1. Check the documentation above
2. Run `./check-prerequisites.sh` for system requirements
3. Run `./validate-aws-deployment.sh` for deployment issues
4. Check the [Issues](https://github.com/your-username/synxSphere/issues) page

---

**Built with ❤️ for the global music community**