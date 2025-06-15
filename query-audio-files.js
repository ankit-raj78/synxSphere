// Query audio files in database
const { Pool } = require('pg')

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'syncsphere',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
})

const queryAudioFiles = async () => {
  try {
    const query = `
      SELECT id, filename, original_name, file_path, file_size, mime_type, created_at 
      FROM audio_files 
      ORDER BY created_at DESC 
      LIMIT 10
    `
    
    const result = await pool.query(query)
    
    console.log('Audio files in database:')
    console.log('Total count:', result.rows.length)
    
    if (result.rows.length === 0) {
      console.log('No audio file records found')
      return []
    }
    
    result.rows.forEach((file, index) => {
      console.log(`${index + 1}. ID: ${file.id}`)
      console.log(`   Filename: ${file.filename}`)
      console.log(`   Original name: ${file.original_name}`) 
      console.log(`   Path: ${file.file_path}`)
      console.log(`   Size: ${Math.round(file.file_size / 1024)} KB`)
      console.log(`   Type: ${file.mime_type}`)
      console.log(`   Created at: ${file.created_at}`)
      console.log('---')
    })
      return result.rows
    
  } catch (error) {
    console.error('Query failed:', error)
    return []
  } finally {
    await pool.end()
  }
}

queryAudioFiles()
