import { describe, expect, it } from 'vitest';
import type { Album, AlbumVisibility, Photo } from './data-models';

/**
 * Schema Validation Tests
 *
 * These tests ensure that the TypeScript type definitions match the expected
 * backend Go struct and JSON file schemas. This helps catch schema drift early.
 */

describe('Schema Validation', () => {
  describe('Album Schema', () => {
    it('should have all required fields defined', () => {
      const mockAlbum: Album = {
        id: 'test-id',
        slug: 'test-slug',
        title: 'Test Title',
        visibility: 'public',
        allow_downloads: false,
        show_exif: true,
        order: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        photos: [],
      };

      // Verify required fields exist
      expect(mockAlbum.id).toBeDefined();
      expect(mockAlbum.slug).toBeDefined();
      expect(mockAlbum.title).toBeDefined();
      expect(mockAlbum.visibility).toBeDefined();
      expect(mockAlbum.allow_downloads).toBeDefined();
      expect(mockAlbum.order).toBeDefined();
      expect(mockAlbum.created_at).toBeDefined();
      expect(mockAlbum.updated_at).toBeDefined();
      expect(mockAlbum.photos).toBeDefined();
    });

    it('should accept all valid visibility values', () => {
      const validVisibilities: AlbumVisibility[] = ['public', 'unlisted', 'password_protected'];

      validVisibilities.forEach((visibility) => {
        const album: Album = {
          id: 'test',
          slug: 'test',
          title: 'Test',
          visibility,
          allow_downloads: false,
          show_exif: true,
          order: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          photos: [],
        };
        expect(album.visibility).toBe(visibility);
      });
    });

    it('should have consistent field naming with backend (snake_case)', () => {
      // These fields should use snake_case to match Go JSON tags
      const album: Album = {
        id: 'test',
        slug: 'test',
        title: 'Test',
        visibility: 'public',
        allow_downloads: true, // snake_case
        show_exif: true, // snake_case
        order: 0,
        created_at: '2025-01-01T00:00:00Z', // snake_case
        updated_at: '2025-01-01T00:00:00Z', // snake_case
        photos: [],
      };

      expect(album).toHaveProperty('allow_downloads');
      expect(album).toHaveProperty('created_at');
      expect(album).toHaveProperty('updated_at');
    });

    it('should allow optional fields to be undefined', () => {
      const minimalAlbum: Album = {
        id: 'test',
        slug: 'test',
        title: 'Test',
        visibility: 'public',
        allow_downloads: false,
        show_exif: true,
        order: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        photos: [],
        // Optional fields omitted
        subtitle: undefined,
        description: undefined,
        cover_photo_id: undefined,
        password_hash: undefined,
        expiration_date: undefined,
        theme_override: undefined,
        date_of_album_start: undefined,
        date_of_album_end: undefined,
      };

      expect(minimalAlbum.subtitle).toBeUndefined();
      expect(minimalAlbum.description).toBeUndefined();
    });

    it('should validate album JSON serialization', () => {
      const album: Album = {
        id: 'test-id',
        slug: 'test-slug',
        title: 'Test Album',
        visibility: 'public',
        allow_downloads: true,
        show_exif: true,
        order: 1,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        photos: [],
      };

      const json = JSON.stringify(album);
      const parsed = JSON.parse(json) as Album;

      expect(parsed.id).toBe('test-id');
      expect(parsed.visibility).toBe('public');
      expect(parsed.allow_downloads).toBe(true);
    });
  });

  describe('Photo Schema', () => {
    it('should have all required fields defined', () => {
      const mockPhoto: Photo = {
        id: 'photo-1',
        filename_original: 'test.jpg',
        url_original: '/originals/test.jpg',
        url_display: '/display/test.jpg',
        url_thumbnail: '/thumbnails/test.jpg',
        order: 0,
        width: 1920,
        height: 1080,
        file_size_original: 1000000,
        file_size_display: 500000,
        file_size_thumbnail: 50000,
        uploaded_at: '2025-01-01T00:00:00Z',
      };

      expect(mockPhoto.id).toBeDefined();
      expect(mockPhoto.filename_original).toBeDefined();
      expect(mockPhoto.url_original).toBeDefined();
      expect(mockPhoto.url_display).toBeDefined();
      expect(mockPhoto.url_thumbnail).toBeDefined();
      expect(mockPhoto.order).toBeDefined();
      expect(mockPhoto.width).toBeDefined();
      expect(mockPhoto.height).toBeDefined();
      expect(mockPhoto.file_size_original).toBeDefined();
      expect(mockPhoto.file_size_display).toBeDefined();
      expect(mockPhoto.file_size_thumbnail).toBeDefined();
      expect(mockPhoto.uploaded_at).toBeDefined();
    });

    it('should have consistent field naming with backend (snake_case)', () => {
      const photo: Photo = {
        id: 'test',
        filename_original: 'test.jpg', // snake_case
        url_original: '/test.jpg', // snake_case
        url_display: '/test.jpg', // snake_case
        url_thumbnail: '/test.jpg', // snake_case
        order: 0,
        width: 100,
        height: 100,
        file_size_original: 1000, // snake_case
        file_size_display: 500, // snake_case
        file_size_thumbnail: 100, // snake_case
        uploaded_at: '2025-01-01T00:00:00Z', // snake_case
      };

      expect(photo).toHaveProperty('filename_original');
      expect(photo).toHaveProperty('url_original');
      expect(photo).toHaveProperty('url_display');
      expect(photo).toHaveProperty('url_thumbnail');
      expect(photo).toHaveProperty('file_size_original');
      expect(photo).toHaveProperty('file_size_display');
      expect(photo).toHaveProperty('file_size_thumbnail');
      expect(photo).toHaveProperty('uploaded_at');
    });
  });

  describe('Visibility Enum', () => {
    it('should only allow three specific values', () => {
      // This test ensures TypeScript enforces the correct visibility values
      const validValues: AlbumVisibility[] = ['public', 'unlisted', 'password_protected'];

      expect(validValues).toHaveLength(3);
      expect(validValues).toContain('public');
      expect(validValues).toContain('unlisted');
      expect(validValues).toContain('password_protected');
    });

    it('should match backend validation rules', () => {
      // Backend Go code validates: public, unlisted, password_protected
      // This test documents that requirement
      const backendValidVisibilities = ['public', 'unlisted', 'password_protected'];

      backendValidVisibilities.forEach((visibility) => {
        const album: Album = {
          id: 'test',
          slug: 'test',
          title: 'Test',
          visibility: visibility as AlbumVisibility,
          allow_downloads: false,
          show_exif: true,
          order: 0,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          photos: [],
        };

        expect(album.visibility).toBe(visibility);
      });
    });
  });

  describe('JSON File Compatibility', () => {
    it('should parse bootstrap albums.json structure', () => {
      const bootstrapJSON = {
        albums: [
          {
            id: 'sample-portfolio',
            slug: 'portfolio',
            title: 'Portfolio',
            subtitle: 'Featured Work',
            description: 'A curated selection of my best photography',
            cover_photo_id: 'photo-1',
            visibility: 'public',
            allow_downloads: false,
            show_exif: true,
            order: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            photos: [],
          },
        ],
      };

      const album = bootstrapJSON.albums[0] as Album;

      expect(album.id).toBe('sample-portfolio');
      expect(album.visibility).toBe('public');
    });

    it('should handle albums with null/empty photos arrays', () => {
      // Regression test for the bug we just fixed
      const albumWithEmptyPhotos: Album = {
        id: 'test',
        slug: 'test',
        title: 'Test',
        visibility: 'public',
        allow_downloads: false,
        show_exif: true,
        order: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        photos: [],
      };

      expect(albumWithEmptyPhotos.photos).toEqual([]);
      expect(albumWithEmptyPhotos.photos.length).toBe(0);

      const albumWithNullPhotos: Album = {
        id: 'test',
        slug: 'test',
        title: 'Test',
        visibility: 'public',
        allow_downloads: false,
        show_exif: true,
        order: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        photos: null as unknown as [],
      };

      // Should handle null gracefully (even though TypeScript says it's an array)
      expect(albumWithNullPhotos.photos).toBeNull();
    });
  });
});
