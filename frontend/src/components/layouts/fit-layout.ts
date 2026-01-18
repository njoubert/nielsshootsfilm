/**
 * Fit Layout - Single column, viewport-height images.
 * Each image fits within the viewport height for slideshow-style scrolling.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Photo } from '../../types/data-models';

@customElement('fit-layout')
export class FitLayout extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];

  @state() private viewportHeight = 0;

  private resizeHandler = () => this.updateViewportHeight();

  static styles = css`
    :host {
      display: block;
    }

    .fit-grid {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--fit-gap, 15px);
    }

    .fit-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: var(--color-surface, #222);
      cursor: pointer;
    }

    .fit-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .fit-item img {
      max-width: 100%;
      max-height: var(--fit-img-height, calc(100vh - 60px));
      object-fit: contain;
      display: block;
    }

    .caption {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--color-surface, #222);
      color: var(--color-text-primary, #fff);
      font-size: 0.875rem;
      line-height: 1.3;
      text-align: center;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.updateViewportHeight();
    window.addEventListener('resize', this.resizeHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private updateViewportHeight() {
    this.viewportHeight = window.innerHeight;
  }

  private handlePhotoClick(photo: Photo, index: number) {
    this.dispatchEvent(
      new CustomEvent('photo-click', {
        detail: { photo, index },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    // Calculate available height for image
    const gap = 15;
    const captionHeight = 36; // Approximate caption height
    const imageMaxHeight = this.viewportHeight - gap - captionHeight;

    return html`
      <div class="fit-grid" style="--fit-gap: ${gap}px; --fit-img-height: ${imageMaxHeight}px">
        ${this.photos.map(
          (photo, index) => html`
            <div class="fit-item" @click=${() => this.handlePhotoClick(photo, index)}>
              <img
                src="${photo.url_display}"
                alt="${photo.alt_text || photo.caption || `Photo ${index + 1}`}"
                loading="lazy"
              />
              ${photo.caption ? html`<div class="caption">${photo.caption}</div>` : ''}
            </div>
          `
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fit-layout': FitLayout;
  }
}
