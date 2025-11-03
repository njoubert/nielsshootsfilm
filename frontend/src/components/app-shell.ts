import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { SiteConfig } from '../types/data-models';
import { checkAuth } from '../utils/admin-api';
import { fetchSiteConfig } from '../utils/api';
import { onLogout } from '../utils/auth-state';
import { navigateTo, routes } from '../utils/navigation';
import { Router, type Route } from '../utils/router';
import { themeManager } from '../utils/theme-manager';

// Import all public components
import '../pages/album-detail-page';
import '../pages/album-download-page';
import '../pages/album-list-page';
import '../pages/album-photo-page';
import '../pages/funsies-page';
import '../pages/portfolio-page';

// Import admin components
import '../pages/admin-album-editor-page';
import '../pages/admin-albums-page';
import '../pages/admin-dashboard-page';
import '../pages/admin-login-page';
import '../pages/admin-settings-page';

import './app-footer';
import './app-nav';
import './loading-spinner';

/**
 * Root application shell component.
 * Manages routing, global state, and layout.
 */
@customElement('app-shell')
export class AppShell extends LitElement {
  @state() private config?: SiteConfig;
  @state() private currentPath = '/';
  @state() private loading = true;
  @state() private isAuthenticated = false;
  @state() private authChecked = false;
  @state() private initError = '';

  private router?: Router;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .nav-wrapper {
      position: relative;
      z-index: 10;
    }

    .nav-wrapper.floating-nav {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }

    main {
      flex: 1;
      width: 100%;
    }

    main.with-hero {
      padding-top: 0;
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 50vh;
    }

