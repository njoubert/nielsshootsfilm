import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import '../components/toast-notification';
import type { Album, Photo } from '../types/data-models';
import { fetchAlbumBySlug } from '../utils/api';
import { navigateTo, navigateToPhoto, routes } from '../utils/navigation';

// Import icons
import downloadIcon from '../assets/icons/download-simple.svg?raw';
import linkIcon from '../assets/icons/link.svg?raw';
import shareIcon from '../assets/icons/share-fat.svg?raw';
import closeIcon from '../assets/icons/x-circle.svg?raw';

/**
 * Full-page photo viewer with navigation, zoom, and sharing.
 */
@customElement('album-photo-page')
export class AlbumPhotoPage extends LitElement {
  // Grace period before showing loading screen (prevents flash on fast connections)
  private static readonly LOADING_GRACE_PERIOD_MS = 200;

  @property({ type: String }) albumSlug = '';
  @property({ type: String }) photoId = '';

  @state() private album?: Album;
  @state() private currentPhoto?: Photo;
  @state() private currentIndex = 0;
  @state() private loading = true;
  @state() private error = '';
  @state() private showExif = false;
  @state() private currentPhotoLoaded = false;
  @state() private loadingProgress = 0; // 0-100 percentage
  @state() private showLoadingScreen = false; // Only show after grace period
  @state() private toastMessage = '';
  @state() private toastVisible = false;

  // Cache blob URLs to prevent redundant network requests
  private imageBlobCache = new Map<string, string>();
  // Track current XHR request to cancel if needed
  private currentXHR: XMLHttpRequest | null = null;
  // Track bytes loaded for progress estimation
  private bytesLoaded = 0;
  // Delay showing loading screen to avoid flash on fast connections
  private loadingGracePeriodTimeout: number | null = null;

  // Background preloading state
  private backgroundXHR: XMLHttpRequest | null = null;
  private preloadIndex = 0;
  private isPreloading = false;

