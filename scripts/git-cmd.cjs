const { execSync } = require('child_process');
const path = require('path');

const gitExe = 'C:\\Users\\Administrator\\AppData\\Local\\GitHubDesktop\\app-3.6.10\\resources\\app\\git\\cmd\\git.exe';
const args = process.argv.slice(2).join(' ');

try {
  const out = execSync(`"${gitExe}" ${args}`, { stdio: 'inherit' });
} catch (e) {
  process.exit(e.status || 1);
}
