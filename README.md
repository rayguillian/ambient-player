# Ambient Player

A web-based ambient noise player featuring brown noise and rain sounds.

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firebase Storage in your project
   - Go to Project Settings > General and scroll down to "Your apps"
   - Click the web icon (`</>`) to register a web app
   - Copy the Firebase configuration values
   - Create a `.env` file based on `.env.example` and fill in your Firebase configuration:
     ```
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
     VITE_FIREBASE_APP_ID=your-app-id
     ```

4. Upload audio files:
```bash
npm run upload
```

5. Start the development server:
```bash
npm run dev
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run upload` - Upload audio files to Firebase Storage

## Project Structure

- `/public/sounds-m4a/` - Audio files (m4a format)
- `/src/components/` - React components
- `/src/config/` - Configuration files
- `/src/utils/` - Utility functions
- `/scripts/` - Build and maintenance scripts
