import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function uploadDirectory(dirPath) {
  const files = readdirSync(dirPath, { withFileTypes: true });

  for (const file of files) {
    const fullPath = join(dirPath, file.name);
    
    if (file.isDirectory()) {
      await uploadDirectory(fullPath);
    } else if (file.name.endsWith('.m4a')) {
      const fileContent = readFileSync(fullPath);
      const storagePath = fullPath.replace(/^.*?public\/sounds-m4a\//, '');
      const storageRef = ref(storage, storagePath);
      
      try {
        await uploadBytes(storageRef, fileContent, {
          contentType: 'audio/mp4',
        });
        console.log(`✅ Uploaded: ${storagePath}`);
      } catch (error) {
        console.error(`❌ Failed to upload ${storagePath}:`, error);
      }
    }
  }
}

async function main() {
  const soundsDir = resolve(__dirname, '../public/sounds-m4a');
  
  try {
    console.log('Starting upload to Firebase Storage...');
    await uploadDirectory(soundsDir);
    console.log('Upload complete!');
  } catch (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }
}

main();
