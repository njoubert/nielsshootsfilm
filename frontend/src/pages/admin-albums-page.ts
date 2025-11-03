/**
 * Admin albums list page - main dashboard for managing albums.
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/admin-header';
import '../components/toast-notification';
import type { Album, SiteConfig } from '../types/data-models';
import { deleteAlbum, fetchAdminSiteConfig, fetchAllAlbums } from '../utils/admin-api';
import { onLogout } from '../utils/auth-state';
import { handleNavClick, routes } from '../utils/navigation';

@customElement('admin-albums-page')
export class AdminAlbumsPage extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-background, #f5f5f5);
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .page-title {
      font-family: 'Raleway', sans-serif;
      font-size: 32px;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-primary {
      background: var(--color-primary, #007bff);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-hover, #0056b3);
    }

    .btn-secondary {
      background: var(--color-border, #ddd);
      color: var(--color-text-primary, #333);
    }

    .btn-secondary:hover {
      background: var(--color-border, #ccc);
    }

    .btn-danger {
      background: var(--color-danger, #dc3545);
      color: white;
    }

    .btn-danger:hover {
      background: var(--color-danger-hover, #c82333);
    }

    .loading,
    .error {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-secondary, #666);
    }

    .albums-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
    }

    .album-card {
      background: var(--color-surface, white);
      border-radius: 0;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .album-card:hover {
      box-shadow: var(--shadow-md);
    }

    .album-thumbnail {
      width: 100%;
      height: 200px;
      background: var(--color-border, #ddd);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary, #666);
      font-size: 0.875rem;
      position: relative;
      overflow: hidden;
    }

    .album-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .album-info {
      padding: 1rem;
    }

    .album-title {
      font-family: 'Raleway', sans-serif;
      margin: 0 0 0.25rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .album-subtitle {
      margin: 0 0 0.5rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary, #666);
    }

    .album-meta {
      display: flex;
      gap: 1rem;
      margin: 0.75rem 0;
      font-size: 0.75rem;
      color: var(--color-text-secondary, #666);
    }

    .album-meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .visibility-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .visibility-public {
      background: var(--color-success-bg, #d4edda);
      color: var(--color-success-text, #155724);
    }

    .visibility-unlisted {
      background: var(--color-warning-bg, #fff3cd);
      color: var(--color-warning-text, #856404);
    }

    .visibility-password_protected {
      background: var(--color-danger-bg, #f8d7da);
      color: var(--color-danger-text, #721c24);
    }

    .album-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--color-border, #eee);
    }

    .album-actions button,
    .album-actions a {
      flex: 1;
      text-align: center;
    }

    .btn-small {
      padding: 0.375rem 0.75rem;
      font-size: 0.813rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-state h2 {
      font-family: 'Raleway', sans-serif;
      margin: 0 0 0.5rem;
      color: var(--color-text-primary, #333);
      text-transform: uppercase;
    }

    .empty-state p {
      margin: 0 0 1.5rem;
      color: var(--color-text-secondary, #666);
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: var(--color-surface, white);
      border-radius: 0;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      box-shadow: var(--shadow-lg);
    }

    .modal h2 {
      font-family: 'Raleway', sans-serif;
      margin: 0 0 1rem;
      font-size: 1.125rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .modal p {
      margin: 0 0 1.5rem;
      color: var(--color-text-secondary, #666);
    }

    .modal-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
  `;

  @state()
  private albums: Album[] = [];

  @state()
  private siteConfig: SiteConfig | null = null;

  @state()
  private loading = true;

  @state()
  private error = '';

  @state()
  private deleteConfirm: { show: boolean; album: Album | null } = {
    show: false,
    album: null,
  };

  private unsubscribeLogout?: () => void;

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();

    // Subscribe to logout events to clear cached data
    this.unsubscribeLogout = onLogout(() => {
      this.clearState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up logout listener
    if (this.unsubscribeLogout) {
      this.unsubscribeLogout();
    }
  }

  /**
   * Clear all cached state data.
   * Called when user logs out to prevent showing stale data.
   */
  private clearState() {
    this.albums = [];
    this.siteConfig = null;
    this.loading = false;
    this.error = '';
    this.deleteConfirm = { show: false, album: null };
  }

  private async loadData() {
    console.debug('Loading admin albums and site config');
    await Promise.all([this.loadAlbums(), this.loadSiteConfig()]);
  }

  private async loadSiteConfig() {
    console.debug('Loading site config for admin albums page');
    try {
      this.siteConfig = await fetchAdminSiteConfig();
    } catch (err) {
      console.error('Failed to load site config:', err);
    }
  }

  private async loadAlbums() {
    console.debug('Loading admin albums list');
    this.loading = true;
    this.error = '';

    try {
      this.albums = await fetchAllAlbums();
      // Sort by order
      this.albums.sort((a, b) => a.order - b.order);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load galleries';
    } finally {
      this.loading = false;
    }
  }

  private showDeleteConfirm(album: Album) {
    this.deleteConfirm = { show: true, album };
  }

  private hideDeleteConfirm() {
    this.deleteConfirm = { show: false, album: null };
  }

  private async handleDelete() {
    if (!this.deleteConfirm.album) return;

    try {
      await deleteAlbum(this.deleteConfirm.album.id);
      this.hideDeleteConfirm();
      void this.loadAlbums(); // Reload the list
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete gallery';
      this.hideDeleteConfirm();
    }
  }

  private getCoverThumbnail(album: Album): string | null {
    // Handle albums with no photos
    if (!album.photos || album.photos.length === 0) {
      return null;
    }

    if (album.cover_photo_id) {
      const coverPhoto = album.photos.find((p) => p.id === album.cover_photo_id);
      return coverPhoto?.url_thumbnail || null;
    }
    return album.photos[0]?.url_thumbnail || null;
  }

  private formatVisibility(visibility: string): string {
    return visibility.replace('_', ' ');
  }

  render() {
    const siteTitle = this.siteConfig?.site?.title || 'Photography Portfolio';

    if (this.loading) {
      return html`
        <admin-header .siteTitle=${siteTitle} currentPage="albums"></admin-header>
        <div class="container">
          <div class="loading">Loading galleries...</div>
        </div>

        <toast-notification
          type="error"
          .message=${this.error}
          ?visible=${this.error !== ''}
          @toast-close=${() => {
            this.error = '';
          }}
        ></toast-notification>
      `;
    }

    return html`
      <admin-header .siteTitle=${siteTitle} currentPage="albums"></admin-header>

      <div class="container">${this.renderAlbums()}</div>

      <toast-notification
        type="error"
        .message=${this.error}
        ?visible=${this.error !== ''}
        @toast-close=${() => {
          this.error = '';
        }}
      ></toast-notification>
    `;
  }

  private renderAlbums() {
    return html`
      <div class="page-header">
        <h1 class="page-title">Galleries</h1>
        <a href=${routes.admin.newAlbum()} class="btn btn-primary" @click=${handleNavClick}>New Gallery</a>
      </div>
        ${
          this.albums.length === 0
            ? html`
                <div class="empty-state">
                  <h2>No galleries yet</h2>
                  <p>Create your first gallery to get started</p>
                  <a
                    href=${routes.admin.newAlbum()}
                    class="btn btn-primary"
                    @click=${handleNavClick}
                  >
                    Create Album
                  </a>
                </div>
              `
            : html`
                <div class="albums-grid">
                  ${this.albums.map(
                    (album) => html`
                      <div class="album-card">
                        <div class="album-thumbnail">
                          ${this.getCoverThumbnail(album)
                            ? html`<img src=${this.getCoverThumbnail(album)!} alt=${album.title} />`
                            : html`<span>No photos</span>`}
                        </div>
                        <div class="album-info">
                          <h3 class="album-title">${album.title}</h3>
                          <p class="album-subtitle">${album.subtitle || '\u00A0'}</p>

                          <div class="album-meta">
                            <span>${album.photos?.length || 0} photos</span>
                            <span class="visibility-badge visibility-${album.visibility}">
                              ${this.formatVisibility(album.visibility)}
                            </span>
                          </div>

                          <div class="album-actions">
                            <a
                              href=${routes.admin.editAlbum(album.id)}
                              class="btn btn-primary btn-small"
                              @click=${handleNavClick}
                            >
                              Edit
                            </a>
                            <a
                              href=${routes.album(album.slug)}
                              class="btn btn-secondary btn-small"
                              @click=${handleNavClick}
                            >
                              View
                            </a>
                            <button
                              class="btn btn-danger btn-small"
                              @click=${() => this.showDeleteConfirm(album)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
        }
      </div>

      ${
        this.deleteConfirm.show
          ? html`
              <div class="modal-overlay" @click=${() => this.hideDeleteConfirm()}>
                <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
                  <h2>Delete Gallery?</h2>
                  <p>
                    Are you sure you want to delete
                    <strong>${this.deleteConfirm.album?.title}</strong>? This action cannot be
                    undone.
                  </p>
                  <div class="modal-actions">
                    <button class="btn btn-secondary" @click=${() => this.hideDeleteConfirm()}>
                      Cancel
                    </button>
                    <button class="btn btn-danger" @click=${() => this.handleDelete()}>
                      Delete Album
                    </button>
                  </div>
                </div>
              </div>
            `
          : ''
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-albums-page': AdminAlbumsPage;
  }
}
