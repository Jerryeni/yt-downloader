const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function waitForVite() {
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get('http://localhost:5173', (res) => {
        resolve();
      });
      req.on('error', () => {
        setTimeout(check, 300);
      });
    };
    check();
  });
}

async function start() {
  console.log('Waiting for Vite dev server...');
  await waitForVite();
  console.log('Vite dev server is ready! Compiling main process...');

  const tsc = spawn('npx', ['tsc', '-p', 'tsconfig.main.json', '-w'], {
    shell: true,
    stdio: 'inherit',
  });

  // Small delay to ensure initial compilation finishes
  setTimeout(() => {
    console.log('Launching Electron...');
    const electron = spawn('npx', ['electron', '.'], {
      shell: true,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: 'http://localhost:5173',
      },
    });

    electron.on('close', (code) => {
      tsc.kill();
      process.exit(code || 0);
    });
  }, 1200);
}

start();
