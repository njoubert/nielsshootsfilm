import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/album-cover-hero';
import '../components/loading-spinner';
import '../components/photo-grid';
import type { Album, SiteConfig } from '../types/data-models';
import { fetchAlbumBySlug, fetchSiteConfig, hasAlbumAccess } from '../utils/api';
import { createPhotoClickHandler, navigateToPhoto } from '../utils/navigation';
import './password-form';

/**
 * Album detail page showing a single album.
 */
@customElement('album-detail-page')
export class AlbumDetailPage extends LitElement {
  @property({ type: String }) slug = '';

  @state() private album?: Album;
  @state() private siteConfig?: SiteConfig;
  @state() private loading = true;
  @state() private error = '';
  @state() private needsPassword = false;

  static styles = css`
    :host {
      display: block;
    }

    .loading-container,
    .error-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      padding: 2rem;
    }

    .error-container {
      color: var(--color-text-secondary);
      text-align: center;
    }

    .description-section {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 2rem;
    }

    .description {
      line-height: 1.8;
      color: var(--color-text-secondary);
    }

    .photos-section {
      padding: 0 0 2rem 0;
    }

    .password-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
    }
  `;

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    // Reload data when slug property changes to a non-empty value
    if (changedProperties.has('slug')) {
      void this.loadData();
    }
    // Check for photo parameter after album loads - redirect to new photo page
    if (changedProperties.has('album') && this.album) {
      this.checkPhotoParameter();
    }
  }

  private async loadData() {
    if (!this.slug) {
      return;
    }
    console.log('Loading portfolio album and site config');

    try {
      this.loading = true;
      this.needsPassword = false;
      this.error = '';

      const [album, siteConfig] = await Promise.all([
        fetchAlbumBySlug(this.slug),
        fetchSiteConfig(),
      ]);

      this.album = album ?? undefined;
      this.siteConfig = siteConfig;

      if (!this.album) {
        this.error = 'Album not found';
        return;
      }

      // Check if password is required
      if (this.album.visibility === 'password_protected' && !hasAlbumAccess(this.album.id)) {
        this.needsPassword = true;
      }
    } catch (err) {
      this.error = 'Failed to load album';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Don't load here - wait for slug to be set in updated()
    window.addEventListener('popstate', this.handlePopState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('popstate', this.handlePopState);
  }

  private handlePopState = () => {
    // Handle browser back/forward - check for photo parameter and redirect
    this.checkPhotoParameter();
  };

  private checkPhotoParameter() {
    const params = new URLSearchParams(window.location.search);
    const photoId = params.get('photo');

    // Redirect old ?photo=id URLs to new route
    if (photoId && this.album) {
      navigateToPhoto(this.slug, photoId);
    }
  }

  private handlePhotoClick = createPhotoClickHandler(() => this.slug);

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
        </div>
      `;
    }

    if (this.needsPassword) {
      return html`
        <div class="password-container">
          <password-form
            .albumId=${this.album.id}
            .albumTitle=${this.album.title}
            .passwordHash=${this.album.password_hash || ''}
            @password-success=${() => this.handlePasswordSuccess()}
          ></password-form>
        </div>
      `;
    }

    const coverPhoto =
      this.album.photos.find((p) => p.id === this.album?.cover_photo_id) || this.album.photos[0];

    return html`
      <album-cover-hero
        .coverPhoto=${coverPhoto}
        .title=${this.album.title}
        .subtitle=${this.album.subtitle || ''}
      ></album-cover-hero>

      ${this.album.description ? this.renderDescription() : ''}

      <div class="photos-section">
        <photo-grid
          .photos=${this.album.photos}
          .layout=${(this.siteConfig?.portfolio.default_photo_layout || 'masonry') as
            | 'masonry'
            | 'grid'
            | 'justified'
            | 'square'}
          @photo-click=${this.handlePhotoClick}
        ></photo-grid>
      </div>
    `;
  }

  private renderDescription() {
    return html`
      <div class="description-section">
        <p class="description">${this.album?.description}</p>
      </div>
    `;
  }

  private handlePasswordSuccess() {
    this.needsPassword = false;
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'album-detail-page': AlbumDetailPage;
  }
}
