# Content Security Policy (CSP) Guide

This document provides guidance on the Content Security Policy (CSP) configuration for the Ambient Player application.

## Current CSP Configuration

The application uses a Content Security Policy to enhance security by controlling which resources can be loaded. The current CSP is defined in `index.html`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://storage.googleapis.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://*.firebaseio.com https://*.googleapis.com; 
               media-src 'self' https://storage.googleapis.com https://*.r2.dev https://*.r2.cloudflarestorage.com https://assets.mixkit.co https://firebasestorage.googleapis.com blob:; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

## CSP Directives Explained

- **default-src 'self'**: By default, only allow resources from the same origin
- **connect-src**: Controls which URLs the app can connect to (for fetch, XHR, WebSockets)
  - Includes Google Storage, R2 storage, and Firebase APIs
- **media-src**: Controls which URLs can be used as sources for audio and video elements
  - Includes various storage providers and fallback audio sources
- **script-src**: Controls which scripts can be executed
  - 'self': Scripts from the same origin
  - 'unsafe-inline': Inline scripts (needed for some frameworks)
- **style-src**: Controls which styles can be applied
  - 'self': Stylesheets from the same origin
  - 'unsafe-inline': Inline styles (needed for some frameworks)

## Audio Source Domains

The following domains are allowed for audio sources:

1. **self**: Local audio files served from the application
2. **storage.googleapis.com**: Google Cloud Storage
3. **\*.r2.dev** and **\*.r2.cloudflarestorage.com**: Cloudflare R2 Storage
4. **assets.mixkit.co**: Fallback audio files for development
5. **firebasestorage.googleapis.com**: Firebase Storage

## Maintaining the CSP

When adding new audio sources or integrating with new services, you'll need to update the CSP accordingly:

1. **Adding a new audio source domain**:
   - Add the domain to the `media-src` directive in `index.html`
   - Example: `media-src 'self' https://storage.googleapis.com https://new-domain.com`

2. **Adding a new API endpoint**:
   - Add the domain to the `connect-src` directive in `index.html`
   - Example: `connect-src 'self' https://api.new-service.com`

3. **Testing CSP changes**:
   - After updating the CSP, check the browser console for CSP violation errors
   - Use the browser's network tab to verify resources are loading correctly

## CSP and the AudioSourceProvider

The application uses an `AudioSourceProvider` service to centralize audio URL logic and ensure compliance with the CSP. This service:

1. Prioritizes CDN URLs when available
2. Uses development proxies for Firebase Storage URLs in development
3. Falls back to allowed domains for development and testing
4. Ensures all audio URLs come from allowed sources

When modifying the `AudioSourceProvider`, ensure that any new URL sources are also added to the CSP.

## Common CSP Issues

1. **"Refused to load media" errors**:
   - Check if the domain is included in the `media-src` directive
   - Verify the URL format matches the allowed pattern

2. **"Refused to connect" errors**:
   - Check if the domain is included in the `connect-src` directive
   - Verify the API endpoint is accessible

3. **Mixed content warnings**:
   - Ensure all URLs use HTTPS instead of HTTP

## Resources

- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [CSP Scanner](https://cspscanner.com/)
