/**
 * Test the date formatting utilities to ensure they handle invalid dates properly
 */

const { formatDate, formatDateTime, formatRelativeTime } = require('./lib/date-utils');

// Test cases for date formatting
const testCases = [
  // Valid dates
  { input: new Date('2024-01-15T10:30:00Z'), desc: 'Valid Date object' },
  { input: '2024-01-15T10:30:00Z', desc: 'Valid ISO string' },
  { input: '2024-01-15', desc: 'Valid date string' },
  
  // Invalid dates
  { input: null, desc: 'null value' },
  { input: undefined, desc: 'undefined value' },
  { input: '', desc: 'empty string' },
  { input: 'invalid-date', desc: 'invalid date string' },
  { input: 'Invalid Date', desc: 'Invalid Date string' },
  { input: new Date('invalid'), desc: 'Invalid Date object' },
];

console.log('🔍 Testing Date Formatting Utilities');
console.log('====================================');

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.desc}`);
  console.log(`Input:`, testCase.input);
  
  try {
    const formatted = formatDate(testCase.input);
    const dateTime = formatDateTime(testCase.input);
    const relative = formatRelativeTime(testCase.input);
    
    console.log(`✅ formatDate: "${formatted}"`);
    console.log(`✅ formatDateTime: "${dateTime}"`);
    console.log(`✅ formatRelativeTime: "${relative}"`);
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
});

console.log('\n🎯 Testing edge cases...');

// Test with very old date
const oldDate = new Date('1900-01-01');
console.log(`Old date: ${formatDate(oldDate)}`);

// Test with future date
const futureDate = new Date('2030-12-31');
console.log(`Future date: ${formatDate(futureDate)}`);

// Test with timestamp
const timestamp = Date.now();
console.log(`Timestamp: ${formatDate(new Date(timestamp))}`);

console.log('\n✅ Date formatting tests completed!');
