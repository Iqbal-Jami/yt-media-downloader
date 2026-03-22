const https = require('https');
const fs = require('fs');
const path = require('path');

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
const YTDLP_PATH = path.join(__dirname, '..', 'yt-dlp');

console.log('📥 Checking yt-dlp availability...');

if (process.platform === 'win32') {
  console.log('⏭️  Windows detected. Skipping yt-dlp binary download.');
  process.exit(0);
}

// Check if file already exists
if (fs.existsSync(YTDLP_PATH)) {
  console.log('✅ yt-dlp already exists!');
  process.exit(0);
}

console.log('📥 Downloading yt-dlp binary...');
console.log(`URL: ${YTDLP_URL}`);

// Set timeout for the whole download
const downloadTimeout = setTimeout(() => {
  console.warn('⚠️ Download timeout after 5 minutes. Moving forward without yt-dlp.');
  process.exit(0);
}, 5 * 60 * 1000);

function downloadFile(url, destPath, redirectCount = 0) {
  if (redirectCount > 10) {
    throw new Error('Too many redirects');
  }

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const request = https.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      },
      timeout: 30000
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.destroy();
        fs.unlink(destPath, () => {});
        downloadFile(response.headers.location, destPath, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        file.destroy();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close((err) => {
          if (err) {
            reject(err);
          } else {
            // Make executable
            fs.chmod(destPath, 0o755, (err) => {
              if (err) reject(err);
              else resolve();
            });
          }
        });
      });
    });

    request.on('error', (err) => {
      file.destroy();
      fs.unlink(destPath, () => {});
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.destroy();
      fs.unlink(destPath, () => {});
      reject(new Error('Request timeout'));
    });
  });
}

downloadFile(YTDLP_URL, YTDLP_PATH)
  .then(() => {
    clearTimeout(downloadTimeout);
    console.log('✅ yt-dlp downloaded successfully!');
    process.exit(0);
  })
  .catch((err) => {
    clearTimeout(downloadTimeout);
    console.warn('⚠️  Could not download yt-dlp binary.');
    console.warn('Error:', err.message);
    console.warn('ℹ️ The application will use youtube-dl-exec from node_modules.');
    process.exit(0);
  });
