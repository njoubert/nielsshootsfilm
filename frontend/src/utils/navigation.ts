/**
 * @fileoverview Client-side navigation utilities for SPA routing.
 *
 * This module provides a comprehensive set of utilities for handling client-side
 * navigation without full page reloads. It includes:
 * - Core navigation primitives (navigateTo, handleNavClick)
 * - Semantic route builders for common app routes
 * - Event handlers for custom component events
 * - Type-safe navigation with TypeScript
 *
 * @example Basic usage
 * ```typescript
 * import { navigateTo, routes } from '../utils/navigation';
 *
 * // Programmatic navigation
 * navigateTo(routes.album('my-album'));
 *
 * // In templates
 * html`<a href="/albums" @click=${handleNavClick}>Albums</a>`;
 * ```
 */

import type { Album, Photo } from '../types/data-models';

// ============================================================================
// Core Navigation
// ============================================================================

/**
 * Performs client-side navigation to a URL using the History API.
 * Updates the browser's URL bar and triggers a popstate event to update the UI.
 *
 * This is the foundation for all programmatic navigation in the app.
 *
 * @param url - The URL path to navigate to (e.g., '/albums/my-album')
 *
 * @example
 * ```typescript
 * navigateTo('/albums/my-album');
 * navigateTo('/admin/settings');
 * ```
 */
export function navigateTo(url: string): void {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * Event handler for anchor tag clicks that enables client-side routing.
 * Prevents the default browser navigation and uses pushState instead.
 *
 * Use this on anchor tags to enable instant navigation without page reloads.
 *
 * @param e - The click event from an anchor tag
 *
 * @example
 * ```typescript
 * render() {
 *   return html`
 *     <a href="/albums" @click=${handleNavClick}>View Albums</a>
 *     <a href="/admin" @click=${handleNavClick}>Admin</a>
 *   `;
 * }
 * ```
 */
export function handleNavClick(e: Event): void {
  e.preventDefault();
  const link = e.currentTarget as HTMLAnchorElement;
  const url = link.getAttribute('href');
  if (url) {
    navigateTo(url);
  }
}

// ============================================================================
// Route Builders - Semantic URL Construction
// ============================================================================

/**
 * Centralized route builders for type-safe URL construction.
 * Use these instead of manually building URL strings to prevent typos
 * and ensure consistency across the application.
 *
 * @example
 * ```typescript
 * import { routes } from '../utils/navigation';
 *
 * navigateTo(routes.album('my-album'));           // '/albums/my-album'
 * navigateTo(routes.photo('my-album', 'photo-1')); // '/albums/my-album/photo/photo-1'
 * navigateTo(routes.admin.editAlbum('album-id')); // '/admin/albums/album-id/edit'
 * ```
 */
export const routes = {
  /** Home/portfolio page: '/' */
  home: () => '/',

  /** Albums list page: '/albums' */
  albums: () => '/albums',

  /** Album detail page: '/albums/:slug' */
  album: (slug: string) => `/albums/${slug}`,

  /** Album download page: '/albums/:slug/download' */
  albumDownload: (slug: string) => `/albums/${slug}/download`,

  /** Photo viewer page: '/albums/:slug/photo/:photoId' */
  photo: (albumSlug: string, photoId: string) => `/albums/${albumSlug}/photo/${photoId}`,

  /** Admin routes */
  admin: {
    /** Admin root: '/admin' */
    root: () => '/admin',

    /** Admin login: '/admin/login' */
    login: () => '/admin/login',

    /** Admin dashboard: '/admin' */
    dashboard: () => '/admin',

    /** Admin albums list: '/admin/albums' */
    albums: () => '/admin/albums',

    /** Admin settings: '/admin/settings' */
    settings: () => '/admin/settings',

    /** Create new album: '/admin/albums/new' */
    newAlbum: () => '/admin/albums/new',

    /** Edit album: '/admin/albums/:id/edit' */
    editAlbum: (albumId: string) => `/admin/albums/${albumId}/edit`,
  },
} as const;

// ============================================================================
// Semantic Navigation Functions
// ============================================================================

/**
 * Navigate to an album detail page.
 *
 * @param albumSlug - The album slug
 *
 * @example
 * ```typescript
 * navigateToAlbum('my-album');
 * ```
 */
export function navigateToAlbum(albumSlug: string): void {
  navigateTo(routes.album(albumSlug));
}

/**
 * Navigate to a photo viewer page.
 *
 * @param albumSlug - The album slug
 * @param photoId - The photo ID
 *
 * @example
 * ```typescript
 * navigateToPhoto('my-album', 'photo-123');
 * ```
 */
export function navigateToPhoto(albumSlug: string, photoId: string): void {
  navigateTo(routes.photo(albumSlug, photoId));
}

// ============================================================================
// Custom Event Handlers - Component Integration
// ============================================================================

/**
 * Creates an event handler for photo-click events from the photo-grid component.
 * Supports both static and dynamic album slugs for flexibility.
 *
 * @param albumSlug - The album slug (static string or function returning slug)
 * @returns Event handler for photo-click events
 *
 * @example Static slug
 * ```typescript
 * private handlePhotoClick = createPhotoClickHandler('my-album');
 *
 * render() {
 *   return html`<photo-grid @photo-click=${this.handlePhotoClick}></photo-grid>`;
 * }
 * ```
 *
 * @example Dynamic slug (from component state)
 * ```typescript
 * private handlePhotoClick = createPhotoClickHandler(() => this.album?.slug);
 *
 * render() {
 *   return html`<photo-grid @photo-click=${this.handlePhotoClick}></photo-grid>`;
 * }
 * ```
 */
export function createPhotoClickHandler(
  albumSlug: string | (() => string | undefined)
): (e: CustomEvent<{ photo: Photo; index: number }>) => void {
  return (e: CustomEvent<{ photo: Photo; index: number }>) => {
    const slug = typeof albumSlug === 'function' ? albumSlug() : albumSlug;
    if (!slug) {
      console.warn('Photo click ignored: album slug is not available');
      return;
    }
    const { photo } = e.detail;
    navigateToPhoto(slug, photo.id);
  };
}

/**
 * Event handler for album-click events from the album-card component.
 * Extracts the album from the event detail and navigates to its detail page.
 *
 * Use this directly in templates - no factory function needed.
 *
 * @param e - The custom event from album-card component
 *
 * @example
 * ```typescript
 * import { handleAlbumClickEvent } from '../utils/navigation';
 *
 * render() {
 *   return html`
 *     <album-card
 *       .album=${album}
 *       @album-click=${handleAlbumClickEvent}>
 *     </album-card>
 *   `;
 * }
 * ```
 */
export function handleAlbumClickEvent(e: CustomEvent<{ album: Album }>): void {
  const { album } = e.detail;
  navigateToAlbum(album.slug);
}
