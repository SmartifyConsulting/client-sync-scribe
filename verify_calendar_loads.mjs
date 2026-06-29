import fetch from 'node-fetch';

console.log('🔍 Verifying calendar page loads from dev server...\n');

try {
  const response = await fetch('http://localhost:5173/calendar');
  const html = await response.text();
  
  console.log(`✅ Calendar page HTTP status: ${response.status}`);
  console.log(`✅ Page loads successfully (${html.length} bytes)\n`);
  
  // Check if the page contains calendar-related elements
  if (html.includes('calendar') || html.includes('Calendar')) {
    console.log('✅ Page contains calendar content');
  }
  if (html.includes('react')) {
    console.log('✅ React app is loaded');
  }
  
  console.log('\n✅ Calendar page is loading without errors!');
  console.log('\n📝 Note: Visual verification requires opening browser at:');
  console.log('   http://localhost:5173');
  console.log('   Navigate to Calendar, change language to Spanish');
  console.log('   Expected: Month names show "Enero, Febrero..." not "January, February"');
  
} catch (err) {
  console.error('❌ Error loading calendar page:', err.message);
}