    .error {
      padding: 2rem;
      text-align: center;
      color: var(--color-text-secondary);
    }
  `;

  private unsubscribeLogout?: () => void;

  connectedCallback() {
    super.connectedCallback();

    // Subscribe to logout events to redirect to login
    this.unsubscribeLogout = onLogout(() => {
      // Navigate to login page on logout
      navigateTo(routes.admin.login());
    });

    // Initialize async without making connectedCallback async
    void this.initialize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up logout listener
    if (this.unsubscribeLogout) {
      this.unsubscribeLogout();
    }
  }

  private async initialize() {
    // Load site configuration
    try {
      this.config = await fetchSiteConfig();
      // Update document title with site title from config
      if (this.config?.site?.title) {
        document.title = this.config.site.title;
      }
    } catch (error) {
      console.error('Failed to load site config:', error);
      // Continue initialization even if config fails - use defaults
      this.config = undefined;
    }

    try {
      // Initialize router with admin routes
      this.router = new Router([
        // Public routes (order matters - most specific first!)
        { path: '/', component: 'portfolio-page' },
        { path: '/albums', component: 'album-list-page' },
        { path: '/albums/:slug/download', component: 'album-download-page' },
        { path: '/albums/:slug/photo/:id', component: 'album-photo-page' },
        { path: '/albums/:slug', component: 'album-detail-page' },
        { path: '/funsies', component: 'funsies-page' },

        // Admin routes (with auth guard)
        { path: '/admin/login', component: 'admin-login-page' },
        { path: '/admin', component: 'admin-dashboard-page', guard: checkAuth },
        { path: '/admin/albums', component: 'admin-albums-page', guard: checkAuth },
        { path: '/admin/albums/new', component: 'admin-album-editor-page', guard: checkAuth },
        { path: '/admin/albums/:id/edit', component: 'admin-album-editor-page', guard: checkAuth },
        { path: '/admin/settings', component: 'admin-settings-page', guard: checkAuth },

        // Fallback
        { path: '*', component: 'portfolio-page' },
      ]);

      // Set initial path from browser location
      // The router navigate() is async and voided in constructor, so we use window.location directly
      this.currentPath = window.location.pathname;

      // Subscribe to route changes
      this.router.subscribe((path) => {
        this.currentPath = path;
        // Reset auth state when route changes to force a new auth check
        this.authChecked = false;
        this.isAuthenticated = false;
        this.requestUpdate();
      });

      // Initialize theme
      themeManager.subscribe(() => {
        this.requestUpdate();
      });
    } catch (error) {
      console.error('Failed to initialize router:', error);
      this.initError = 'Failed to initialize application';
    }

    this.loading = false;
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          <loading-spinner></loading-spinner>
        </div>
      `;
    }

    // Show initialization error if router failed to load
    if (this.initError) {
      return html`
        <div class="error">
          <p>${this.initError}</p>
          <button @click=${() => window.location.reload()}>Reload Page</button>
        </div>
      `;
    }

    // Admin pages don't need header/footer
    if (this.currentPath.startsWith('/admin')) {
      return html`<main>${this.renderPage()}</main>`;
    }

    if (!this.config) {
      return html`
        <div class="error">
          <p>Failed to load site configuration.</p>
          <button @click=${() => window.location.reload()}>Reload Page</button>
        </div>
      `;
    }

    // Check if we're on a page with hero image that navbar should float over
    const match = this.router?.getCurrentRoute();
    const isAlbumDetailPage = match?.route.path === '/albums/:slug';
    const isPortfolioPage = match?.route.path === '/';
    const hasHeroImage = isAlbumDetailPage || isPortfolioPage;
    const navClass = hasHeroImage ? 'floating-nav' : '';
    const mainClass = hasHeroImage ? 'with-hero' : '';

    return html`
      <div class="nav-wrapper ${navClass}">
        <app-nav .config=${this.config.navigation} .siteTitle=${this.config.site.title}></app-nav>
      </div>

      <main class="${mainClass}">${this.renderPage()}</main>

      <app-footer
        .social=${this.config.social}
        .owner=${this.config.owner}
        .siteTitle=${this.config.site.title}
      ></app-footer>
    `;
  }

  private renderPage() {
    const match = this.router?.getCurrentRoute();
    if (!match) {
      return html`<portfolio-page></portfolio-page>`;
    }

    const { route, params } = match;

    // For protected admin pages, check auth before rendering
    if (route.guard && route.component !== 'admin-login-page') {
      // If we haven't checked auth yet for this route, check it
      if (!this.authChecked) {
        void this.checkAuthAndRedirect(route);
        // Show loading spinner while checking
        return html`
          <div class="loading">
            <loading-spinner></loading-spinner>
          </div>
        `;
      }

      // If we've checked and user is not authenticated, show loading while redirect happens
      if (!this.isAuthenticated) {
        return html`
          <div class="loading">
            <loading-spinner></loading-spinner>
          </div>
        `;
      }

      // Auth checked and user is authenticated, proceed to render the page
    }

    switch (route.component) {
      case 'portfolio-page':
        return html`<portfolio-page></portfolio-page>`;
      case 'album-list-page':
        return html`<album-list-page></album-list-page>`;
      case 'album-detail-page':
        return html`<album-detail-page .slug=${params.slug || ''}></album-detail-page>`;
      case 'album-download-page':
        return html`<album-download-page .slug=${params.slug || ''}></album-download-page>`;
      case 'album-photo-page':
        return html`<album-photo-page
          .albumSlug=${params.slug || ''}
          .photoId=${params.id || ''}
        ></album-photo-page>`;
      case 'funsies-page':
        return html`<funsies-page></funsies-page>`;

      // Admin pages
      case 'admin-login-page':
        return html`<admin-login-page></admin-login-page>`;
      case 'admin-dashboard-page':
        return html`<admin-dashboard-page></admin-dashboard-page>`;
      case 'admin-albums-page':
        return html`<admin-albums-page></admin-albums-page>`;
      case 'admin-album-editor-page':
        return html`<admin-album-editor-page
          .albumId=${params.id || 'new'}
        ></admin-album-editor-page>`;
      case 'admin-settings-page':
        return html`<admin-settings-page></admin-settings-page>`;

      default:
        return html`<portfolio-page></portfolio-page>`;
    }
  }

  private async checkAuthAndRedirect(route: Route) {
    try {
      if (route.guard) {
        const isAuthenticated = await route.guard();
        this.isAuthenticated = isAuthenticated;
        this.authChecked = true;

        if (!isAuthenticated) {
          // Not authenticated, navigate to login
          navigateTo(routes.admin.login());
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.isAuthenticated = false;
      this.authChecked = true;
      navigateTo(routes.admin.login());
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell;
  }
}
