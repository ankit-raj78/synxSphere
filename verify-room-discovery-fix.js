/**
 * Verification script for Room Discovery Fix
 * This checks if all components are properly configured for room refresh
 */

const fs = require('fs')
const path = require('path')

function checkFile(filePath, checks) {
  console.log(`\n📄 Checking ${filePath}...`)
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`)
    return false
  }

  const content = fs.readFileSync(filePath, 'utf8')
  let allPassed = true

  checks.forEach(check => {
    const passed = check.test(content)
    console.log(`   ${passed ? '✅' : '❌'} ${check.description}`)
    if (!passed) allPassed = false
  })

  return allPassed
}

console.log('🔍 Verifying Room Discovery Fix Implementation')

// Check RoomRecommendations component
const roomRecommendationsChecks = [
  {
    description: 'Has forwardRef implementation',
    test: content => content.includes('forwardRef<RoomRecommendationsRef')
  },
  {
    description: 'Has useImperativeHandle hook',
    test: content => content.includes('useImperativeHandle')
  },
  {
    description: 'Has refreshTrigger prop',
    test: content => content.includes('refreshTrigger?:')
  },
  {
    description: 'Has refreshRooms method',
    test: content => content.includes('refreshRooms: () => Promise<void>')
  },
  {
    description: 'useEffect depends on refreshTrigger',
    test: content => content.includes('[userId, refreshTrigger]')
  },
  {
    description: 'Fetches from /api/rooms',
    test: content => content.includes("fetch('/api/rooms'")
  }
]

const roomRecommendationsPath = path.join(__dirname, 'components', 'RoomRecommendations.tsx')
const roomRecommendationsPassed = checkFile(roomRecommendationsPath, roomRecommendationsChecks)

// Check Dashboard page
const dashboardChecks = [
  {
    description: 'Imports useRef from React',
    test: content => content.includes('useRef')
  },
  {
    description: 'Imports RoomRecommendationsRef',
    test: content => content.includes('RoomRecommendationsRef')
  },
  {
    description: 'Has roomRecommendationsRef state',
    test: content => content.includes('roomRecommendationsRef')
  },
  {
    description: 'Has refreshTrigger state',
    test: content => content.includes('refreshTrigger')
  },
  {
    description: 'Has handleRoomCreated function',
    test: content => content.includes('handleRoomCreated')
  },
  {
    description: 'Passes ref to RoomRecommendations',
    test: content => content.includes('ref={roomRecommendationsRef}')
  },
  {
    description: 'Passes onRoomCreated to RoomCreation',
    test: content => content.includes('onRoomCreated={handleRoomCreated}')
  }
]

const dashboardPath = path.join(__dirname, 'app', 'dashboard', 'page.tsx')
const dashboardPassed = checkFile(dashboardPath, dashboardChecks)

// Check RoomCreation component
const roomCreationChecks = [
  {
    description: 'Has onRoomCreated prop interface',
    test: content => content.includes('onRoomCreated?: (roomId: string) => void')
  },
  {
    description: 'Calls onRoomCreated on success',
    test: content => content.includes('onRoomCreated(room.id)')
  }
]

const roomCreationPath = path.join(__dirname, 'components', 'RoomCreation.tsx')
const roomCreationPassed = checkFile(roomCreationPath, roomCreationChecks)

// Summary
console.log('\n📊 Verification Summary:')
console.log(`   RoomRecommendations component: ${roomRecommendationsPassed ? '✅ Passed' : '❌ Failed'}`)
console.log(`   Dashboard page: ${dashboardPassed ? '✅ Passed' : '❌ Failed'}`)
console.log(`   RoomCreation component: ${roomCreationPassed ? '✅ Passed' : '❌ Failed'}`)

const overallSuccess = roomRecommendationsPassed && dashboardPassed && roomCreationPassed

console.log(`\n🎯 Overall Status: ${overallSuccess ? '✅ READY' : '❌ NEEDS FIXES'}`)

if (overallSuccess) {
  console.log('\n🎉 Room Discovery Fix Implementation Complete!')
  console.log('\nHow it works:')
  console.log('1. When user creates a room in RoomCreation component')
  console.log('2. onRoomCreated callback is triggered in Dashboard')
  console.log('3. Dashboard increments refreshTrigger and calls refreshRooms()')
  console.log('4. RoomRecommendations re-fetches rooms from API')
  console.log('5. New room appears immediately in Find Rooms list')
  console.log('\nTo test:')
  console.log('1. Run: npm run dev')
  console.log('2. Run: node test-room-refresh.js')
  console.log('3. Or manually test in browser by creating a room')
} else {
  console.log('\n❌ Some components need fixes before the feature will work properly.')
}
