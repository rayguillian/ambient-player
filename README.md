# Ambient Player

A React-based ambient sound player that provides soothing brown noise and rain sounds for focus and relaxation.

## Architecture Overview

### Core Components

- **AmbientPlayer**: Main component handling audio playback and UI
- **AudioEngine**: Manages audio context, audio nodes, and playback
- **TrackManager**: Handles track loading and management
- **AudioController**: Provides a clean API for audio control
- **AudioSourceProvider**: Centralizes audio URL logic and ensures CSP compliance

### Technical Stack

- React + TypeScript
- Firebase Storage for audio hosting
- IndexedDB for local audio caching
- Web Audio API for audio processing
- Tailwind CSS for styling

## Features

- Dual-track playback (Brown Noise and Rain)
- Volume control for each track
- Smooth crossfading between tracks
- Local caching for offline playback
- Shuffle functionality
- Calming visual interface
- Loading indicators
- Error handling and recovery
- Content Security Policy (CSP) compliance

## Implementation Details

### Audio Pipeline

1. **Storage**: Audio files are stored in Firebase Storage in two main folders:
   - "Brown Noise Stream"
   - "Rain Makes Everything Better"

2. **Caching Layer**:
   - Uses IndexedDB to store audio files locally
   - Implements cache cleanup for files older than 7 days
   - Preserves cache between sessions

3. **Playback System**:
   - Uses Web Audio API for high-quality audio processing
   - Implements smooth crossfading between tracks
   - Maintains separate audio contexts for brown noise and rain

4. **Audio Source Management**:
   - Centralizes audio URL logic in the AudioSourceProvider
   - Prioritizes CDN URLs when available
   - Uses development proxies for Firebase Storage URLs
   - Falls back to allowed domains for development and testing
   - Ensures all audio URLs comply with Content Security Policy

### Architecture

The application follows a modular architecture:

1. **Services Layer**:
   - `AudioEngine`: Handles audio context and node management
   - `TrackManager`: Manages track loading and selection
   - `AudioController`: Provides a clean API for audio control
   - `AudioSourceProvider`: Manages audio source URLs and CSP compliance

2. **UI Layer**:
   - `AmbientPlayer`: Main component
   - `PlayerControls`: Handles user interactions
   - `PlayerHeader`: Displays calming phrases
   - `PlayerFooter`: Displays footer text
   - `ErrorDisplay`: Shows error messages
   - `LoadingIndicator`: Shows loading state

3. **Hooks Layer**:
   - `useAudioPlayer`: Custom hook for using the audio controller

## Security

The application uses a Content Security Policy (CSP) to enhance security by controlling which resources can be loaded. See [docs/CSP-GUIDE.md](docs/CSP-GUIDE.md) for details on the CSP configuration and how to maintain it.

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment file:
   ```bash
   cp .env.example .env
   ```

4. For local development:
   - No need to set up Firebase or CDN
   - The app will use fallback audio files from mixkit.co
   - Development proxy is configured to handle audio requests

5. Start development server:
   ```bash
   npm run dev
   ```
   
6. For production setup:
   - Follow the CDN setup guide in [docs/CDN-SETUP.md](docs/CDN-SETUP.md)
   - Configure Firebase (optional) or use Cloudflare R2
   - Update .env with proper configuration
   - Review the CSP configuration in [docs/CSP-GUIDE.md](docs/CSP-GUIDE.md)

## Environment Variables

Create a `.env` file with:

```
# Firebase Configuration (Optional - not needed for development)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# CDN URL (Required for production, not needed for development)
VITE_CDN_URL=https://your-cdn-url.com/ambient-player
```

## Improvements Over Previous Version

1. **Architecture**:
   - Modular architecture with clear separation of concerns
   - Better code organization and maintainability
   - Reduced complexity in individual components
   - Added AudioSourceProvider for centralized URL management

2. **Audio Processing**:
   - Centralized audio context management
   - Improved error handling and recovery
   - Better volume control and crossfading

3. **State Management**:
   - Cleaner state management with custom hooks
   - Better loading and error states
   - More predictable state flow

4. **Caching System**:
   - Preserved cache between sessions
   - Better cache validation
   - Improved error handling

5. **User Experience**:
   - Added loading indicators
   - Better error messages and recovery
   - Improved UI responsiveness

6. **Security**:
   - Added Content Security Policy (CSP)
   - Centralized audio URL management for CSP compliance
   - Comprehensive documentation for maintaining CSP
