/**
 * Tests for navigation utilities
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Album, Photo } from '../types/data-models';
import {
  createPhotoClickHandler,
  handleAlbumClickEvent,
  handleNavClick,
  navigateTo,
  navigateToAlbum,
  navigateToPhoto,
  routes,
} from './navigation';

describe('Navigation Library', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pushStateSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let dispatchEventSpy: any;

  beforeEach(() => {
    pushStateSpy = vi.spyOn(window.history, 'pushState');
    dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    pushStateSpy.mockRestore();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    dispatchEventSpy.mockRestore();
  });

  describe('Core Navigation', () => {
    describe('navigateTo', () => {
      it('should call pushState with correct URL', () => {
        navigateTo('/albums/test-album');

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/test-album');
      });

      it('should dispatch popstate event', () => {
        navigateTo('/albums/test-album');

        expect(dispatchEventSpy).toHaveBeenCalledOnce();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const event = dispatchEventSpy.mock.calls[0][0];
        expect(event).toBeInstanceOf(PopStateEvent);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(event.type).toBe('popstate');
      });

      it('should work with admin routes', () => {
        navigateTo('/admin/albums');

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/admin/albums');
      });

      it('should work with root path', () => {
        navigateTo('/');

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/');
      });
    });

    describe('handleNavClick', () => {
      it('should prevent default navigation', () => {
        const preventDefault = vi.fn();
        const mockEvent = {
          preventDefault,
          currentTarget: {
            getAttribute: vi.fn().mockReturnValue('/albums'),
          },
        } as unknown as Event;

        handleNavClick(mockEvent);

        expect(preventDefault).toHaveBeenCalledOnce();
      });

      it('should navigate to href attribute', () => {
        const mockEvent = {
          preventDefault: vi.fn(),
          currentTarget: {
            getAttribute: vi.fn().mockReturnValue('/albums/test'),
          },
        } as unknown as Event;

        handleNavClick(mockEvent);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/test');
      });

      it('should not navigate if href is null', () => {
        const mockEvent = {
          preventDefault: vi.fn(),
          currentTarget: {
            getAttribute: vi.fn().mockReturnValue(null),
          },
        } as unknown as Event;

        handleNavClick(mockEvent);

        expect(pushStateSpy).not.toHaveBeenCalled();
      });

      it('should not navigate if href is empty', () => {
        const mockEvent = {
          preventDefault: vi.fn(),
          currentTarget: {
            getAttribute: vi.fn().mockReturnValue(''),
          },
        } as unknown as Event;

        handleNavClick(mockEvent);

        expect(pushStateSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Route Builders', () => {
    describe('Public routes', () => {
      it('should build home route', () => {
        expect(routes.home()).toBe('/');
      });

      it('should build albums list route', () => {
        expect(routes.albums()).toBe('/albums');
      });

      it('should build album detail route', () => {
        expect(routes.album('my-album')).toBe('/albums/my-album');
      });

      it('should build photo viewer route', () => {
        expect(routes.photo('my-album', 'photo-123')).toBe('/albums/my-album/photo/photo-123');
      });

      it('should handle slugs with special characters', () => {
        expect(routes.album('test-album-2024')).toBe('/albums/test-album-2024');
        expect(routes.photo('test-album', 'photo-abc-123')).toBe(
          '/albums/test-album/photo/photo-abc-123'
        );
      });
    });

    describe('Admin routes', () => {
      it('should build admin root route', () => {
        expect(routes.admin.root()).toBe('/admin');
      });

      it('should build admin login route', () => {
        expect(routes.admin.login()).toBe('/admin/login');
      });

      it('should build admin dashboard route', () => {
        expect(routes.admin.dashboard()).toBe('/admin');
      });

      it('should build admin albums route', () => {
        expect(routes.admin.albums()).toBe('/admin/albums');
      });

      it('should build admin settings route', () => {
        expect(routes.admin.settings()).toBe('/admin/settings');
      });

      it('should build new album route', () => {
        expect(routes.admin.newAlbum()).toBe('/admin/albums/new');
      });

      it('should build edit album route', () => {
        expect(routes.admin.editAlbum('album-uuid-123')).toBe('/admin/albums/album-uuid-123/edit');
      });

      it('should handle UUIDs in edit album route', () => {
        const uuid = 'cca0a90d-7bb9-465d-a3f9-ab0a5eea9008';
        expect(routes.admin.editAlbum(uuid)).toBe(`/admin/albums/${uuid}/edit`);
      });
    });
  });

  describe('Semantic Navigation Functions', () => {
    describe('navigateToAlbum', () => {
      it('should navigate to album detail page', () => {
        navigateToAlbum('test-album');

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/test-album');
      });

      it('should use routes builder internally', () => {
        const slug = 'my-album-2024';
        navigateToAlbum(slug);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', routes.album(slug));
      });
    });

    describe('navigateToPhoto', () => {
      it('should navigate to photo viewer page', () => {
        navigateToPhoto('test-album', 'photo-123');

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/test-album/photo/photo-123');
      });

      it('should use routes builder internally', () => {
        const slug = 'my-album';
        const photoId = 'photo-abc';
        navigateToPhoto(slug, photoId);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', routes.photo(slug, photoId));
      });
    });
  });

  describe('Custom Event Handlers', () => {
    describe('createPhotoClickHandler', () => {
      const mockPhoto: Photo = {
        id: 'photo-123',
        filename_original: 'test.jpg',
        url_thumbnail: '/test-thumb.jpg',
        url_display: '/test-full.jpg',
        url_original: '/test-original.jpg',
        width: 1920,
        height: 1080,
        order: 0,
        file_size_original: 1024000,
        file_size_display: 512000,
        file_size_thumbnail: 102400,
        uploaded_at: '2024-01-01T00:00:00Z',
      };

      it('should create handler that navigates with static slug', () => {
        const handler = createPhotoClickHandler('my-album');
        const event = new CustomEvent('photo-click', {
          detail: { photo: mockPhoto, index: 0 },
        });

        handler(event);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/my-album/photo/photo-123');
      });

      it('should create handler that navigates with dynamic slug', () => {
        const getSlug = () => 'dynamic-album';
        const handler = createPhotoClickHandler(getSlug);
        const event = new CustomEvent('photo-click', {
          detail: { photo: mockPhoto, index: 0 },
        });

        handler(event);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/dynamic-album/photo/photo-123');
      });

      it('should not navigate if dynamic slug returns undefined', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const getSlug = () => undefined;
        const handler = createPhotoClickHandler(getSlug);
        const event = new CustomEvent('photo-click', {
          detail: { photo: mockPhoto, index: 0 },
        });

        handler(event);

        expect(pushStateSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Photo click ignored: album slug is not available'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should handle empty string slug gracefully', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const handler = createPhotoClickHandler('');
        const event = new CustomEvent('photo-click', {
          detail: { photo: mockPhoto, index: 0 },
        });

        handler(event);

        expect(pushStateSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });

      it('should work with different photo IDs', () => {
        const handler = createPhotoClickHandler('test-album');
        const photos = [
          { ...mockPhoto, id: 'photo-1' },
          { ...mockPhoto, id: 'photo-abc-123' },
          { ...mockPhoto, id: 'uuid-style-id' },
        ];

        photos.forEach((photo, index) => {
          const event = new CustomEvent('photo-click', {
            detail: { photo, index },
          });
          handler(event);
        });

        expect(pushStateSpy).toHaveBeenCalledTimes(3);
        expect(pushStateSpy).toHaveBeenNthCalledWith(1, {}, '', '/albums/test-album/photo/photo-1');
        expect(pushStateSpy).toHaveBeenNthCalledWith(
          2,
          {},
          '',
          '/albums/test-album/photo/photo-abc-123'
        );
        expect(pushStateSpy).toHaveBeenNthCalledWith(
          3,
          {},
          '',
          '/albums/test-album/photo/uuid-style-id'
        );
      });
    });

    describe('handleAlbumClickEvent', () => {
      const mockAlbum: Album = {
        id: 'album-uuid',
        slug: 'test-album',
        title: 'Test Album',
        subtitle: 'Test Subtitle',
        description: 'Test Description',
        visibility: 'public',
        allow_downloads: false,
        show_exif: true,
        order: 0,
        photos: [],
        cover_photo_id: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      it('should navigate to album detail page', () => {
        const event = new CustomEvent('album-click', {
          detail: { album: mockAlbum },
        });

        handleAlbumClickEvent(event);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/test-album');
      });

      it('should work with different album slugs', () => {
        const albums = [
          { ...mockAlbum, slug: 'portfolio' },
          { ...mockAlbum, slug: 'my-work-2024' },
          { ...mockAlbum, slug: 'street-photography' },
        ];

        albums.forEach((album) => {
          const event = new CustomEvent('album-click', {
            detail: { album },
          });
          handleAlbumClickEvent(event);
        });

        expect(pushStateSpy).toHaveBeenCalledTimes(3);
        expect(pushStateSpy).toHaveBeenNthCalledWith(1, {}, '', '/albums/portfolio');
        expect(pushStateSpy).toHaveBeenNthCalledWith(2, {}, '', '/albums/my-work-2024');
        expect(pushStateSpy).toHaveBeenNthCalledWith(3, {}, '', '/albums/street-photography');
      });

      it('should use navigateToAlbum internally', () => {
        const album = { ...mockAlbum, slug: 'internal-test' };
        const event = new CustomEvent('album-click', {
          detail: { album },
        });

        handleAlbumClickEvent(event);

        expect(pushStateSpy).toHaveBeenCalledWith({}, '', routes.album('internal-test'));
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle navigation flow from album list to photo viewer', () => {
      // User clicks on album card
      const album: Album = {
        id: 'album-1',
        slug: 'street-photos',
        title: 'Street Photos',
        subtitle: '',
        description: '',
        visibility: 'public',
        allow_downloads: false,
        show_exif: true,
        order: 0,
        photos: [],
        cover_photo_id: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const albumEvent = new CustomEvent('album-click', { detail: { album } });
      handleAlbumClickEvent(albumEvent);

      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/street-photos');

      // User clicks on a photo
      const photo: Photo = {
        id: 'photo-1',
        filename_original: 'img.jpg',
        url_thumbnail: '/thumb.jpg',
        url_display: '/full.jpg',
        url_original: '/original.jpg',
        width: 1920,
        height: 1080,
        order: 0,
        file_size_original: 1024000,
        file_size_display: 512000,
        file_size_thumbnail: 102400,
        uploaded_at: '2024-01-01T00:00:00Z',
      };

      const handler = createPhotoClickHandler('street-photos');
      const photoEvent = new CustomEvent('photo-click', { detail: { photo, index: 0 } });
      handler(photoEvent);

      expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/albums/street-photos/photo/photo-1');
    });

    it('should work with routes object for consistency', () => {
      const albumSlug = 'my-album';
      const photoId = 'photo-123';

      // Using routes object
      navigateTo(routes.album(albumSlug));
      expect(pushStateSpy).toHaveBeenLastCalledWith({}, '', '/albums/my-album');

      navigateTo(routes.photo(albumSlug, photoId));
      expect(pushStateSpy).toHaveBeenLastCalledWith({}, '', '/albums/my-album/photo/photo-123');

      // Using semantic functions (should produce same results)
      navigateToAlbum(albumSlug);
      expect(pushStateSpy).toHaveBeenLastCalledWith({}, '', '/albums/my-album');

      navigateToPhoto(albumSlug, photoId);
      expect(pushStateSpy).toHaveBeenLastCalledWith({}, '', '/albums/my-album/photo/photo-123');
    });
  });
});
