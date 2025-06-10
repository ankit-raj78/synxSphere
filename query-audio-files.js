// 查询数据库中的音频文件
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
    
    console.log('数据库中的音频文件:')
    console.log('总数:', result.rows.length)
    
    if (result.rows.length === 0) {
      console.log('没有找到音频文件记录')
      return []
    }
    
    result.rows.forEach((file, index) => {
      console.log(`${index + 1}. ID: ${file.id}`)
      console.log(`   文件名: ${file.filename}`)
      console.log(`   原始名: ${file.original_name}`) 
      console.log(`   路径: ${file.file_path}`)
      console.log(`   大小: ${Math.round(file.file_size / 1024)} KB`)
      console.log(`   类型: ${file.mime_type}`)
      console.log(`   创建时间: ${file.created_at}`)
      console.log('---')
    })
    
    return result.rows
    
  } catch (error) {
    console.error('查询失败:', error)
    return []
  } finally {
    await pool.end()
  }
}

queryAudioFiles()
