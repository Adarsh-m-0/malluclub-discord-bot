require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

// Basic bot permissions (Administrator for simplicity)
const PERMISSIONS = '8';

// Alternative with specific permissions
const SPECIFIC_PERMISSIONS = '1342177345'; // Calculated permissions

console.log('🤖 Discord Bot Invite Links:');
console.log('');
console.log('📋 Simple Invite (Administrator):');
console.log(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`);
console.log('');
console.log('🔒 Specific Permissions Invite:');
console.log(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${SPECIFIC_PERMISSIONS}&scope=bot%20applications.commands`);
console.log('');
console.log('🚀 Alternative Format:');
console.log(`https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot+applications.commands&permissions=8`);
console.log('');
console.log('💡 If you still get "code grant" error, try:');
console.log(`https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&scope=bot%20applications.commands`);
