/**
 * Admin dashboard - landing page for admin section.
 * Shows overview stats and quick actions.
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/admin-header';
import '../components/storage-stats';
import '../components/toast-notification';
import type { Album, SiteConfig } from '../types/data-models';
import { fetchAdminSiteConfig, fetchAllAlbums } from '../utils/admin-api';
import { onLogout } from '../utils/auth-state';
import { handleNavClick, routes } from '../utils/navigation';

@customElement('admin-dashboard-page')
export class AdminDashboardPage extends LitElement {
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
      margin-bottom: 2rem;
    }

    .page-title {
      font-family: 'Raleway', sans-serif;
      font-size: 32px;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      margin: 0 0 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: var(--color-text-secondary, #666);
      margin: 0;
      font-weight: 400;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: var(--color-surface, white);
      border-radius: 0;
      padding: 1.5rem;
      box-shadow: var(--shadow-sm);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #666);
      margin: 0 0 0.5rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--color-text-primary, #333);
      margin: 0;
    }

    .stat-meta {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #999);
      margin: 0.5rem 0 0;
    }

    .quick-actions {
      background: var(--color-surface, white);
      border-radius: 0;
      padding: 1.5rem;
      box-shadow: var(--shadow-md);
    }

    .section-title {
      font-family: 'Raleway', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      margin: 0 0 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1rem;
    }

    .action-card {
      padding: 1.5rem;
      border: 2px solid var(--color-border, #ddd);
      border-radius: 0;
      text-decoration: none;
      color: var(--color-text-primary, #333);
      text-align: center;
      box-shadow: var(--shadow-sm);
    }

    .action-card:hover {
      border-color: var(--color-primary, #007bff);
      background: var(--color-background, #f8f9fa);
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .action-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .action-title {
      font-family: 'Raleway', sans-serif;
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .action-description {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #666);
      margin: 0;
    }

    .loading,
    .error {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-secondary, #666);
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }
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
  }

  private async loadData() {
    console.log('Loading admin dashboard data');
    this.loading = true;
    this.error = '';

    try {
      [this.albums, this.siteConfig] = await Promise.all([
        fetchAllAlbums(),
        fetchAdminSiteConfig(),
      ]);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      this.loading = false;
    }
  }

  private getStats() {
    const totalAlbums = this.albums.length;
    const publicAlbums = this.albums.filter((a) => a.visibility === 'public').length;
    const totalPhotos = this.albums.reduce((sum, album) => sum + (album.photos?.length || 0), 0);
    const portfolioAlbumId = this.siteConfig?.portfolio?.main_album_id;
    const portfolioAlbum = portfolioAlbumId
      ? this.albums.find((a) => a.id === portfolioAlbumId)
      : undefined;

    return {
      totalAlbums,
      publicAlbums,
      totalPhotos,
      portfolioAlbum,
    };
  }

  render() {
    const siteTitle = this.siteConfig?.site?.title || 'Photography Portfolio';

    if (this.loading) {
      return html`
        <admin-header .siteTitle=${siteTitle} currentPage="dashboard"></admin-header>
        <div class="container">
          <div class="loading">Loading dashboard...</div>
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

    const stats = this.getStats();

    return html`
      <admin-header .siteTitle=${siteTitle} currentPage="dashboard"></admin-header>

      <div class="container">${this.renderDashboard(stats)}</div>

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

  private renderDashboard(stats: ReturnType<typeof this.getStats>) {
    return html`
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Welcome back! Here's an overview of your portfolio.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-label">Total Galleries</p>
          <p class="stat-value">${stats.totalAlbums}</p>
          <p class="stat-meta">${stats.publicAlbums} public</p>
        </div>

        <div class="stat-card">
          <p class="stat-label">Total Photos</p>
          <p class="stat-value">${stats.totalPhotos}</p>
          <p class="stat-meta">
            ${stats.totalAlbums > 0
              ? `Avg ${Math.round(stats.totalPhotos / stats.totalAlbums)} per gallery`
              : ''}
          </p>
        </div>

        <div class="stat-card">
          <p class="stat-label">Portfolio Gallery</p>
          <p class="stat-value">${stats.portfolioAlbum ? '✓' : '—'}</p>
          <p class="stat-meta">
            ${stats.portfolioAlbum ? stats.portfolioAlbum.title : 'No portfolio gallery set'}
          </p>
        </div>
      </div>

      <div class="quick-actions">
        <h2 class="section-title">Quick Actions</h2>
        <div class="actions-grid">
          <a href=${routes.admin.newAlbum()} class="action-card" @click=${handleNavClick}>
            <div class="action-icon">📸</div>
            <h3 class="action-title">Create Gallery</h3>
            <p class="action-description">Start a new photo gallery</p>
          </a>

          <a href=${routes.admin.albums()} class="action-card" @click=${handleNavClick}>
            <div class="action-icon">📚</div>
            <h3 class="action-title">Manage Galleries</h3>
            <p class="action-description">View and edit all galleries</p>
          </a>

          <a href=${routes.admin.settings()} class="action-card" @click=${handleNavClick}>
            <div class="action-icon">⚙️</div>
            <h3 class="action-title">Settings</h3>
            <p class="action-description">Configure your site</p>
          </a>

          <a href=${routes.home()} class="action-card" target="_blank">
            <div class="action-icon">🌐</div>
            <h3 class="action-title">View Site</h3>
            <p class="action-description">See your public portfolio</p>
          </a>
        </div>
      </div>

      <storage-stats style="margin-top: 2rem;"></storage-stats>
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'admin-dashboard-page': AdminDashboardPage;
  }
}
