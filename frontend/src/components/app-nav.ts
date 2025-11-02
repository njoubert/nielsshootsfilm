import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { CustomLink, NavigationConfig } from '../types/data-models';
import { checkAuth } from '../utils/admin-api';
import { onLogin, onLogout } from '../utils/auth-state';
import { handleNavClick, routes } from '../utils/navigation';

/**
 * Navigation header component.
 */
@customElement('app-nav')
export class AppNav extends LitElement {
  @property({ type: Object }) config?: NavigationConfig;
  @property({ type: String }) siteTitle = '';
  @state() isAuthenticated = false;

  private unsubscribeLogout?: () => void;
  private unsubscribeLogin?: () => void;

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to auth events
    this.unsubscribeLogout = onLogout(() => {
      this.isAuthenticated = false;
    });
    this.unsubscribeLogin = onLogin(() => {
      this.isAuthenticated = true;
    });

    // Check initial authentication status
    void this.checkInitialAuth();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up subscriptions
    this.unsubscribeLogout?.();
    this.unsubscribeLogin?.();
  }

  private async checkInitialAuth() {
    try {
      this.isAuthenticated = await checkAuth();
    } catch (error) {
      console.error('Failed to check auth status:', error);
      this.isAuthenticated = false;
    }
  }

  static styles = css`
    :host {
      display: block;
    }

    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 2rem;
      background: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 100%);
      border-bottom: none;
    }

    :host(.opaque) nav {
      background-color: var(--color-background);
      border-bottom: 1px solid var(--color-border);
    }

    .logo {
      font-family: 'Raleway', sans-serif;
      font-size: 16px;
      font-weight: 300;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #ffffff;
      text-decoration: none;
    }

    .nav-links {
      display: flex;
      gap: 2rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-links a {
      color: #ffffff;
      text-decoration: none;
    }

    .nav-links a:hover {
      color: rgba(255, 255, 255, 0.7);
    }

    .nav-links a.admin {
      opacity: 0.7;
      font-size: 0.9em;
    }

    @media (max-width: 768px) {
      nav {
        flex-direction: column;
        gap: 1rem;
      }

      .nav-links {
        gap: 1rem;
      }
    }
  `;

  render() {
    return html`
      <nav>
        <a href=${routes.home()} class="logo" @click=${handleNavClick}>${this.siteTitle}</a>
        <ul class="nav-links">
          ${this.isAuthenticated
            ? html`<li>
                <a href=${routes.admin.albums()} class="admin" @click=${handleNavClick}>Admin</a>
              </li>`
            : ''}
          ${this.config?.show_about
            ? html`<li><a href="/about" @click=${handleNavClick}>About</a></li>`
            : ''}
          ${this.config?.show_contact
            ? html`<li><a href="/contact" @click=${handleNavClick}>Contact</a></li>`
            : ''}
          ${this.config?.custom_links?.map(
            (link: CustomLink) =>
              html`<li><a href="${link.url}" @click=${handleNavClick}>${link.label}</a></li>`
          )}
          ${this.config?.show_albums
            ? html`<li><a href=${routes.albums()} @click=${handleNavClick}>Galleries</a></li>`
            : ''}
        </ul>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-nav': AppNav;
  }
}