  static styles = css`
    :host {
      display: block;
      position: fixed;
      inset: 0;
      background-color: var(--color-background);
      z-index: 100;
    }

    .page-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .toolbar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 1rem 2rem;
      background: transparent;
      color: var(--color-text-primary);
      z-index: 10;
      height: 3rem;
      box-sizing: border-box;
      gap: 0.5rem;
    }

    .photo-counter {
      font-size: 0.9rem;
    }

    .toolbar-button {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
    }

    .toolbar-button:hover {
      opacity: 1;
      transform: scale(1.15);
    }

    .toolbar-button:active {
      transform: scale(0.95);
      opacity: 0.8;
    }

    .toolbar-button svg {
      width: 20px;
      height: 20px;
      fill: currentColor;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
    }

    .close-button svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
    }

    .close-button:hover {
      opacity: 1;
      transform: scale(1.15);
    }

    .close-button:active {
      transform: scale(0.95);
      opacity: 0.8;
    }

    .photo-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    .nav-button {
      position: absolute;
      top: 0;
      bottom: 0;
      background: transparent;
      border: none;
      color: var(--color-text-primary);
      font-size: 3rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      z-index: 5;
      opacity: 0.6;
      touch-action: manipulation;
    }

    .nav-button:hover {
      opacity: 1;
      transform: scale(1.2);
    }

    .nav-button:active {
      transform: scale(0.95);
      opacity: 0.8;
    }

    .nav-button:disabled {
      opacity: 0.2;
      cursor: not-allowed;
    }

    .nav-button.prev {
      left: 0;
    }

    .nav-button.next {
      right: 0;
    }

    .photo-container img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .exif-panel {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 1rem 2rem;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 9px;
      line-height: 1.4;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: space-between;
      white-space: nowrap;
      overflow-x: auto;
      z-index: 10;
      height: 4rem;
    }

    .exif-items {
      display: flex;
      align-items: center;
    }

    .exif-item {
      display: inline;
    }

    .exif-item::after {
      content: ' • ';
      margin: 0 0.5rem;
    }

    .exif-item:last-child::after {
      content: '';
      margin: 0;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-text-secondary);
    }

    .error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--color-error);
      padding: 2rem;
      text-align: center;
    }

    .photo-loading {
      position: absolute;
      inset: 0;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
      gap: 1rem;
      z-index: 1;
    }

    .photo-loading[hidden] {
      display: none;
    }

    .photo-loading-text {
      font-size: 1rem;
    }

    .progress-bar-container {
      width: 300px;
      height: 4px;
      background-color: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.5rem;
    }

    .progress-bar {
      height: 100%;
      background-color: var(--color-accent, #007aff);
      border-radius: 2px;
    }

    .progress-percentage {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-top: 0.25rem;
    }

    .photo-thumbnail {
      opacity: 0.3;
    }

    @media (max-width: 768px) {
      .nav-button {
        font-size: 2rem;
        width: 50px;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleKeyDown);
    this.disableBodyScroll(true);
    void this.loadAlbumData();

    // Request fullscreen on mobile devices
    void this.requestFullscreenIfMobile();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
    this.disableBodyScroll(false);

    // Exit fullscreen when leaving the page
    void this.exitFullscreen();

    // Clean up any pending timeouts
    if (this.loadingGracePeriodTimeout !== null) {
      clearTimeout(this.loadingGracePeriodTimeout);
      this.loadingGracePeriodTimeout = null;
    }

    // Cancel any background preloading
    if (this.backgroundXHR) {
      this.backgroundXHR.abort();
      this.backgroundXHR = null;
    }
    this.isPreloading = false;
  }

  private async loadAlbumData() {
    console.debug(`Loading album data for photo page ${this.albumSlug}`);
    this.loading = true;
    this.error = '';

    try {
      const album = await fetchAlbumBySlug(this.albumSlug);
      if (!album) {
        this.error = 'Gallery not found';
        this.loading = false;
        return;
      }

      this.album = album;

      // Find the photo by ID
      const index = album.photos.findIndex((p: Photo) => p.id === this.photoId);
      if (index === -1) {
        this.error = 'Photo not found in gallery';
        this.loading = false;
        return;
      }

      this.currentIndex = index;
      this.currentPhoto = album.photos[index];
      this.loading = false;

      // Load the current photo
      this.loadCurrentPhoto();
    } catch {
      this.error = 'Failed to load gallery';
      this.loading = false;
    }
  }

  private loadCurrentPhoto() {
    if (!this.currentPhoto) return;

    const photoId = this.currentPhoto.id;
    const photoUrl = this.currentPhoto.url_display;

    // Cancel any pending XHR
    if (this.currentXHR) {
      this.currentXHR.abort();
      this.currentXHR = null;
    }

    // Cancel any pending loading screen grace period
    if (this.loadingGracePeriodTimeout !== null) {
      clearTimeout(this.loadingGracePeriodTimeout);
      this.loadingGracePeriodTimeout = null;
    }

    // Check if already in cache
    if (this.imageBlobCache.has(photoId)) {
      this.currentPhotoLoaded = true;
      this.showLoadingScreen = false;
      this.loadingProgress = 0;

      // Start background preloading since photo is already loaded
      this.startBackgroundPreloading();
      return;
    }

    // Mark as loading, but don't show loading screen immediately
    this.currentPhotoLoaded = false;
    this.showLoadingScreen = false;
    this.loadingProgress = 0;
    this.bytesLoaded = 0;

    // Show loading screen after grace period if photo hasn't loaded yet
    // This prevents flash on fast connections
    this.loadingGracePeriodTimeout = window.setTimeout(() => {
      if (!this.currentPhotoLoaded) {
        this.showLoadingScreen = true;
      }
      this.loadingGracePeriodTimeout = null;
    }, AlbumPhotoPage.LOADING_GRACE_PERIOD_MS);

    // Use XMLHttpRequest to track progress
    const xhr = new XMLHttpRequest();
    this.currentXHR = xhr;

    xhr.open('GET', photoUrl, true);
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (this.currentXHR === xhr) {
        this.bytesLoaded = e.loaded;
        if (e.lengthComputable) {
          // Server sent Content-Length, show actual progress
          this.loadingProgress = Math.round((e.loaded / e.total) * 100);
        }
        // Don't show fake progress if no Content-Length
      }
    };

    xhr.onload = () => {
      if (this.currentXHR === xhr && xhr.status === 200) {
        const blob = xhr.response as Blob;
        const objectUrl = URL.createObjectURL(blob);

        // Cache the blob URL for this photo
        this.imageBlobCache.set(photoId, objectUrl);

        // Cancel grace period if still pending
        if (this.loadingGracePeriodTimeout !== null) {
          clearTimeout(this.loadingGracePeriodTimeout);
          this.loadingGracePeriodTimeout = null;
        }

        // Show the image immediately
        this.currentPhotoLoaded = true;
        this.showLoadingScreen = false;
        this.loadingProgress = 0;
        this.currentXHR = null;

        // Start background preloading after current photo loads
        this.startBackgroundPreloading();
      }
    };

    xhr.onerror = () => {
      if (this.currentXHR === xhr) {
        // Cancel grace period if still pending
        if (this.loadingGracePeriodTimeout !== null) {
          clearTimeout(this.loadingGracePeriodTimeout);
          this.loadingGracePeriodTimeout = null;
        }

        this.currentPhotoLoaded = false;
        this.showLoadingScreen = false;
        this.loadingProgress = 0;
        this.currentXHR = null;
      }
    };

    xhr.send();
  }

  /**
   * Start background preloading of remaining photos in the album.
   * Loads photos sequentially starting from the current photo forward.
   * If user navigates to an unloaded photo, preloading is interrupted and resumed after.
   */
  private startBackgroundPreloading() {
    if (!this.album || this.isPreloading) return;

    // Cancel any existing background preload
    if (this.backgroundXHR) {
      this.backgroundXHR.abort();
      this.backgroundXHR = null;
    }

    // Start preloading from the next photo after current
    this.preloadIndex = this.currentIndex + 1;
    this.isPreloading = true;
    this.preloadNextPhoto();
  }

  /**
   * Preload the next photo in sequence.
   * Automatically continues to the next photo after completion.
   */
  private preloadNextPhoto() {
    if (!this.album || !this.isPreloading) return;

    // Find the next unloaded photo
    let attempts = 0;
    while (attempts < this.album.photos.length) {
      // Wrap around to start of album if we reach the end
      if (this.preloadIndex >= this.album.photos.length) {
        this.preloadIndex = 0;
      }

      const photo = this.album.photos[this.preloadIndex];

      // Skip if already cached
      if (!this.imageBlobCache.has(photo.id)) {
        // Found an unloaded photo, preload it
        this.preloadPhotoInBackground(photo);
        return;
      }

      // This photo is already cached, move to next
      this.preloadIndex++;
      attempts++;
    }

    // All photos are cached, stop preloading
    this.isPreloading = false;
  }

  /**
   * Preload a single photo in the background without updating UI.
   */
  private preloadPhotoInBackground(photo: Photo) {
    const photoId = photo.id;
    const photoUrl = photo.url_display;

    // Cancel any existing background preload
    if (this.backgroundXHR) {
      this.backgroundXHR.abort();
    }

    const xhr = new XMLHttpRequest();
    this.backgroundXHR = xhr;

    xhr.open('GET', photoUrl, true);
    xhr.responseType = 'blob';

    xhr.onload = () => {
      if (this.backgroundXHR === xhr && xhr.status === 200) {
        const blob = xhr.response as Blob;
        const objectUrl = URL.createObjectURL(blob);

        // Cache the blob URL for this photo
        this.imageBlobCache.set(photoId, objectUrl);

        // Clear reference
        if (this.backgroundXHR === xhr) {
          this.backgroundXHR = null;
        }

        // Move to next photo
        this.preloadIndex++;
        this.preloadNextPhoto();
      }
    };

    xhr.onerror = () => {
      // Failed to load, skip to next photo
      if (this.backgroundXHR === xhr) {
        this.backgroundXHR = null;
        this.preloadIndex++;
        this.preloadNextPhoto();
      }
    };

    xhr.send();
  }

  private navigateToPhoto(photoId: string) {
    if (!this.album) return;

    // Pause background preloading - will resume after current photo loads
    if (this.backgroundXHR) {
      this.backgroundXHR.abort();
      this.backgroundXHR = null;
    }
    this.isPreloading = false;

    // Update URL without full page reload
    navigateToPhoto(this.albumSlug, photoId);

    // Update displayed photo
    this.photoId = photoId;
    const index = this.album.photos.findIndex((p) => p.id === photoId);
    if (index !== -1) {
      this.currentIndex = index;
      this.currentPhoto = this.album.photos[index];

      // Load the current photo (will restart background preloading after)
      this.loadCurrentPhoto();
    }
  }

  private handlePrev = () => {
    if (!this.album) return;
    const prevIndex = (this.currentIndex - 1 + this.album.photos.length) % this.album.photos.length;
    this.navigateToPhoto(this.album.photos[prevIndex].id);
  };

  private handleNext = () => {
    if (!this.album) return;
    const nextIndex = (this.currentIndex + 1) % this.album.photos.length;
    this.navigateToPhoto(this.album.photos[nextIndex].id);
  };

  private handleClose = () => {
    // Use client-side navigation for instant response
    navigateTo(routes.album(this.albumSlug));
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault(); // Prevent any default browser behavior
      this.handleClose();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.handleNext();
    }
  };

  private handleDownload = () => {
    if (!this.currentPhoto) return;
    const link = document.createElement('a');
    link.href = this.currentPhoto.url_original;
    link.download = this.currentPhoto.filename_original;
    link.click();
  };

  private async handleShare() {
    if (!this.currentPhoto || !navigator.share) {
      // Fallback to copy link
      void this.handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: this.album?.title || 'Photo',
        url: window.location.href,
      });
    } catch (err) {
      // User cancelled or error occurred
      console.log('Share cancelled or failed:', err);
    }
  }

  private handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.toastMessage = 'Link copied to clipboard!';
      this.toastVisible = true;
    } catch (err) {
      console.error('Failed to copy link:', err);
      this.toastMessage = 'Failed to copy link';
      this.toastVisible = true;
    }
  };

  private disableBodyScroll(disable: boolean) {
    if (disable) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  private async requestFullscreenIfMobile() {
    // Only request fullscreen on mobile devices
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    try {
      // Request fullscreen on the host element
      if (this.requestFullscreen) {
        await this.requestFullscreen();
      }
    } catch (err) {
      // Fullscreen request failed - this is normal if user hasn't interacted yet
      console.debug('Fullscreen request failed:', err);
    }
  }

  private async exitFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.debug('Exit fullscreen failed:', err);
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    if (!this.currentPhoto || !this.album) {
      return html`<div class="error">Photo not found</div>`;
    }

    // Use cached blob URL if available, otherwise use original URL
    const photoUrl = this.imageBlobCache.get(this.currentPhoto.id) || this.currentPhoto.url_display;

    return html`
      <div class="page-container">
        <div class="toolbar">
          <span class="photo-counter">${this.currentIndex + 1} / ${this.album.photos.length}</span>
          <button class="toolbar-button" @click=${this.handleDownload} title="Download">
            ${unsafeSVG(downloadIcon)}
          </button>
          <button class="toolbar-button" @click=${() => void this.handleShare()} title="Share">
            ${unsafeSVG(shareIcon)}
          </button>
          <button class="toolbar-button" @click=${this.handleCopyLink} title="Copy Link">
            ${unsafeSVG(linkIcon)}
          </button>
          <button class="close-button" @click=${this.handleClose} title="Close">
            ${unsafeSVG(closeIcon)}
          </button>
        </div>

