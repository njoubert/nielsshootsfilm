/**
 * Big Layout - Single column, full-width images.
 * Traditional blog-style layout with each image taking the full container width.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Photo } from '../../types/data-models';
import '../lazy-image';

@customElement('big-layout')
export class BigLayout extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];

  static styles = css`
    :host {
      display: block;
    }

    .big-grid {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .big-item {
      background: var(--color-surface, #222);
      cursor: pointer;
    }

    .big-item:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .big-item lazy-image {
      width: 100%;
      height: auto;
      display: block;
    }

    .caption {
      padding: 0.5rem 0.75rem;
      background: var(--color-surface, #222);
      color: var(--color-text-primary, #fff);
      font-size: 0.875rem;
      line-height: 1.3;
      text-align: center;
    }
  `;

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
    return html`
      <div class="big-grid">
        ${this.photos.map((photo, index) => {
          const aspectRatio =
            photo.width && photo.height ? `${photo.width}/${photo.height}` : '3/2';

          return html`
            <div class="big-item" @click=${() => this.handlePhotoClick(photo, index)}>
              <lazy-image
                src="${photo.url_display}"
                alt="${photo.alt_text || photo.caption || `Photo ${index + 1}`}"
                aspectRatio="${aspectRatio}"
              ></lazy-image>
              ${photo.caption ? html`<div class="caption">${photo.caption}</div>` : ''}
            </div>
          `;
        })}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'big-layout': BigLayout;
  }
}
