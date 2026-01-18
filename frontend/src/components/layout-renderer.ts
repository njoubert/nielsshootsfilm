/**
 * Layout Renderer - Switches between different album layout algorithms.
 * This is the main component used by album-detail-page to render photos.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AlbumLayout, LayoutSize, Photo } from '../types/data-models';

// Import all layout components
import './layouts/arc-layout';
import './layouts/big-layout';
import './layouts/fit-layout';
import './layouts/insta-layout';
import './layouts/vibe-layout';

@customElement('layout-renderer')
export class LayoutRenderer extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];
  @property({ type: String }) layout: AlbumLayout = 'arc';
  @property({ type: String }) size: LayoutSize = 'large';

  static styles = css`
    :host {
      display: block;
    }
  `;

  private handlePhotoClick = (e: CustomEvent<{ photo: Photo; index: number }>) => {
    // Re-dispatch photo-click events from child layouts
    this.dispatchEvent(
      new CustomEvent('photo-click', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      })
    );
  };

  render() {
    switch (this.layout) {
      case 'arc':
        return html`
          <arc-layout
            .photos=${this.photos}
            .size=${this.size}
            @photo-click=${this.handlePhotoClick}
          ></arc-layout>
        `;
      case 'vibe':
        return html`
          <vibe-layout
            .photos=${this.photos}
            .size=${this.size}
            @photo-click=${this.handlePhotoClick}
          ></vibe-layout>
        `;
      case 'insta':
        return html`
          <insta-layout
            .photos=${this.photos}
            .size=${this.size}
            @photo-click=${this.handlePhotoClick}
          ></insta-layout>
        `;
      case 'fit':
        return html`
          <fit-layout .photos=${this.photos} @photo-click=${this.handlePhotoClick}></fit-layout>
        `;
      case 'big':
        return html`
          <big-layout .photos=${this.photos} @photo-click=${this.handlePhotoClick}></big-layout>
        `;
      default:
        return html`
          <arc-layout
            .photos=${this.photos}
            .size=${this.size}
            @photo-click=${this.handlePhotoClick}
          ></arc-layout>
        `;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'layout-renderer': LayoutRenderer;
  }
}
