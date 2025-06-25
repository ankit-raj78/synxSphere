// Prisma Database Initialization Script for SyncSphere
// This script initializes the database using Prisma migrations
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import { DatabaseService } from '../lib/prisma';

// Load environment variables
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database with Prisma...');
    
    // Test Prisma connection
    await prisma.$connect();
    console.log('✅ Connected to database successfully');

    // Run Prisma migrations to ensure schema is up to date
    console.log('� Running Prisma migrations...');
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Database migrations completed successfully!');
    } catch (migrationError) {
      console.log('⚠️ Migration command failed, trying to push schema...');
      try {
        execSync('npx prisma db push', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('✅ Database schema pushed successfully!');
      } catch (pushError) {
        console.error('❌ Failed to apply schema:', pushError);
        throw pushError;
      }
    }

    // Generate Prisma client to ensure it's up to date
    console.log('📦 Generating Prisma client...');
    try {
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Prisma client generated successfully!');
    } catch (generateError) {
      console.log('⚠️ Client generation failed, but continuing...');
    }

    // Verify database health
    console.log('🔍 Verifying database health...');
    const healthCheck = await DatabaseService.healthCheck();
    
    if (healthCheck.status === 'ok') {
      console.log('✅ Database health check passed!');
    } else {
      console.log('⚠️ Database health check failed, but connection works');
    }

    // Query existing tables to verify setup
    const tableQuery = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('📋 Available tables:');
    (tableQuery as any[]).forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Optionally create a test admin user if none exists
    console.log('👤 Checking for admin user...');
    const adminUser = await prisma.user.findFirst({
      where: {
        profile: {
          path: ['role'],
          equals: 'admin'
        }
      }
    });

    if (!adminUser) {
      console.log('🔐 No admin user found. You may want to create one manually.');
      console.log('💡 Use the auth registration endpoint or run: npx prisma studio');
    } else {
      console.log('✅ Admin user exists');
    }
    
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);
    
    if (error.code === 'P1001') {
      console.log('💡 Cannot reach database server. Please ensure it is running.');
      console.log('💡 PostgreSQL: brew services start postgresql (Mac)');
      console.log('💡 Docker: docker-compose up postgres');
    } else if (error.code === 'P1003') {
      console.log('💡 Database does not exist. Please create it first:');
      console.log(`💡 CREATE DATABASE ${process.env.DATABASE_URL?.split('/').pop() || 'syncsphere'};`);
    } else if (error.code === 'P1000') {
      console.log('💡 Authentication failed. Please check your database credentials.');
      console.log('💡 Verify your DATABASE_URL in .env file');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database initialization completed successfully!');
      console.log('💡 You can now run: npm run dev');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database initialization failed:', error);
      console.log('💡 Try running: npx prisma migrate reset --force');
      process.exit(1);
    });
}

export default initializeDatabase;
