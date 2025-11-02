import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Album, SiteConfig } from '../types/data-models';
import {
  fetchAlbumBySlug,
  fetchAlbumsData,
  fetchMainPortfolioAlbum,
  fetchPublicAlbums,
  fetchSiteConfig,
  hasAlbumAccess,
  storeAlbumToken,
  verifyAlbumPassword,
} from './api';

describe('api utilities', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
    // Clear fetch mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchSiteConfig', () => {
    it('should fetch and return site config', async () => {
      const mockConfig: SiteConfig = {
        version: '1.0.0',
        last_updated: '2025-10-19T00:00:00Z',
        site: { title: 'Test Site', language: 'en', timezone: 'UTC' },
        owner: { name: 'Test Owner' },
        social: {},
        branding: {
          primary_color: '#000000',
          secondary_color: '#666666',
          accent_color: '#ff6b6b',
          theme: {
            mode: 'system',
            light: {
              background: '#ffffff',
              surface: '#f5f5f5',
              text_primary: '#000000',
              text_secondary: '#666666',
              border: '#e0e0e0',
            },
            dark: {
              background: '#0a0a0a',
              surface: '#1a1a1a',
              text_primary: '#ffffff',
              text_secondary: '#999999',
              border: '#333333',
            },
          },
        },
        portfolio: { show_exif_data: true, enable_lightbox: true },
        navigation: {
          show_home: true,
          show_albums: true,
        },
        storage: {
          max_disk_usage_percent: 80,
          max_image_size_mb: 50,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      } as Response);

      const result = await fetchSiteConfig();

      expect(global.fetch).toHaveBeenCalledWith('/data/site_config.json');
      expect(result).toEqual(mockConfig);
    });

    it('should throw error on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(fetchSiteConfig()).rejects.toThrow('Failed to fetch site config');
    });

    it('should throw error on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchSiteConfig()).rejects.toThrow('Network error');
    });
  });

  describe('fetchAlbumsData', () => {
    it('should fetch and return albums data', async () => {
      const mockAlbums = {
        albums: [
          {
            id: 'album-1',
            slug: 'test-album',
            title: 'Test Album',
            visibility: 'public' as const,
            photos: [],
            allow_downloads: true,
            order: 1,
            created_at: '2025-10-19T00:00:00Z',
            updated_at: '2025-10-19T00:00:00Z',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAlbums),
      } as Response);

      const result = await fetchAlbumsData();

      expect(global.fetch).toHaveBeenCalledWith('/data/albums.json');
      expect(result).toEqual(mockAlbums);
    });

    it('should throw error on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(fetchAlbumsData()).rejects.toThrow('Failed to fetch albums');
    });
  });

  describe('fetchAlbumBySlug', () => {
    it('should fetch and return album by slug', async () => {
      const mockAlbum: Album = {
        id: 'album-1',
        slug: 'test-album',
        title: 'Test Album',
        visibility: 'public',
        photos: [],
        allow_downloads: true,
        order: 1,
        created_at: '2025-10-19T00:00:00Z',
        updated_at: '2025-10-19T00:00:00Z',
      };

      const mockAlbums = { albums: [mockAlbum] };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAlbums),
      } as Response);

      const result = await fetchAlbumBySlug('test-album');

      expect(result).toEqual(mockAlbum);
    });

    it('should return null for non-existent slug', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ albums: [] }),
      } as Response);

      const result = await fetchAlbumBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('fetchMainPortfolioAlbum', () => {
    it('should fetch main portfolio album', async () => {
      const mockConfig: SiteConfig = {
        version: '1.0.0',
        last_updated: '2025-10-19T00:00:00Z',
        site: { title: 'Test', language: 'en', timezone: 'UTC' },
        owner: {},
        social: {},
        branding: {
          primary_color: '#000',
          secondary_color: '#666',
          accent_color: '#f00',
          theme: {
            mode: 'system',
            light: {
              background: '#fff',
              surface: '#f5f5f5',
              text_primary: '#000',
              text_secondary: '#666',
              border: '#e0e0e0',
            },
            dark: {
              background: '#0a0a0a',
              surface: '#1a1a1a',
              text_primary: '#fff',
              text_secondary: '#999',
              border: '#333',
            },
          },
        },
        portfolio: { main_album_id: 'main-album', show_exif_data: true, enable_lightbox: true },
        navigation: {
          show_home: true,
          show_albums: true,
        },
        storage: {
          max_disk_usage_percent: 80,
          max_image_size_mb: 50,
        },
      };

      const mockAlbum: Album = {
        id: 'main-album',
        slug: 'portfolio',
        title: 'Main Portfolio',
        visibility: 'public',
        photos: [],
        allow_downloads: true,
        order: 1,
        created_at: '2025-10-19T00:00:00Z',
        updated_at: '2025-10-19T00:00:00Z',
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ albums: [mockAlbum] }),
        } as Response);

      const result = await fetchMainPortfolioAlbum();

      expect(result).toEqual(mockAlbum);
    });

    it('should throw error when fetch fails', async () => {
      // Mock only config fetch - albums fetch will fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch albums'));

      await expect(fetchMainPortfolioAlbum()).rejects.toThrow('Failed to fetch albums');
    });
  });

  describe('fetchPublicAlbums', () => {
    it('should return only public albums', async () => {
      const mockAlbums = {
        albums: [
          {
            id: '1',
            slug: 'public',
            title: 'Public',
            visibility: 'public' as const,
            photos: [],
            allow_downloads: true,
            order: 1,
            created_at: '2025-10-19T00:00:00Z',
            updated_at: '2025-10-19T00:00:00Z',
          },
          {
            id: '2',
            slug: 'unlisted',
            title: 'Unlisted',
            visibility: 'unlisted' as const,
            photos: [],
            allow_downloads: true,
            order: 2,
            created_at: '2025-10-19T00:00:00Z',
            updated_at: '2025-10-19T00:00:00Z',
          },
          {
            id: '3',
            slug: 'protected',
            title: 'Protected',
            visibility: 'password_protected' as const,
            photos: [],
            allow_downloads: true,
            order: 3,
            created_at: '2025-10-19T00:00:00Z',
            updated_at: '2025-10-19T00:00:00Z',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAlbums),
      } as Response);

      const result = await fetchPublicAlbums();

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe('public');
    });
  });

  describe('album token management', () => {
    it('should store album token and grant access', () => {
      const albumId = 'test-album';
      const token = 'test-token';

      expect(hasAlbumAccess(albumId)).toBe(false);

      storeAlbumToken(albumId, token);

      expect(hasAlbumAccess(albumId)).toBe(true);
    });

    it('should check album access returns false without token', () => {
      expect(hasAlbumAccess('non-existent')).toBe(false);
    });
  });

  describe('verifyAlbumPassword', () => {
    it('should verify password successfully', async () => {
      const mockData = {
        token: 'test-token',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await verifyAlbumPassword('test-album', 'correct-password');

      expect(global.fetch).toHaveBeenCalledWith('/api/albums/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ album_id: 'test-album', password: 'correct-password' }),
      });
      expect(result).toEqual({ success: true, token: 'test-token' });
    });

    it('should handle verification failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid password',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await verifyAlbumPassword('album-id', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(verifyAlbumPassword('album-id', 'password')).rejects.toThrow('Network error');
    });
  });
});