        <div class="photo-container">
          <button class="nav-button prev" @click=${this.handlePrev}>‹</button>

          ${this.showLoadingScreen && !this.currentPhotoLoaded
            ? html`
                <!-- Show loading indicator (after grace period) -->
                <div class="photo-loading" style="display: flex;">
                  <div class="photo-loading-text">
                    Loading photo ${this.currentIndex + 1} of ${this.album.photos.length}...
                  </div>
                  <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${this.loadingProgress}%"></div>
                  </div>
                  <div class="progress-percentage">${this.loadingProgress}%</div>
                </div>
              `
            : html`<div class="photo-loading" hidden></div>`}
          ${this.currentPhotoLoaded
            ? html`
                <!-- Show full image -->
                <img
                  src=${photoUrl}
                  alt=${this.currentPhoto.alt_text || this.currentPhoto.caption || 'Photo'}
                />
              `
            : ''}

          <button class="nav-button next" @click=${this.handleNext}>›</button>
        </div>

        ${this.showExif && this.currentPhoto.exif
          ? html`
              <div class="exif-panel">
                <div class="exif-items">
                  ${this.currentPhoto.exif.camera
                    ? html`<span class="exif-item">${this.currentPhoto.exif.camera}</span>`
                    : ''}
                  ${this.currentPhoto.exif.lens
                    ? html`<span class="exif-item">${this.currentPhoto.exif.lens}</span>`
                    : ''}
                  ${this.currentPhoto.exif.focal_length
                    ? html`<span class="exif-item">${this.currentPhoto.exif.focal_length}</span>`
                    : ''}
                  ${this.currentPhoto.exif.aperture
                    ? html`<span class="exif-item">ƒ/${this.currentPhoto.exif.aperture}</span>`
                    : ''}
                  ${this.currentPhoto.exif.shutter_speed
                    ? html`<span class="exif-item">${this.currentPhoto.exif.shutter_speed}s</span>`
                    : ''}
                  ${this.currentPhoto.exif.iso
                    ? html`<span class="exif-item">ISO ${this.currentPhoto.exif.iso}</span>`
                    : ''}
                  ${this.currentPhoto.exif.date_taken
                    ? html`<span class="exif-item">${this.currentPhoto.exif.date_taken}</span>`
                    : ''}
                </div>
              </div>
            `
          : ''}
      </div>

      <toast-notification
        .message=${this.toastMessage}
        .type=${'success'}
        .visible=${this.toastVisible}
        @toast-close=${() => {
          this.toastVisible = false;
        }}
      ></toast-notification>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'album-photo-page': AlbumPhotoPage;
  }
}
