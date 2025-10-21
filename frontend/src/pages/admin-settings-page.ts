/**
 * Admin settings page - configure site settings.
 * Includes site info, owner info, portfolio settings, and password change.
 */

import { LitElement, css, html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '../components/admin-header';
import type { Album, SiteConfig } from '../types/data-models';
import {
  changePassword,
  fetchAllAlbums,
  setMainPortfolioAlbum,
  updateSiteConfig,
} from '../utils/admin-api';
import { fetchSiteConfig } from '../utils/api';

@customElement('admin-settings-page')
export class AdminSettingsPage extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-background, #f5f5f5);
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-title {
      font-family: 'Raleway', sans-serif;
      font-size: 52px;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      margin: 0 0 0.5rem;
      text-transform: uppercase;
    }

    .page-subtitle {
      font-size: 1rem;
      color: var(--color-text-secondary, #666);
      margin: 0;
    }

    .section {
      background: var(--color-surface, white);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-family: 'Raleway', sans-serif;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      margin: 0 0 1rem;
      padding-bottom: 0.75rem;
      text-transform: uppercase;
      border-bottom: 2px solid var(--color-border, #ddd);
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--color-text-primary, #333);
      font-weight: 500;
      font-size: 0.875rem;
    }

    input,
    textarea,
    select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--color-border, #ddd);
      border-radius: 4px;
      font-size: 0.875rem;
      font-family: inherit;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    input:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: var(--color-primary, #007bff);
    }

    textarea {
      min-height: 100px;
      resize: vertical;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: var(--color-primary, #007bff);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover, #0056b3);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success-message {
      padding: 0.75rem;
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      color: #155724;
      margin-bottom: 1rem;
    }

    .error-message {
      padding: 0.75rem;
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
      color: #721c24;
      margin-bottom: 1rem;
    }

    .help-text {
      font-size: 0.75rem;
      color: var(--color-text-secondary, #666);
      margin-top: 0.25rem;
    }

    .loading,
    .error {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--color-text-secondary, #666);
    }

    .error {
      color: #dc3545;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `;

  @state()
  private config: SiteConfig | null = null;

  @state()
  private albums: Album[] = [];

  @state()
  private loading = true;

  @state()
  private saving = false;

  @state()
  private savingPassword = false;

  @state()
  private error = '';

  @state()
  private success = '';

  @state()
  private passwordError = '';

  @state()
  private passwordSuccess = '';

  @state()
  private oldPassword = '';

  @state()
  private newPassword = '';

  @state()
  private confirmPassword = '';

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();
  }

  private async loadData() {
    this.loading = true;
    this.error = '';

    try {
      [this.config, this.albums] = await Promise.all([fetchSiteConfig(), fetchAllAlbums()]);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load settings';
    } finally {
      this.loading = false;
    }
  }

  private async handleSaveGeneral(e: Event) {
    e.preventDefault();
    if (!this.config) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    try {
      this.config = await updateSiteConfig(this.config);
      this.success = 'Settings saved successfully!';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to save settings';
    } finally {
      this.saving = false;
    }
  }

  private async handleSavePortfolio(e: Event) {
    e.preventDefault();
    if (!this.config) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    try {
      // Update site config
      this.config = await updateSiteConfig(this.config);

      // Set main portfolio album if specified
      if (this.config.portfolio?.main_album_id) {
        await setMainPortfolioAlbum(this.config.portfolio.main_album_id);
      }

      this.success = 'Portfolio settings saved successfully!';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to save portfolio settings';
    } finally {
      this.saving = false;
    }
  }

  private async handleChangePassword(e: Event) {
    e.preventDefault();
    this.passwordError = '';
    this.passwordSuccess = '';

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'New passwords do not match'; // pragma: allowlist secret
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'Password must be at least 8 characters'; // pragma: allowlist secret
      return;
    }

    this.savingPassword = true;

    try {
      await changePassword(this.oldPassword, this.newPassword); // pragma: allowlist secret
      this.passwordSuccess = 'Password changed successfully!'; // pragma: allowlist secret
      this.oldPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    } catch (err) {
      this.passwordError = err instanceof Error ? err.message : 'Failed to change password';
    } finally {
      this.savingPassword = false;
    }
  }

  private updateConfigField(path: string, value: unknown) {
    if (!this.config) return;

    const parts = path.split('.');
    let obj: never = this.config as never;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!obj[part]) {
        obj[part] = {} as never;
      }
      obj = obj[part];
    }

    obj[parts[parts.length - 1]] = value as never;
    this.config = { ...this.config };
  }

  render() {
    const siteTitle = this.config?.site?.title || 'Photography Portfolio';

    if (this.loading) {
      return html`
        <admin-header .siteTitle=${siteTitle} currentPage="settings"></admin-header>
        <div class="container">
          <div class="loading">Loading settings...</div>
        </div>
      `;
    }

    if (this.error && !this.config) {
      return html`
        <admin-header .siteTitle=${siteTitle} currentPage="settings"></admin-header>
        <div class="container">
          <div class="error">${this.error}</div>
        </div>
      `;
    }

    return html`
      <admin-header .siteTitle=${siteTitle} currentPage="settings"></admin-header>

      <div class="container">
        <div class="page-header">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure your photography portfolio</p>
        </div>

        ${this.error ? html`<div class="error-message">${this.error}</div>` : ''}
        ${this.success ? html`<div class="success-message">${this.success}</div>` : ''}

        <!-- General Site Settings -->
        <form @submit=${(e: Event) => this.handleSaveGeneral(e)}>
          <div class="section">
            <h2 class="section-title">General Settings</h2>

            <div class="form-group">
              <label for="site-title">Site Title *</label>
              <input
                type="text"
                id="site-title"
                .value=${this.config?.site?.title || ''}
                @input=${(e: Event) =>
                  this.updateConfigField('site.title', (e.target as HTMLInputElement).value)}
                required
              />
            </div>

            <div class="form-group">
              <label for="site-tagline">Tagline</label>
              <input
                type="text"
                id="site-tagline"
                .value=${this.config?.site?.tagline || ''}
                @input=${(e: Event) =>
                  this.updateConfigField('site.tagline', (e.target as HTMLInputElement).value)}
              />
              <p class="help-text">Optional subtitle for your site</p>
            </div>

            <div class="form-group">
              <label for="site-description">Site Description</label>
              <textarea
                id="site-description"
                .value=${this.config?.site?.description || ''}
                @input=${(e: Event) =>
                  this.updateConfigField(
                    'site.description',
                    (e.target as HTMLTextAreaElement).value
                  )}
              ></textarea>
              <p class="help-text">Used for SEO and about section</p>
            </div>

            <button type="submit" class="btn btn-primary" ?disabled=${this.saving}>
              ${this.saving ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </form>

        <!-- Owner Information -->
        <form @submit=${(e: Event) => this.handleSaveGeneral(e)}>
          <div class="section">
            <h2 class="section-title">Owner Information</h2>

            <div class="form-group">
              <label for="owner-name">Name</label>
              <input
                type="text"
                id="owner-name"
                .value=${this.config?.owner?.name || ''}
                @input=${(e: Event) =>
                  this.updateConfigField('owner.name', (e.target as HTMLInputElement).value)}
              />
            </div>

            <div class="form-group">
              <label for="owner-bio">Bio</label>
              <textarea
                id="owner-bio"
                .value=${this.config?.owner?.bio || ''}
                @input=${(e: Event) =>
                  this.updateConfigField('owner.bio', (e.target as HTMLTextAreaElement).value)}
              ></textarea>
              <p class="help-text">Markdown supported</p>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="owner-email">Email</label>
                <input
                  type="email"
                  id="owner-email"
                  .value=${this.config?.owner?.email || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('owner.email', (e.target as HTMLInputElement).value)}
                />
              </div>

              <div class="form-group">
                <label for="owner-phone">Phone</label>
                <input
                  type="tel"
                  id="owner-phone"
                  .value=${this.config?.owner?.phone || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('owner.phone', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>

            <div class="form-group">
              <label for="owner-location">Location</label>
              <input
                type="text"
                id="owner-location"
                .value=${this.config?.owner?.location || ''}
                @input=${(e: Event) =>
                  this.updateConfigField('owner.location', (e.target as HTMLInputElement).value)}
              />
            </div>

            <button type="submit" class="btn btn-primary" ?disabled=${this.saving}>
              ${this.saving ? 'Saving...' : 'Save Owner Information'}
            </button>
          </div>
        </form>

        <!-- Social Media -->
        <form @submit=${(e: Event) => this.handleSaveGeneral(e)}>
          <div class="section">
            <h2 class="section-title">Social Media</h2>

            <div class="form-row">
              <div class="form-group">
                <label for="social-instagram">Instagram</label>
                <input
                  type="text"
                  id="social-instagram"
                  .value=${this.config?.social?.instagram || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField(
                      'social.instagram',
                      (e.target as HTMLInputElement).value
                    )}
                  placeholder="username"
                />
                <p class="help-text">Username only (without @)</p>
              </div>

              <div class="form-group">
                <label for="social-youtube">YouTube</label>
                <input
                  type="text"
                  id="social-youtube"
                  .value=${this.config?.social?.youtube || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.youtube', (e.target as HTMLInputElement).value)}
                  placeholder="channel-id or @handle"
                />
                <p class="help-text">Channel ID or @handle</p>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="social-twitter">X (Twitter)</label>
                <input
                  type="text"
                  id="social-twitter"
                  .value=${this.config?.social?.twitter || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.twitter', (e.target as HTMLInputElement).value)}
                  placeholder="username"
                />
                <p class="help-text">Username only (without @)</p>
              </div>

              <div class="form-group">
                <label for="social-threads">Threads</label>
                <input
                  type="text"
                  id="social-threads"
                  .value=${this.config?.social?.threads || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.threads', (e.target as HTMLInputElement).value)}
                  placeholder="username"
                />
                <p class="help-text">Username only (without @)</p>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="social-tiktok">TikTok</label>
                <input
                  type="text"
                  id="social-tiktok"
                  .value=${this.config?.social?.tiktok || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.tiktok', (e.target as HTMLInputElement).value)}
                  placeholder="username"
                />
                <p class="help-text">Username only (without @)</p>
              </div>

              <div class="form-group">
                <label for="social-vimeo">Vimeo</label>
                <input
                  type="text"
                  id="social-vimeo"
                  .value=${this.config?.social?.vimeo || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.vimeo', (e.target as HTMLInputElement).value)}
                  placeholder="username"
                />
                <p class="help-text">Username only</p>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="social-pinterest">Pinterest</label>
                <input
                  type="text"
                  id="social-pinterest"
                  .value=${this.config?.social?.pinterest || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField(
                      'social.pinterest',
                      (e.target as HTMLInputElement).value
                    )}
                  placeholder="username"
                />
                <p class="help-text">Username only</p>
              </div>

              <div class="form-group">
                <label for="social-behance">Behance</label>
                <input
                  type="text"
                  id="social-behance"
                  .value=${this.config?.social?.behance || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.behance', (e.target as HTMLInputElement).value)}
                  placeholder="username"
                />
                <p class="help-text">Username only</p>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="social-linkedin">LinkedIn</label>
                <input
                  type="text"
                  id="social-linkedin"
                  .value=${this.config?.social?.linkedin || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.linkedin', (e.target as HTMLInputElement).value)}
                  placeholder="username"
                />
                <p class="help-text">Username or company name</p>
              </div>

              <div class="form-group">
                <label for="social-facebook">Facebook</label>
                <input
                  type="text"
                  id="social-facebook"
                  .value=${this.config?.social?.facebook || ''}
                  @input=${(e: Event) =>
                    this.updateConfigField('social.facebook', (e.target as HTMLInputElement).value)}
                  placeholder="username or page"
                />
                <p class="help-text">Username or page name</p>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" ?disabled=${this.saving}>
              ${this.saving ? 'Saving...' : 'Save Social Media'}
            </button>
          </div>
        </form>

        <!-- Portfolio Settings -->
        <form @submit=${(e: Event) => this.handleSavePortfolio(e)}>
          <div class="section">
            <h2 class="section-title">Portfolio Settings</h2>

            <div class="form-group">
              <label for="portfolio-album">Main Portfolio Album</label>
              <select
                id="portfolio-album"
                .value=${this.config?.portfolio?.main_album_id || ''}
                @change=${(e: Event) =>
                  this.updateConfigField(
                    'portfolio.main_album_id',
                    (e.target as HTMLSelectElement).value
                  )}
              >
                <option value="">-- Select Album --</option>
                ${this.albums.map(
                  (album) => html`
                    <option
                      value=${album.id}
                      ?selected=${album.id === this.config?.portfolio?.main_album_id}
                    >
                      ${album.title}
                    </option>
                  `
                )}
              </select>
              <p class="help-text">This album will be featured on your home page</p>
            </div>

            <button type="submit" class="btn btn-primary" ?disabled=${this.saving}>
              ${this.saving ? 'Saving...' : 'Save Portfolio Settings'}
            </button>
          </div>
        </form>

        <!-- Password Change -->
        <form @submit=${(e: Event) => this.handleChangePassword(e)}>
          <div class="section">
            <h2 class="section-title">Change Password</h2>

            ${this.passwordError
              ? html`<div class="error-message">${this.passwordError}</div>`
              : ''}
            ${this.passwordSuccess
              ? html`<div class="success-message">${this.passwordSuccess}</div>`
              : ''}

            <div class="form-group">
              <label for="old-password">Current Password</label>
              <input
                type="password"
                id="old-password"
                .value=${this.oldPassword}
                @input=${(e: Event) => (this.oldPassword = (e.target as HTMLInputElement).value)}
                required
                autocomplete="current-password"
              />
            </div>

            <div class="form-group">
              <label for="new-password">New Password</label>
              <input
                type="password"
                id="new-password"
                .value=${this.newPassword}
                @input=${(e: Event) => (this.newPassword = (e.target as HTMLInputElement).value)}
                required
                autocomplete="new-password"
              />
              <p class="help-text">Minimum 8 characters</p>
            </div>

            <div class="form-group">
              <label for="confirm-password">Confirm New Password</label>
              <input
                type="password"
                id="confirm-password"
                .value=${this.confirmPassword}
                @input=${(e: Event) =>
                  (this.confirmPassword = (e.target as HTMLInputElement).value)}
                required
                autocomplete="new-password"
              />
            </div>

            <button type="submit" class="btn btn-primary" ?disabled=${this.savingPassword}>
              ${this.savingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-settings-page': AdminSettingsPage;
  }
}
