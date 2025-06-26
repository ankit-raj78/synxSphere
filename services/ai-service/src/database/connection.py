"""
Database connection and session management
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

from .models import Base

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Database connection manager"""
    
    def __init__(self):
        self.database_url = os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Convert postgresql:// to postgresql+asyncpg:// for async support
        if self.database_url.startswith("postgresql://"):
            self.async_database_url = self.database_url.replace("postgresql://", "postgresql+asyncpg://")
        else:
            self.async_database_url = self.database_url
        
        # Create async engine
        self.async_engine = create_async_engine(
            self.async_database_url,
            poolclass=NullPool,
            echo=os.getenv("ENVIRONMENT") == "development"
        )
        
        # Create async session factory
        self.async_session_factory = sessionmaker(
            bind=self.async_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        logger.info(f"Database manager initialized with URL: {self.database_url}")
    
    async def create_tables(self):
        """Create database tables"""
        try:
            async with self.async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise
    
    async def close(self):
        """Close database connections"""
        if self.async_engine:
            await self.async_engine.dispose()
            logger.info("Database connections closed")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session with automatic cleanup"""
        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

# Global database manager instance
db_manager = DatabaseManager()

# Convenience functions for app lifecycle
async def init_db():
    """Initialize database (create tables if needed)"""
    try:
        await db_manager.create_tables()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

async def close_db():
    """Close database connections"""
    try:
        await db_manager.close()
        logger.info("Database closed successfully")
    except Exception as e:
        logger.error(f"Failed to close database: {e}")

# Dependency for FastAPI routes
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions"""
    async with db_manager.get_session() as session:
        yield session
