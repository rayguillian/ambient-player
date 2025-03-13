/**
 * AudioSourceProvider - Service for managing audio source URLs
 * 
 * This service centralizes all audio URL logic and provides a consistent
 * way to get audio URLs that comply with Content Security Policy (CSP)
 * across different environments.
 */

import { AudioTrack } from '../types/audio';

// URL transformation types
export type UrlTransformer = (url: string, track: Partial<AudioTrack>) => string;

export interface AudioSourceOptions {
  /**
   * Whether to use the development proxy
   * @default true in development, false in production
   */
  useProxy?: boolean;
  
  /**
   * Whether to use the CDN
   * @default true if VITE_CDN_URL is defined
   */
  useCdn?: boolean;
  
  /**
   * Whether to use fallback URLs for development
   * @default true in development, false in production
   */
  useFallbacks?: boolean;
}

export class AudioSourceProvider {
  private isDevelopment: boolean;
  private cdnUrl: string | undefined;
  
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.cdnUrl = import.meta.env.VITE_CDN_URL;
  }
  
  /**
   * Gets the appropriate audio URL for the current environment
   */
  getAudioUrl(track: Partial<AudioTrack>, options: AudioSourceOptions = {}): string {
    // Set default options based on environment
    const useProxy = options.useProxy ?? this.isDevelopment;
    const useCdn = options.useCdn ?? !!this.cdnUrl;
    const useFallbacks = options.useFallbacks ?? this.isDevelopment;
    
    // Try CDN first if available and enabled
    if (useCdn && this.cdnUrl && track.fullPath) {
      const cdnUrl = this.getCdnUrl(track.fullPath);
      if (cdnUrl) {
        console.log('Using CDN URL:', cdnUrl);
        return cdnUrl;
      }
    }
    
    // Try Firebase Storage URL with proxy if in development
    if (track.url && track.url.includes('firebasestorage.googleapis.com')) {
      if (useProxy) {
        const proxyUrl = this.getProxyUrl(track.url);
        console.log('Using proxy URL for Firebase Storage:', proxyUrl);
        return proxyUrl;
      }
    }
    
    // Use fallback URLs for development if enabled
    if (useFallbacks && track.category) {
      const fallbackUrl = this.getFallbackUrl(track.category);
      if (fallbackUrl) {
        console.log('Using fallback URL for', track.category, ':', fallbackUrl);
        return fallbackUrl;
      }
    }
    
    // If all else fails, return the original URL
    // This might still fail due to CSP, but we've tried our best
    return track.url || '';
  }
  
  /**
   * Gets a CDN URL for the given path
   */
  private getCdnUrl(path: string): string {
    if (!this.cdnUrl) return '';
    
    // For development, use the proxy
    if (this.isDevelopment) {
      return `/api/cdn/${path}`;
    }
    
    // For production, use the CDN directly
    return `${this.cdnUrl}/${path}`;
  }
  
  /**
   * Gets a proxy URL for Firebase Storage
   */
  private getProxyUrl(url: string): string {
    try {
      const firebaseUrl = new URL(url);
      return `/api/storage${firebaseUrl.pathname}${firebaseUrl.search || ''}`;
    } catch (err) {
      console.error('Failed to convert Firebase URL to proxy URL:', err);
      return url;
    }
  }
  
  /**
   * Gets a fallback URL for the given category
   */
  private getFallbackUrl(category: string): string {
    if (category === 'brown-noise') {
      return 'https://assets.mixkit.co/sfx/preview/mixkit-forest-in-the-morning-2731.mp3';
    } else if (category === 'rain') {
      return 'https://assets.mixkit.co/sfx/preview/mixkit-ambient-rain-loop-2691.mp3';
    }
    
    return '';
  }
  
  /**
   * Adds cache-busting parameter to URL
   */
  addCacheBuster(url: string): string {
    // Skip if URL already contains parameters
    if (url.includes('?')) {
      return url;
    }
    
    const cacheBuster = `?t=${Date.now()}`;
    return url + cacheBuster;
  }
}

// Export singleton instance
export const audioSourceProvider = new AudioSourceProvider();
