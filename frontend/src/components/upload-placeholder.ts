import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './loading-spinner';
import './waiting-spinner';

/**
 * Upload placeholder component that shows upload progress.
 * Displays in the photo grid during file uploads.
 */
@customElement('upload-placeholder')
export class UploadPlaceholder extends LitElement {
  @property({ type: String }) filename = '';
  @property({ type: Number }) progress = 0; // 0-100, only meaningful during 'uploading'
  @property({ type: String }) status:
    | 'waiting'
    | 'uploading'
    | 'processing'
    | 'complete'
    | 'error' = 'waiting';
  @property({ type: String }) error = '';

  static styles = css`
    :host {
      display: block;
      aspect-ratio: 1;
      position: relative;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }

    :host([status='error']) {
      border-color: var(--color-danger);
      border-width: 2px;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 1rem;
      gap: 0.5rem;
      cursor: default;
    }

    :host([status='error']) .container {
      cursor: pointer;
    }

    /* Progress circle (only shown during upload) */
    .progress-circle {
      position: relative;
      width: 60px;
      height: 60px;
    }

    .progress-circle svg {
      transform: rotate(-90deg);
    }

    .progress-circle-bg {
      fill: none;
      stroke: var(--color-border);
      stroke-width: 4;
    }

    .progress-circle-fill {
      fill: none;
      stroke: var(--color-primary);
      stroke-width: 4;
      stroke-linecap: round;
    }

    /* Status text */
    .status-text {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      text-align: center;
    }

    :host([status='error']) .status-text {
      color: var(--color-danger);
      font-weight: 500;
    }

    :host([status='complete']) .status-text {
      color: var(--color-success);
      font-weight: 500;
    }

    /* Filename */
    .filename {
      font-size: 0.75rem;
      color: var(--color-text-tertiary);
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Error message */
    .error-message {
      font-size: 0.7rem;
      color: var(--color-danger);
      text-align: center;
      margin-top: 0.25rem;
      line-height: 1.3;
    }

    /* Error icon */
    .error-icon {
      font-size: 2rem;
      color: var(--color-danger);
    }

    /* Complete checkmark */
    .complete-icon {
      font-size: 2rem;
      color: var(--color-success);
    }
  `;

  render() {
    return html`
      <div class="container" @click=${() => this.handleClick()}>
        ${this.renderContent()} ${this.renderFilename()}
      </div>
    `;
  }

  private renderContent() {
    switch (this.status) {
      case 'waiting':
        return html`
          <waiting-spinner size="large"></waiting-spinner>
          <div class="status-text">Waiting...</div>
        `;
      case 'uploading':
        return html`
          ${this.renderProgressCircle()}
          <div class="status-text">Uploading...</div>
        `;
      case 'processing':
        return html`
          <loading-spinner size="large"></loading-spinner>
          <div class="status-text">Processing...</div>
        `;
      case 'complete':
        return html`
          <div class="complete-icon">✓</div>
          <div class="status-text">Complete!</div>
        `;
      case 'error':
        return html`
          <div class="error-icon">⚠</div>
          <div class="status-text">Upload Failed</div>
          ${this.error ? html`<div class="error-message">${this.error}</div>` : ''}
        `;
    }
  }

  private renderProgressCircle() {
    const radius = 28; // 60px / 2 - 4px (stroke width / 2)
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (this.progress / 100) * circumference;

    return html`
      <div class="progress-circle">
        <svg width="60" height="60">
          <circle class="progress-circle-bg" cx="30" cy="30" r="${radius}"></circle>
          <circle
            class="progress-circle-fill"
            cx="30"
            cy="30"
            r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
          ></circle>
        </svg>
      </div>
    `;
  }

  private renderFilename() {
    return html`<div class="filename" title="${this.filename}">${this.filename}</div>`;
  }

  private handleClick() {
    if (this.status === 'error') {
      // Dispatch custom event to parent to remove this placeholder
      this.dispatchEvent(
        new CustomEvent('dismiss', {
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'upload-placeholder': UploadPlaceholder;
  }
}
