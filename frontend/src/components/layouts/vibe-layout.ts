/**
 * Vibe Layout - Masonry layout using Masonry.js library.
 * Photos arranged in columns with varying heights, Pinterest-style.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - masonry types not working properly in this context
import Masonry from 'masonry-layout';
import type { LayoutSize, Photo } from '../../types/data-models';
import '../lazy-image';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MasonryInstance = any;

@customElement('vibe-layout')
export class VibeLayout extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];
  @property({ type: String, reflect: true }) size: LayoutSize = 'large';

  @state() private ready = false;

  private masonry: MasonryInstance = null;

  static styles = css`
    :host {
      display: block;
    }

    .vibe-grid {
      width: 100%;
    }

    /* Default/Large size: 4 columns (25%) */
    .grid-sizer,
    .vibe-item {
      width: calc(25% - 12px);
    }

    /* Small size: 5 columns (20%) */
    :host([size='small']) .grid-sizer,
    :host([size='small']) .vibe-item {
      width: calc(20% - 12px);
    }

    .vibe-item {
      margin-bottom: 15px;
      overflow: hidden;
      background: var(--color-surface, #222);
      cursor: pointer;
    }

    .vibe-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .vibe-item lazy-image {
      width: 100%;
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

    /* Responsive columns - Default/Large (4 -> 3 -> 2 -> 1) */
    @media (max-width: 1200px) {
      .grid-sizer,
      .vibe-item {
        width: calc(33.333% - 10px);
      }
    }

    @media (max-width: 768px) {
      .grid-sizer,
      .vibe-item {
        width: calc(50% - 8px);
      }
    }

    @media (max-width: 480px) {
      .grid-sizer,
      .vibe-item {
        width: 100%;
      }
    }

    /* Responsive columns - Small (5 -> 4 -> 3 -> 2 -> 1) */
    @media (max-width: 1400px) {
      :host([size='small']) .grid-sizer,
      :host([size='small']) .vibe-item {
        width: calc(25% - 12px);
      }
    }

    @media (max-width: 1200px) {
      :host([size='small']) .grid-sizer,
      :host([size='small']) .vibe-item {
        width: calc(33.333% - 10px);
      }
    }

    @media (max-width: 768px) {
      :host([size='small']) .grid-sizer,
      :host([size='small']) .vibe-item {
        width: calc(50% - 8px);
      }
    }

    @media (max-width: 480px) {
      :host([size='small']) .grid-sizer,
      :host([size='small']) .vibe-item {
        width: 100%;
      }
    }
  `;

  disconnectedCallback() {
    super.disconnectedCallback();
    this.destroyMasonry();
  }

  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('photos') || changedProperties.has('size')) {
      // Need to wait for render then initialize masonry
      void this.updateComplete.then(() => {
        this.initMasonry();
      });
    }
  }

  private destroyMasonry() {
    if (this.masonry) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.masonry.destroy?.();
      this.masonry = null;
    }
  }

  private initMasonry() {
    this.destroyMasonry();

    const grid = this.shadowRoot?.querySelector('.vibe-grid');
    if (!grid || this.photos.length === 0) return;

    // Initialize Masonry
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.masonry = new Masonry(grid as HTMLElement, {
      itemSelector: '.vibe-item',
      columnWidth: '.grid-sizer',
      percentPosition: true,
      gutter: 15,
      originLeft: true,
      originTop: true,
    });

    this.ready = true;
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
    return html`
      <div class="vibe-grid">
        <div class="grid-sizer"></div>
        ${this.photos.map((photo, index) => {
          const aspectRatio =
            photo.width && photo.height ? `${photo.width}/${photo.height}` : '3/2';

          return html`
            <div class="vibe-item" @click=${() => this.handlePhotoClick(photo, index)}>
              <lazy-image
                src="${photo.url_thumbnail}"
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
    'vibe-layout': VibeLayout;
  }
}
