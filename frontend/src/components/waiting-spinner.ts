import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Waiting spinner component.
 * Simple animated breathing circle for waiting states.
 */
@customElement('waiting-spinner')
export class WaitingSpinner extends LitElement {
  @property({ type: String }) size: 'small' | 'default' | 'large' = 'default';

  static styles = css`
    :host {
      display: inline-block;
    }

    .spinner-container {
      width: 40px;
      height: 40px;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .spinner-container.small {
      width: 20px;
      height: 20px;
    }

    .spinner-container.large {
      width: 60px;
      height: 60px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--color-border, #ddd);
      border-radius: 50%;
      animation: breathe 2s ease-in-out infinite;
      will-change: opacity;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    @keyframes breathe {
      0%,
      100% {
        opacity: 0.3;
      }
      50% {
        opacity: 1;
      }
    }

    .spinner.small {
      width: 20px;
      height: 20px;
      border-width: 2px;
    }

    .spinner.large {
      width: 60px;
      height: 60px;
      border-width: 4px;
      margin: -10px;
    }
  `;

  render() {
    const sizeClass = this.size === 'default' ? '' : this.size;
    return html`
      <div class="spinner-container ${sizeClass}">
        <div class="spinner ${sizeClass}"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'waiting-spinner': WaitingSpinner;
  }
}
