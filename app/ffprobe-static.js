//
// With credits to https://github.com/eugeneware/ffmpeg-static
//
const os = require('os');
const path = require('path');

const platform = os.platform();
if (platform !== 'darwin' && platform !== 'linux' && platform !== 'win32') {
  console.error('Unsupported platform.');
  process.exit(1);
}

const arch = os.arch();
if (platform === 'darwin' && arch !== 'x64') {
  console.error('Unsupported architecture.');
  process.exit(1);
}

const resolvedPath = require.resolve('ffprobe-static');

console.log('__dirname', __dirname);

const ffprobePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'ffprobe-static',
  'bin',
  platform,
  arch,
  platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
);

console.log('ffprobePath:', ffprobePath);

exports.path = ffprobePath;
