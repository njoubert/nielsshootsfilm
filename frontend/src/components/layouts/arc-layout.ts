/**
 * Arc Layout - Justified row-based layout using Flickr's justified-layout algorithm.
 * Photos are arranged in rows with equal heights, varying widths based on aspect ratio.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - justified-layout doesn't have proper types
import justifiedLayout from 'justified-layout';
import type { LayoutSize, Photo } from '../../types/data-models';
import '../lazy-image';

interface LayoutBox {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface LayoutGeometry {
  containerHeight: number;
  boxes: LayoutBox[];
}

@customElement('arc-layout')
export class ArcLayout extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];
  @property({ type: String }) size: LayoutSize = 'large';

  @state() private containerWidth = 0;
  @state() private geometry: LayoutGeometry | null = null;

  private resizeObserver?: ResizeObserver;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .arc-container {
      position: relative;
      width: 100%;
    }

    .arc-item {
      position: absolute;
      left: 0;
      top: 0;
      overflow: hidden;
      cursor: pointer;
    }

    .arc-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .image-wrapper {
      width: 100%;
      overflow: hidden;
    }

    .image-wrapper lazy-image {
      width: 100%;
      height: 100%;
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

  connectedCallback() {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.containerWidth = entry.contentRect.width;
        this.calculateLayout();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver?.disconnect();
  }

  protected firstUpdated() {
    const container = this.shadowRoot?.querySelector('.arc-container');
    if (container) {
      this.resizeObserver?.observe(container);
    }
  }

  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('photos') || changedProperties.has('size')) {
      this.calculateLayout();
    }
  }

  private get targetRowHeight(): number {
    return this.size === 'small' ? 250 : 350;
  }

  private calculateLayout() {
    if (!this.containerWidth || this.photos.length === 0) {
      this.geometry = null;
      return;
    }

    // Calculate aspect ratios from stored dimensions
    const aspectRatios = this.photos.map((photo) => {
      if (photo.width && photo.height) {
        return photo.width / photo.height;
      }
      return 1.5; // Default aspect ratio if dimensions not available
    });

    // Run justified-layout algorithm
    this.geometry = (justifiedLayout as (ratios: number[], opts: object) => LayoutGeometry)(
      aspectRatios,
      {
        containerWidth: this.containerWidth,
        targetRowHeight: this.targetRowHeight,
        targetRowHeightTolerance: 0.2,
        boxSpacing: 15,
      }
    );
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
    const containerHeight = this.geometry?.containerHeight || 0;

    return html`
      <div class="arc-container" style="height: ${containerHeight}px">
        ${this.geometry?.boxes.map((box, index) => {
          const photo = this.photos[index];
          if (!photo) return null;

          const aspectRatio =
            photo.width && photo.height ? `${photo.width}/${photo.height}` : '3/2';

          // Calculate image wrapper height (full box height minus caption if present)
          const captionHeight = photo.caption ? 36 : 0; // Approximate caption height
          const imageHeight = box.height - captionHeight;

          return html`
            <div
              class="arc-item"
              style="transform: translate(${box.left}px, ${box.top}px); width: ${box.width}px; height: ${box.height}px;"
              @click=${() => this.handlePhotoClick(photo, index)}
            >
              <div class="image-wrapper" style="height: ${imageHeight}px">
                <lazy-image
                  src="${photo.url_thumbnail}"
                  alt="${photo.alt_text || photo.caption || `Photo ${index + 1}`}"
                  aspectRatio="${aspectRatio}"
                ></lazy-image>
              </div>
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
    'arc-layout': ArcLayout;
  }
}
