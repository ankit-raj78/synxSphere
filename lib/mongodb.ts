// MongoDB functionality has been disabled - using PostgreSQL instead
// This file is kept to avoid import errors but all functions are disabled

export async function getDatabase(): Promise<any> {
  throw new Error('MongoDB is disabled. Please use PostgreSQL through DatabaseManager instead.')
}

export async function connectToDatabase(): Promise<any> {
  throw new Error('MongoDB is disabled. Please use PostgreSQL through DatabaseManager instead.')
}

// Export a dummy default to avoid import errors
export default Promise.resolve(null)
