const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server...');

const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: 4000 },
  stdio: 'inherit'
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});
