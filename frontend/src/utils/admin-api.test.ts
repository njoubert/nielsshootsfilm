import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Album, SiteConfig } from '../types/data-models';
import {
  changePassword,
  checkAuth,
  createAlbum,
  deleteAlbum,
  deletePhoto,
  fetchAdminSiteConfig,
  fetchAlbumById,
  fetchAllAlbums,
  login,
  logout,
  removeAlbumPassword,
  setAlbumPassword,
  setCoverPhoto,
  setMainPortfolioAlbum,
  updateAlbum,
  updateSiteConfig,
  uploadPhotos,
} from './admin-api';

describe('admin-api utilities', () => {
  const API_BASE_URL = 'http://localhost:6180';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    describe('login', () => {
      it('should login successfully', async () => {
        const mockResponse = { message: 'Logged in' };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await login({ username: 'admin', password: 'testpass123' }); // pragma: allowlist secret

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:6180/api/admin/login',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username: 'admin', password: 'testpass123' }), // pragma: allowlist secret
          })
        );
        expect(result).toEqual(mockResponse);
      });
      it('should handle login failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Invalid credentials'),
        });

        await expect(
          login({ username: 'admin', password: 'wrongpass' }) // pragma: allowlist secret
        ).rejects.toThrow('Invalid credentials');
      });
    });

    describe('logout', () => {
      it('should logout successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await logout();

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/admin/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      });

      it('should throw error on logout failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
        } as Response);

        await expect(logout()).rejects.toThrow('Logout failed');
      });
    });

    describe('checkAuth', () => {
      it('should return true when authenticated (400 bad request)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          status: 400,
          ok: true,
        } as Response);

        const result = await checkAuth();

        expect(result).toBe(true);
      });

      it('should return true when authenticated (200 ok)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          status: 200,
          ok: true,
        } as Response);

        const result = await checkAuth();

        expect(result).toBe(true);
      });

      it('should return false when not authenticated (401)', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          status: 401,
          ok: false,
        } as Response);

        const result = await checkAuth();

        expect(result).toBe(false);
      });

      it('should return false on network error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        const result = await checkAuth();

        expect(result).toBe(false);
      });
    });
  });

  describe('Album Management', () => {
    describe('createAlbum', () => {
      it('should create album successfully', async () => {
        const newAlbum: Album = {
          id: 'new-album',
          slug: 'new-album',
          title: 'New Album',
          visibility: 'public',
          photos: [],
          allow_downloads: true,
          show_exif: true,
          order: 1,
          created_at: '2025-10-20T00:00:00Z',
          updated_at: '2025-10-20T00:00:00Z',
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(newAlbum),
        } as Response);

        const result = await createAlbum({
          title: 'New Album',
          visibility: 'public',
          order: 1,
        });

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/admin/albums`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: 'New Album', visibility: 'public', order: 1 }),
        });
        expect(result).toEqual(newAlbum);
      });

      it('should throw error on creation failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Validation error'),
        } as Response);

        await expect(
          createAlbum({ title: 'Test', visibility: 'public', order: 1 })
        ).rejects.toThrow('Validation error');
      });
    });

    describe('updateAlbum', () => {
      it('should update album successfully', async () => {
        const existingAlbum: Album = {
          id: 'album-1',
          slug: 'album-1',
          title: 'Original Title',
          visibility: 'public',
          photos: [],
          allow_downloads: true,
          show_exif: true,
          order: 1,
          created_at: '2025-10-20T00:00:00Z',
          updated_at: '2025-10-20T00:00:00Z',
        };

        const updatedAlbum = { ...existingAlbum, title: 'Updated Title' };

        // Mock fetchAlbumById and update
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(existingAlbum),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(updatedAlbum),
          } as Response);

        const result = await updateAlbum('album-1', { title: 'Updated Title' });

        expect(result.title).toBe('Updated Title');
      });

      it('should throw error on update failure', async () => {
        global.fetch = vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 'album-1',
                slug: 'album-1',
                title: 'Test',
                visibility: 'public',
                photos: [],
                allow_downloads: true,
                show_exif: true,
                order: 1,
                created_at: '2025-10-20T00:00:00Z',
                updated_at: '2025-10-20T00:00:00Z',
              }),
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            text: () => Promise.resolve('Update failed'),
          } as Response);

        await expect(updateAlbum('album-1', { title: 'New Title' })).rejects.toThrow(
          'Update failed'
        );
      });
    });

    describe('deleteAlbum', () => {
      it('should delete album successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await deleteAlbum('album-1');

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/admin/albums/album-1`, {
          method: 'DELETE',
          credentials: 'include',
        });
      });

      it('should throw error on delete failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Delete failed'),
        } as Response);

        await expect(deleteAlbum('album-1')).rejects.toThrow('Delete failed');
      });
    });

    describe('fetchAlbumById', () => {
      it('should fetch album by ID', async () => {
        const mockAlbum: Album = {
          id: 'album-1',
          slug: 'test',
          title: 'Test Album',
          visibility: 'public',
          photos: [],
          allow_downloads: true,
          show_exif: true,
          order: 1,
          created_at: '2025-10-20T00:00:00Z',
          updated_at: '2025-10-20T00:00:00Z',
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockAlbum),
        } as Response);

        const result = await fetchAlbumById('album-1');

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/albums/album-1`);
        expect(result).toEqual(mockAlbum);
      });

      it('should throw error when album not found', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
        } as Response);

        await expect(fetchAlbumById('nonexistent')).rejects.toThrow('Album not found');
      });
    });

    describe('fetchAllAlbums', () => {
      it('should fetch all albums', async () => {
        const mockAlbums: Album[] = [
          {
            id: 'album-1',
            slug: 'album-1',
            title: 'Album 1',
            visibility: 'public',
            photos: [],
            allow_downloads: true,
            show_exif: true,
            order: 1,
            created_at: '2025-10-20T00:00:00Z',
            updated_at: '2025-10-20T00:00:00Z',
          },
          {
            id: 'album-2',
            slug: 'album-2',
            title: 'Album 2',
            visibility: 'unlisted',
            photos: [],
            allow_downloads: true,
            show_exif: true,
            order: 2,
            created_at: '2025-10-20T00:00:00Z',
            updated_at: '2025-10-20T00:00:00Z',
          },
        ];

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ albums: mockAlbums }),
        } as Response);

        const result = await fetchAllAlbums();

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/albums`);
        expect(result).toEqual(mockAlbums);
      });
    });
  });

  describe('Photo Management', () => {
    describe('uploadPhotos', () => {
      it('should upload photos successfully with concurrent uploads', async () => {
        // Mock XMLHttpRequest
        const xhrMock = {
          open: vi.fn(),
          send: vi.fn(),
          upload: {
            addEventListener: vi.fn(),
          },
          addEventListener: vi.fn((event: string, handler: () => void) => {
            if (event === 'load') {
              // Simulate successful upload
              setTimeout(() => {
                xhrMock.status = 200;
                xhrMock.responseText = JSON.stringify({
                  uploaded: [
                    {
                      id: 'photo-1',
                      filename_original: 'test.jpg',
                      url_thumbnail: '/uploads/thumbnails/test.jpg',
                    },
                  ],
                  errors: [],
                });
                handler();
              }, 0);
            }
          }),
          status: 0,
          responseText: '',
        };

        global.XMLHttpRequest = vi.fn(() => xhrMock) as unknown as typeof XMLHttpRequest;

        const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
        const result = await uploadPhotos('album-1', [mockFile]);

        expect(result.uploaded).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle empty file array', async () => {
        const result = await uploadPhotos('album-1', []);

        expect(result.uploaded).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('deletePhoto', () => {
      it('should delete photo successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await deletePhoto('album-1', 'photo-1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/api/admin/albums/album-1/photos/photo-1`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );
      });

      it('should throw error on delete failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Delete failed'),
        } as Response);

        await expect(deletePhoto('album-1', 'photo-1')).rejects.toThrow('Delete failed');
      });
    });

    describe('setCoverPhoto', () => {
      it('should set cover photo successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await setCoverPhoto('album-1', 'photo-1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/api/admin/albums/album-1/set-cover`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ photo_id: 'photo-1' }),
          }
        );
      });

      it('should throw error on failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Failed to set cover'),
        } as Response);

        await expect(setCoverPhoto('album-1', 'photo-1')).rejects.toThrow('Failed to set cover');
      });
    });
  });

  describe('Album Security', () => {
    describe('setAlbumPassword', () => {
      it('should set album password successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await setAlbumPassword('album-1', 'secret123');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/api/admin/albums/album-1/set-password`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ password: 'secret123' }),
          }
        );
      });

      it('should throw error on failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Password too weak'),
        } as Response);

        await expect(setAlbumPassword('album-1', '123')).rejects.toThrow('Password too weak');
      });
    });

    describe('removeAlbumPassword', () => {
      it('should remove album password successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await removeAlbumPassword('album-1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/api/admin/albums/album-1/password`,
          {
            method: 'DELETE',
            credentials: 'include',
          }
        );
      });

      it('should throw error on failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Failed to remove password'),
        } as Response);

        await expect(removeAlbumPassword('album-1')).rejects.toThrow('Failed to remove password');
      });
    });
  });

  describe('Site Configuration', () => {
    describe('fetchAdminSiteConfig', () => {
      it('should fetch site config via admin API', async () => {
        const mockConfig: SiteConfig = {
          version: '1.0.0',
          last_updated: '2025-10-20T00:00:00Z',
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

        const result = await fetchAdminSiteConfig();

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/config`, {
          method: 'GET',
          credentials: 'include',
        });
        expect(result).toEqual(mockConfig);
      });

      it('should throw error on fetch failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Unauthorized'),
        } as Response);

        await expect(fetchAdminSiteConfig()).rejects.toThrow('Unauthorized');
      });
    });

    describe('updateSiteConfig', () => {
      it('should update site config successfully', async () => {
        const mockConfig: SiteConfig = {
          version: '1.0.0',
          last_updated: '2025-10-20T00:00:00Z',
          site: { title: 'Updated Site', language: 'en', timezone: 'UTC' },
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

        const result = await updateSiteConfig(mockConfig);

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/admin/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(mockConfig),
        });
        expect(result).toEqual(mockConfig);
      });

      it('should throw error on update failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Invalid config'),
        } as Response);

        await expect(updateSiteConfig({} as SiteConfig)).rejects.toThrow('Invalid config');
      });
    });

    describe('setMainPortfolioAlbum', () => {
      it('should set main portfolio album successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await setMainPortfolioAlbum('album-1');

        expect(global.fetch).toHaveBeenCalledWith(
          `${API_BASE_URL}/api/admin/config/main-portfolio-album`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ album_id: 'album-1' }),
          }
        );
      });

      it('should throw error on failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Album not found'),
        } as Response);

        await expect(setMainPortfolioAlbum('nonexistent')).rejects.toThrow('Album not found');
      });
    });

    describe('changePassword', () => {
      it('should change password successfully', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
        } as Response);

        await changePassword('oldpass', 'newpass');

        expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/admin/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ old_password: 'oldpass', new_password: 'newpass' }),
        });
      });

      it('should throw error on failure', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          text: () => Promise.resolve('Incorrect old password'),
        } as Response);

        await expect(changePassword('wrong', 'newpass')).rejects.toThrow('Incorrect old password');
      });
    });
  });
});
