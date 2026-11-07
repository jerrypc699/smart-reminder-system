const { spawnSync } = require('child_process');

const gitExe = 'C:\\Users\\Administrator\\AppData\\Local\\GitHubDesktop\\app-3.6.10\\resources\\app\\git\\cmd\\git.exe';
const args = process.argv.slice(2);

const result = spawnSync(gitExe, args, { stdio: 'inherit' });
process.exit(result.status || 0);
