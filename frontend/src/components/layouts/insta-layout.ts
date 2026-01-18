/**
 * Insta Layout - Square grid layout, Instagram-style.
 * All photos cropped to 1:1 aspect ratio in a uniform grid.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { LayoutSize, Photo } from '../../types/data-models';
import '../lazy-image';

@customElement('insta-layout')
export class InstaLayout extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];
  @property({ type: String, reflect: true }) size: LayoutSize = 'large';

  static styles = css`
    :host {
      display: block;
    }

    .insta-grid {
      display: grid;
      gap: 15px;
      align-items: start;
    }

    /* Default/Large size: 4 columns */
    .insta-grid {
      grid-template-columns: repeat(4, 1fr);
    }

    /* Small size: 6 columns */
    :host([size='small']) .insta-grid {
      grid-template-columns: repeat(6, 1fr);
    }

    .insta-item {
      background: var(--color-surface, #222);
      display: flex;
      flex-direction: column;
      aspect-ratio: 1 / 1;
      cursor: pointer;
      overflow: hidden;
    }

    .insta-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .image-wrapper {
      position: relative;
      width: 100%;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .image-wrapper lazy-image {
      width: 100%;
      height: 100%;
    }

    .caption {
      flex-shrink: 0;
      padding: 0.5rem 0.75rem;
      background: var(--color-surface, #222);
      color: var(--color-text-primary, #fff);
      font-size: 0.875rem;
      line-height: 1.3;
      text-align: center;
    }

    /* Responsive - Default/Large */
    @media (max-width: 1200px) {
      .insta-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 768px) {
      .insta-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      .insta-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Responsive - Small (override defaults) */
    @media (max-width: 1400px) {
      :host([size='small']) .insta-grid {
        grid-template-columns: repeat(5, 1fr);
      }
    }

    @media (max-width: 1200px) {
      :host([size='small']) .insta-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 768px) {
      :host([size='small']) .insta-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 480px) {
      :host([size='small']) .insta-grid {
        grid-template-columns: 1fr;
      }
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
      <div class="insta-grid">
        ${this.photos.map(
          (photo, index) => html`
            <div class="insta-item" @click=${() => this.handlePhotoClick(photo, index)}>
              <div class="image-wrapper">
                <lazy-image
                  src="${photo.url_thumbnail}"
                  alt="${photo.alt_text || photo.caption || `Photo ${index + 1}`}"
                  aspectRatio="1/1"
                ></lazy-image>
              </div>
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
    'insta-layout': InstaLayout;
  }
}
