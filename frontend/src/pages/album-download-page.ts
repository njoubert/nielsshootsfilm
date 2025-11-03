import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/loading-spinner';
import type { Album } from '../types/data-models';
import { fetchAlbumBySlug } from '../utils/api';
import { handleNavClick, routes } from '../utils/navigation';

/**
 * Album download page - allows users to download album photos at different quality levels.
 */
@customElement('album-download-page')
export class AlbumDownloadPage extends LitElement {
  @property({ type: String }) slug = '';

  @state() private album?: Album;
  @state() private loading = true;
  @state() private error = '';
  @state() private downloading = false;

  static styles = css`
    :host {
      display: block;
      padding: 2rem;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    .loading-container,
    .error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
    }

    .error-container {
      flex-direction: column;
      gap: 1rem;
      color: var(--color-text-secondary);
      text-align: center;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .cover-image {
      width: 200px;
      height: 200px;
      object-fit: cover;
      border-radius: 4px;
      margin: 0 auto 1rem;
      display: block;
    }

    h1 {
      font-size: 1.5rem;
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
    }

    .subtitle {
      color: var(--color-text-secondary);
      font-size: 0.875rem;
    }

    .quality-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .quality-button {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 1rem;
      border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1));
      border-radius: 4px;
      background: transparent;
      color: var(--color-text-primary);
      text-decoration: none;
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        background-color 0.2s ease;
    }

    .quality-button:hover {
      border-color: var(--color-text-primary);
      background-color: rgba(0, 0, 0, 0.02);
    }

    .quality-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .quality-title {
      font-weight: 500;
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }

    .quality-description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      color: var(--color-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 0.2s ease;
      border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1));
      border-radius: 4px;
    }

    .back-button:hover {
      color: var(--color-text-primary);
      border-color: var(--color-text-primary);
    }

    .downloading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 1000;
    }

    .downloading-text {
      color: white;
      font-size: 1.125rem;
    }
  `;

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('slug')) {
      void this.loadAlbum();
    }
  }

  private async loadAlbum() {
    if (!this.slug) {
      return;
    }

    try {
      this.loading = true;
      this.error = '';

      const album = await fetchAlbumBySlug(this.slug);
      this.album = album ?? undefined;

      if (!this.album) {
        this.error = 'Album not found';
        return;
      }

      if (!this.album.allow_downloads) {
        this.error = 'Downloads are not enabled for this album';
      }
    } catch (err) {
      this.error = 'Failed to load album';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  private handleDownload(quality: 'thumbnail' | 'display' | 'original') {
    if (this.downloading) {
      return;
    }

    this.downloading = true;

    // Trigger download via window.location
    // The browser will handle the download and show its own progress
    const downloadUrl = `/api/albums/${this.slug}/download?quality=${quality}`;
    window.location.href = downloadUrl;

    // Reset downloading state after a delay
    // (the download will have started by then)
    setTimeout(() => {
      this.downloading = false;
    }, 2000);
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading-container">
          <loading-spinner></loading-spinner>
        </div>
      `;
    }

    if (this.error || !this.album) {
      return html`
        <div class="error-container">
          <p>${this.error || 'Album not found'}</p>
          <a href=${routes.album(this.slug)} class="back-button" @click=${handleNavClick}>
            ← Back to Album
          </a>
        </div>
      `;
    }

    const coverPhoto =
      this.album.photos.find((p) => p.id === this.album?.cover_photo_id) || this.album.photos[0];

    return html`
      <div class="container">
        <div class="header">
          ${coverPhoto
            ? html`<img
                src=${coverPhoto.url_thumbnail}
                alt=${coverPhoto.alt_text || ''}
                class="cover-image"
              />`
            : ''}
          <h1>${this.album.title}</h1>
          ${this.album.subtitle ? html`<p class="subtitle">${this.album.subtitle}</p>` : ''}
        </div>

        <div class="quality-options">
          <button
            class="quality-button"
            @click=${() => this.handleDownload('thumbnail')}
            ?disabled=${this.downloading}
          >
            <span class="quality-title">Thumbnail Quality</span>
            <span class="quality-description">
              Smaller files, perfect for quick previews (800px)
            </span>
          </button>

          <button
            class="quality-button"
            @click=${() => this.handleDownload('display')}
            ?disabled=${this.downloading}
          >
            <span class="quality-title">Display Quality (4K)</span>
            <span class="quality-description">
              High resolution for screens and digital use (3840px)
            </span>
          </button>

          <button
            class="quality-button"
            @click=${() => this.handleDownload('original')}
            ?disabled=${this.downloading}
          >
            <span class="quality-title">Original Quality</span>
            <span class="quality-description"> Full resolution originals as uploaded </span>
          </button>
        </div>

        <a href=${routes.album(this.slug)} class="back-button" @click=${handleNavClick}>
          ← Back to Album
        </a>
      </div>

      ${this.downloading
        ? html`
            <div class="downloading-overlay">
              <loading-spinner></loading-spinner>
              <span class="downloading-text">Preparing download...</span>
            </div>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'album-download-page': AlbumDownloadPage;
  }
}
