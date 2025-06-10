// Test script for compositions feature
const axios = require('axios')

const BASE_URL = 'http://localhost:3002'

class CompositionsTest {
    constructor() {
        this.token = null
        this.userId = null
        this.uploadedFiles = []
        this.compositions = []
    }

    async registerAndLogin() {
        console.log('🔐 Registering and logging in...')
        
        try {
            // Register user
            const registerData = {
                username: `testuser_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
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
            
            console.log('✅ Login successful')
            return true
        } catch (error) {
            console.error('❌ Login failed:', error.response?.data?.error || error.message)
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
            console.log(`   Found ${this.compositions.length} composition(s)`)
            
            return true
        } catch (error) {
            console.error('❌ Fetch compositions failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testFetchUploadedTracks() {
        console.log('\n📋 Testing fetch uploaded tracks...')
        
        try {
            const response = await axios.get(`${BASE_URL}/api/audio/files`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            })

            this.uploadedFiles = response.data
            console.log('✅ Fetch uploaded tracks successful')
            console.log(`   Found ${this.uploadedFiles.length} uploaded file(s)`)
            
            return true
        } catch (error) {
            console.error('❌ Fetch uploaded tracks failed:', error.response?.data?.error || error.message)
            return false
        }
    }

    async testCreateComposition() {
        if (this.uploadedFiles.length < 2) {
            console.log('\n⚠️  Need at least 2 uploaded files to test composition')
            return false
        }

        console.log('\n🎵 Testing create composition...')
        
        try {
            const trackIds = this.uploadedFiles.slice(0, 2).map(file => file.id)
            
            const response = await axios.post(`${BASE_URL}/api/audio/compose`, {
                trackIds: trackIds,
                roomId: null,
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
            return false
        }
    }

    async testStreamComposition() {
        if (this.compositions.length === 0) {
            console.log('\n⚠️  No compositions available to test streaming')
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

    async run() {
        console.log('🧪 Testing SyncSphere Compositions Feature')
        console.log('=' .repeat(50))

        const tests = [
            () => this.registerAndLogin(),
            () => this.testFetchCompositions(),
            () => this.testFetchUploadedTracks(),
            () => this.testCreateComposition(),
            () => this.testStreamComposition()
        ]

        let passed = 0
        let failed = 0

        for (const test of tests) {
            const result = await test()
            if (result) {
                passed++
            } else {
                failed++
            }
        }

        console.log('\n📊 Test Results:')
        console.log(`   ✅ Passed: ${passed}`)
        console.log(`   ❌ Failed: ${failed}`)
        console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

        if (failed === 0) {
            console.log('\n🎉 All compositions tests passed!')
        } else {
            console.log('\n⚠️  Some tests failed. Please check the logs above.')
        }
    }
}

// Run the test
const test = new CompositionsTest()
test.run().catch(console.error)
