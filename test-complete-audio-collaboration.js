// Comprehensive test for the complete audio collaboration feature
const axios = require('axios')
const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3002'

class ComprehensiveAudioTest {
    constructor() {
        this.token = null
        this.userId = null
        this.uploadedFiles = []
        this.compositions = []
        this.roomId = null
    }

    async registerAndLogin() {
        console.log('🔐 Setting up test user...')
        
        try {
            // Register user
            const registerData = {
                username: `audiotest_${Date.now()}`,
                email: `audiotest_${Date.now()}@example.com`,
                password: 'testpassword123'
            }

            await axios.post(`${BASE_URL}/api/auth/register`, registerData)

            // Login user
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: registerData.email,
                password: registerData.password
            })

            this.token = loginResponse.data.token
            this.userId = loginResponse.data.user.id
            
            console.log('✅ User setup successful')
            return true
        } catch (error) {
            console.error('❌ User setup failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async createTestRoom() {
        console.log('\n🏠 Creating test room...')
        
        try {
            const roomData = {
                name: `Audio Test Room ${Date.now()}`,
                description: 'Testing audio collaboration features',
                genre: 'Electronic',
                isLive: true
            }

            const response = await axios.post(`${BASE_URL}/api/rooms`, roomData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            })

            this.roomId = response.data.id
            console.log('✅ Room created successfully')
            console.log(`   Room ID: ${this.roomId}`)
            return true
        } catch (error) {
            console.error('❌ Room creation failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async uploadTestAudioFiles() {
        console.log('\n⬆️ Uploading test audio files...')
        
        try {
            // Create test audio files
            const testFiles = [
                { name: 'test_bass.wav', content: this.generateTestAudioContent() },
                { name: 'test_drums.wav', content: this.generateTestAudioContent() },
                { name: 'test_vocals.wav', content: this.generateTestAudioContent() }
            ]

            for (const testFile of testFiles) {
                const filePath = path.join(process.cwd(), 'uploads', testFile.name)
                fs.writeFileSync(filePath, testFile.content)

                const FormData = require('form-data')
                const formData = new FormData()
                formData.append('audio', fs.createReadStream(filePath))

                const response = await axios.post(`${BASE_URL}/api/audio/upload`, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${this.token}`
                    }
                })

                this.uploadedFiles.push(...response.data)
                console.log(`   ✅ Uploaded: ${testFile.name}`)
            }

            console.log(`✅ Successfully uploaded ${this.uploadedFiles.length} files`)
            return true
        } catch (error) {
            console.error('❌ File upload failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    generateTestAudioContent() {
        // Generate simple WAV file header for testing
        const buffer = Buffer.alloc(1024)
        buffer.write('RIFF', 0)
        buffer.writeUInt32LE(1016, 4)
        buffer.write('WAVE', 8)
        buffer.write('fmt ', 12)
        buffer.writeUInt32LE(16, 16)
        buffer.writeUInt16LE(1, 20)
        buffer.writeUInt16LE(1, 22)
        buffer.writeUInt32LE(44100, 24)
        buffer.writeUInt32LE(88200, 28)
        buffer.writeUInt16LE(2, 32)
        buffer.writeUInt16LE(16, 34)
        buffer.write('data', 36)
        buffer.writeUInt32LE(988, 40)
        
        return buffer
    }

    async testFetchUploadedTracks() {
        console.log('\n📋 Testing fetch uploaded tracks...')
        
        try {
            const response = await axios.get(`${BASE_URL}/api/audio/files`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            const allFiles = response.data
            console.log('✅ Fetch uploaded tracks successful')
            console.log(`   Found ${allFiles.length} total uploaded files`)
            
            return true
        } catch (error) {
            console.error('❌ Fetch uploaded tracks failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testFetchCompositions() {
        console.log('\n📋 Testing fetch compositions...')
        
        try {
            const response = await axios.get(`${BASE_URL}/api/audio/compositions`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            this.compositions = response.data
            console.log('✅ Fetch compositions successful')
            console.log(`   Found ${this.compositions.length} compositions`)
            
            return true
        } catch (error) {
            console.error('❌ Fetch compositions failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testCreateComposition() {
        if (this.uploadedFiles.length < 2) {
            console.log('\n⚠️ Need at least 2 uploaded files to test composition')
            return false
        }

        console.log('\n🎵 Testing create composition...')
        
        try {
            const trackIds = this.uploadedFiles.slice(0, 2).map(file => file.id)
            
            const response = await axios.post(`${BASE_URL}/api/audio/compose`, {
                trackIds: trackIds,
                roomId: this.roomId,
                settings: {
                    format: 'mp3',
                    bitrate: '192k',
                    sampleRate: 44100
                }
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                }
            })

            console.log('✅ Composition creation successful')
            console.log(`   Output file: ${response.data.outputFile}`)
            console.log(`   Source tracks: ${response.data.sourceTrackCount}`)
            
            // Refresh compositions list
            await this.testFetchCompositions()
            
            return true
        } catch (error) {
            console.error('❌ Composition creation failed:', error.response?.data?.error || error.message)
            console.error('   Full error:', error.response?.data)
            return false
        }
    }

    async testStreamAudio() {
        console.log('\n🎵 Testing audio streaming...')
        
        if (this.uploadedFiles.length === 0) {
            console.log('   ⚠️ No uploaded files to test streaming')
            return false
        }

        try {
            const file = this.uploadedFiles[0]
            const response = await axios.get(`${BASE_URL}/api/audio/stream/${file.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                responseType: 'arraybuffer'
            })

            console.log('✅ Audio streaming successful')
            console.log(`   Content-Type: ${response.headers['content-type']}`)
            console.log(`   Content-Length: ${response.headers['content-length']} bytes`)
            
            return true
        } catch (error) {
            console.error('❌ Audio streaming failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testStreamComposition() {
        if (this.compositions.length === 0) {
            console.log('\n⚠️ No compositions available to test streaming')
            return false
        }

        console.log('\n🎵 Testing composition streaming...')
        
        try {
            const composition = this.compositions[0]
            const response = await axios.get(`${BASE_URL}/api/audio/compositions/stream/${composition.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                responseType: 'arraybuffer'
            })

            console.log('✅ Composition streaming successful')
            console.log(`   Content-Type: ${response.headers['content-type']}`)
            console.log(`   Content-Length: ${response.headers['content-length']} bytes`)
            
            return true
        } catch (error) {
            console.error('❌ Composition streaming failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testDeleteUploadedFile() {
        if (this.uploadedFiles.length === 0) {
            console.log('\n⚠️ No uploaded files to test deletion')
            return false
        }

        console.log('\n🗑️ Testing file deletion...')
        
        try {
            const fileToDelete = this.uploadedFiles[this.uploadedFiles.length - 1]
            
            const response = await axios.delete(`${BASE_URL}/api/audio/delete?id=${fileToDelete.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            console.log('✅ File deletion successful')
            console.log(`   Deleted file: ${fileToDelete.original_name}`)
            
            return true
        } catch (error) {
            console.error('❌ File deletion failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testDeleteComposition() {
        if (this.compositions.length === 0) {
            console.log('\n⚠️ No compositions to test deletion')
            return false
        }

        console.log('\n🗑️ Testing composition deletion...')
        
        try {
            const compositionToDelete = this.compositions[this.compositions.length - 1]
            
            const response = await axios.delete(`${BASE_URL}/api/audio/compositions/delete?id=${compositionToDelete.id}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            console.log('✅ Composition deletion successful')
            console.log(`   Deleted composition: ${compositionToDelete.title}`)
            
            return true
        } catch (error) {
            console.error('❌ Composition deletion failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async run() {
        console.log('🧪 Comprehensive SyncSphere Audio Collaboration Test')
        console.log('='.repeat(60))

        const tests = [
            { name: 'User Registration & Login', fn: () => this.registerAndLogin() },
            { name: 'Room Creation', fn: () => this.createTestRoom() },
            { name: 'Audio File Upload', fn: () => this.uploadTestAudioFiles() },
            { name: 'Fetch Uploaded Tracks', fn: () => this.testFetchUploadedTracks() },
            { name: 'Fetch Compositions', fn: () => this.testFetchCompositions() },
            { name: 'Create Composition', fn: () => this.testCreateComposition() },
            { name: 'Stream Audio File', fn: () => this.testStreamAudio() },
            { name: 'Stream Composition', fn: () => this.testStreamComposition() },
            { name: 'Delete Audio File', fn: () => this.testDeleteUploadedFile() },
            { name: 'Delete Composition', fn: () => this.testDeleteComposition() }
        ]

        let passed = 0
        let failed = 0
        const results = []

        for (const test of tests) {
            console.log(`\n🧪 Running: ${test.name}`)
            const startTime = Date.now()
            
            try {
                const result = await test.fn()
                const duration = Date.now() - startTime
                
                if (result) {
                    passed++
                    results.push({ name: test.name, status: 'PASS', duration })
                    console.log(`   ✅ ${test.name} - PASSED (${duration}ms)`)
                } else {
                    failed++
                    results.push({ name: test.name, status: 'FAIL', duration })
                    console.log(`   ❌ ${test.name} - FAILED (${duration}ms)`)
                }
            } catch (error) {
                failed++
                const duration = Date.now() - startTime
                results.push({ name: test.name, status: 'ERROR', duration })
                console.log(`   💥 ${test.name} - ERROR (${duration}ms)`)
                console.error(`      ${error.message}`)
            }
        }

        console.log('\n📊 Test Results Summary:')
        console.log('='.repeat(60))
        results.forEach(result => {
            const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥'
            console.log(`   ${status} ${result.name.padEnd(25)} - ${result.status} (${result.duration}ms)`)
        })

        console.log(`\n📈 Overall Results:`)
        console.log(`   ✅ Passed: ${passed}`)
        console.log(`   ❌ Failed: ${failed}`)
        console.log(`   📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

        if (failed === 0) {
            console.log('\n🎉 All audio collaboration features working perfectly!')
            console.log('🚀 SyncSphere is ready for production!')
        } else {
            console.log('\n⚠️ Some tests failed. Please review the implementation.')
        }

        return { passed, failed, total: passed + failed }
    }
}

// Run the comprehensive test
const test = new ComprehensiveAudioTest()
test.run()
    .then((results) => {
        process.exit(results.failed === 0 ? 0 : 1)
    })
    .catch((error) => {
        console.error('💥 Test suite crashed:', error)
        process.exit(1)
    })
