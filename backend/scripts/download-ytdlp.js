const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
const YTDLP_PATH = path.join(__dirname, '..', 'yt-dlp');

console.log('📥 Downloading yt-dlp binary...');

if (process.platform === 'win32') {
  // On Windows, use the .exe version
  console.log('⏭️  Skipping yt-dlp download on Windows. Will use youtube-dl-exec package.');
  process.exit(0);
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      followRedirects: true,
      maxRedirects: 5
    }, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.destroy();
        downloadFile(response.headers.location, destPath)
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
        file.close();
        // Make executable
        fs.chmod(destPath, 0o755, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

downloadFile(YTDLP_URL, YTDLP_PATH)
  .then(() => {
    console.log('✅ yt-dlp downloaded successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.warn('⚠️  Warning: Could not download yt-dlp binary.');
    console.warn('Error:', err.message);
    console.warn('The application will attempt to use youtube-dl-exec from node_modules.');
    // Don't fail the entire build process
    process.exit(0);
  });
