import { compare } from 'bcrypt-ts';
import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/loading-spinner';
import { storeAlbumToken } from '../utils/api';

/**
 * Password entry form for password-protected albums.
 * Verifies password client-side against bcrypt hash for static site compatibility.
 */
@customElement('password-form')
export class PasswordForm extends LitElement {
  @property({ type: String }) albumId = '';
  @property({ type: String }) albumTitle = '';
  @property({ type: String }) passwordHash = '';

  @state() private password = '';
  @state() private error = '';
  @state() private loading = false;

  static styles = css`
    :host {
      display: block;
    }

    .form-container {
      max-width: 400px;
      margin: 0 auto;
      padding: 2rem;
      background-color: var(--color-surface);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .title {
      font-family: 'Raleway', sans-serif;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem 0;
      color: var(--color-text-primary);
      text-align: center;
      text-transform: uppercase;
    }

    .subtitle {
      font-family: 'Raleway', sans-serif;
      font-size: 14px;
      color: var(--color-text-secondary);
      margin: 0 0 2rem 0;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    input[type='password'] {
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background-color: var(--color-background);
      color: var(--color-text-primary);
      box-sizing: border-box;
    }

    input[type='password']:focus {
      outline: none;
      border-color: var(--color-text-primary);
    }

    .error-message {
      color: #e53e3e;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    button {
      width: 100%;
      padding: 0.75rem;
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-background);
      background-color: var(--color-text-primary);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    button:hover:not(:disabled) {
      opacity: 0.9;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 1rem;
    }
  `;

  render() {
    return html`
      <div class="form-container">
        <h2 class="title">${this.albumTitle}</h2>
        <p class="subtitle">This gallery is password protected</p>

        <form @submit=${(e: Event) => this.handleSubmit(e)}>
          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              .value=${this.password}
              @input=${(e: Event) => this.handleInput(e)}
              placeholder="Enter password"
              ?disabled=${this.loading}
              required
            />
            ${this.error ? html`<div class="error-message">${this.error}</div>` : ''}
          </div>

          ${this.loading
            ? html`
                <div class="loading-container">
                  <loading-spinner></loading-spinner>
                </div>
              `
            : html` <button type="submit" ?disabled=${this.loading}>Access Gallery</button> `}
        </form>
      </div>
    `;
  }

  private handleInput(e: Event) {
    this.password = (e.target as HTMLInputElement).value;
    this.error = '';
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();

    if (!this.password) {
      this.error = 'Please enter a password';
      return;
    }

    if (!this.passwordHash) {
      this.error = 'Gallery configuration error - no password hash';
      return;
    }

    try {
      this.loading = true;
      this.error = '';

      // Verify password client-side using bcrypt
      const isValid = await compare(this.password, this.passwordHash);

      if (isValid) {
        // Generate a simple token (timestamp) to indicate successful verification
        const token = `${this.albumId}_${Date.now()}`;
        storeAlbumToken(this.albumId, token);

        this.dispatchEvent(
          new CustomEvent('password-success', {
            bubbles: true,
            composed: true,
          })
        );
      } else {
        this.error = 'Invalid password';
      }
    } catch (err) {
      this.error = 'An error occurred. Please try again.';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'password-form': PasswordForm;
  }
}
