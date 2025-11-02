/**
 * API utility for fetching JSON data from the static data files.
 */

import type { Album, AlbumsData, SiteConfig } from '../types/data-models';

/**
 * Add cache-busting query parameter to URL.
 * This ensures browsers fetch fresh data after admin updates.
 */
function cacheBustUrl(url: string): string {
  const timestamp = Date.now();
  return `${url}?_=${timestamp}`;
}

/**
 * Fetch site configuration.
 */
export async function fetchSiteConfig(): Promise<SiteConfig> {
  console.debug('Fetching site config from /data/site_config.json');
  const response = await fetch(cacheBustUrl('/data/site_config.json'));
  if (!response.ok) {
    throw new Error(`Failed to fetch site config: ${response.statusText}`);
  }
  return response.json() as Promise<SiteConfig>;
}

/**
 * Fetch all albums data.
 */
export async function fetchAlbumsData(): Promise<AlbumsData> {
  console.debug('Fetching all albums data');
  const response = await fetch(cacheBustUrl('/data/albums.json'));
  if (!response.ok) {
    throw new Error(`Failed to fetch albums: ${response.statusText}`);
  }
  return response.json() as Promise<AlbumsData>;
}

/**
 * Fetch a single album by slug.
 */
export async function fetchAlbumBySlug(slug: string): Promise<Album | null> {
  console.debug(`Fetching album by slug: ${slug}`);
  const data = await fetchAlbumsData();
  return data.albums.find((album) => album.slug === slug) || null;
}

/**
 * Fetch the main portfolio album.
 */
export async function fetchMainPortfolioAlbum(): Promise<Album | null> {
  console.debug('Fetching main portfolio album');
  const [siteConfig, albumsData] = await Promise.all([fetchSiteConfig(), fetchAlbumsData()]);

  const mainAlbumId = siteConfig.portfolio.main_album_id;
  if (!mainAlbumId) {
    // Return first public album as fallback.
    return albumsData.albums.find((album) => album.visibility === 'public') || null;
  }

  return albumsData.albums.find((album) => album.id === mainAlbumId) || null;
}

/**
 * Fetch all public albums (for album listing page).
 */
export async function fetchPublicAlbums(): Promise<Album[]> {
  console.debug('Fetching public albums');
  const data = await fetchAlbumsData();
  return data.albums
    .filter((album) => album.visibility === 'public')
    .sort((a, b) => a.order - b.order);
}

/**
 * Verify password for a password-protected album.
 * Returns session token on success.
 */
export async function verifyAlbumPassword(
  albumId: string,
  password: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  console.debug(`Verifying password for album ID: ${albumId}`);
  const response = await fetch('/api/albums/verify-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ album_id: albumId, password }),
  });

  if (!response.ok) {
    return { success: false, error: 'Invalid password' };
  }

  const data = (await response.json()) as { token: string };
  return { success: true, token: data.token };
}

/**
 * Check if user has access to a password-protected album.
 */
export function hasAlbumAccess(albumId: string): boolean {
  console.debug(`Checking album access for album ID: ${albumId}`);
  const token = sessionStorage.getItem(`album_token_${albumId}`);
  return !!token;
}

/**
 * Store album access token.
 */
export function storeAlbumToken(albumId: string, token: string): void {
  console.debug(`Storing album token for album ID: ${albumId}`);
  sessionStorage.setItem(`album_token_${albumId}`, token);
}

/**
 * Clear album access token.
 */
export function clearAlbumToken(albumId: string): void {
  console.debug(`Clearing album token for album ID: ${albumId}`);
  sessionStorage.removeItem(`album_token_${albumId}`);
}
