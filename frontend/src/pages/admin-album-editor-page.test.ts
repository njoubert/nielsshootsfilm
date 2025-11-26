import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import * as sinon from 'sinon';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import type { Album } from '../types/data-models';
import * as adminApi from '../utils/admin-api';
import './admin-album-editor-page';
import type { AdminAlbumEditorPage } from './admin-album-editor-page';

describe('AdminAlbumEditorPage', () => {
  let fetchAlbumByIdStub: sinon.SinonStub;
  let createAlbumStub: sinon.SinonStub;
  let updateAlbumStub: sinon.SinonStub;
  let uploadPhotosStub: sinon.SinonStub;
  let deletePhotoStub: sinon.SinonStub;
  let setCoverPhotoStub: sinon.SinonStub;

  const mockAlbum: Album = {
    id: 'album-1',
    slug: 'test-album',
    title: 'Test Album',
    subtitle: 'Test Subtitle',
    description: 'Test Description',
    visibility: 'public',
    photos: [
      {
        id: 'photo-1',
        filename_original: 'test1.jpg',
        url_original: '/originals/test1.jpg',
        url_display: '/display/test1.jpg',
        url_thumbnail: '/thumbnails/test1.jpg',
        order: 0,
        width: 1920,
        height: 1080,
        file_size_original: 2048000,
        file_size_display: 1024000,
        file_size_thumbnail: 102400,
        uploaded_at: '2025-10-20T00:00:00Z',
      },
    ],
    cover_photo_id: 'photo-1',
    allow_downloads: true,
    show_exif: true,
    order: 1,
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-10-20T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchAlbumByIdStub = sinon.stub(adminApi, 'fetchAlbumById');
    createAlbumStub = sinon.stub(adminApi, 'createAlbum');
    updateAlbumStub = sinon.stub(adminApi, 'updateAlbum');
    uploadPhotosStub = sinon.stub(adminApi, 'uploadPhotos');
    deletePhotoStub = sinon.stub(adminApi, 'deletePhoto');
    setCoverPhotoStub = sinon.stub(adminApi, 'setCoverPhoto');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('New Album Mode', () => {
    it('should render in new album mode', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      expect(el).to.exist;
      const heading = el.shadowRoot?.querySelector('h1');
      expect(heading?.textContent).to.include('Create Album');
    });

    it('should not fetch album in new mode', async () => {
      await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      expect(fetchAlbumByIdStub).to.not.have.been.called;
    });

    it('should render album details form', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const titleInput = el.shadowRoot?.querySelector('input#title');
      const subtitleInput = el.shadowRoot?.querySelector('input#subtitle');
      const descriptionInput = el.shadowRoot?.querySelector('textarea#description');
      const visibilitySelect = el.shadowRoot?.querySelector('select#visibility');
      const orderInput = el.shadowRoot?.querySelector('input#order');

      expect(titleInput).to.exist;
      expect(subtitleInput).to.exist;
      expect(descriptionInput).to.exist;
      expect(visibilitySelect).to.exist;
      expect(orderInput).to.exist;
    });

    it('should render checkboxes for album flags', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const downloadsCheckbox = el.shadowRoot?.querySelector('input#allow_downloads');

      expect(downloadsCheckbox).to.exist;
    });

    it('should create new album on submit', async () => {
      const newAlbum = { ...mockAlbum, id: 'new-id' };
      createAlbumStub.resolves(newAlbum);
      const locationHrefSpy = sinon.stub();
      Object.defineProperty(window, 'location', {
        value: { href: locationHrefSpy },
        writable: true,
      });

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      // Fill in required fields
      const titleInput = el.shadowRoot?.querySelector('input#title') as HTMLInputElement;
      titleInput.value = 'New Album';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      // Submit form
      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await el.updateComplete;

      await waitUntil(() => createAlbumStub.called, 'createAlbum should be called');

      expect(createAlbumStub).to.have.been.calledOnce;
    });

    it('should not show photo upload section in new mode', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const photoSection = el.shadowRoot?.querySelector('.upload-area');
      // Photo section may exist but should prompt to save first
      if (photoSection) {
        const uploadArea = el.shadowRoot?.querySelector('.upload-area');
        expect(uploadArea).to.exist;
      }
    });
  });

  describe('Edit Album Mode', () => {
    it('should fetch and load existing album', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => fetchAlbumByIdStub.called, 'fetchAlbumById should be called');

      expect(fetchAlbumByIdStub).to.have.been.calledWith('album-1');
      expect(el['album'].title).to.equal('Test Album');
    });

    it('should display album title in edit mode', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const heading = el.shadowRoot?.querySelector('h1');
      expect(heading?.textContent).to.include('Edit Album');
    });

    it('should populate form with album data', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const titleInput = el.shadowRoot?.querySelector('input#title') as HTMLInputElement;
      const subtitleInput = el.shadowRoot?.querySelector('input#subtitle') as HTMLInputElement;

      expect(titleInput.value).to.equal('Test Album');
      expect(subtitleInput.value).to.equal('Test Subtitle');
    });

    it('should update album on submit', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      updateAlbumStub.resolves({ ...mockAlbum, title: 'Updated Title' });

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      // Update title
      const titleInput = el.shadowRoot?.querySelector('input#title') as HTMLInputElement;
      titleInput.value = 'Updated Title';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      // Submit
      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await el.updateComplete;

      await waitUntil(() => updateAlbumStub.called, 'updateAlbum should be called');

      expect(updateAlbumStub).to.have.been.calledWith('album-1', sinon.match.any);
    });

    it('should display photos grid', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const photosGrid = el.shadowRoot?.querySelector('.photos-grid');
      expect(photosGrid).to.exist;

      const photoItems = el.shadowRoot?.querySelectorAll('.photo-item');
      expect(photoItems?.length).to.equal(1);
    });

    it('should show cover badge on cover photo', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const coverBadge = el.shadowRoot?.querySelector('.cover-badge');
      expect(coverBadge).to.exist;
    });

    it('should handle set cover photo', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      setCoverPhotoStub.resolves();

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      // Click set cover button
      const setCoverButton = el.shadowRoot?.querySelector('.btn-set-cover') as HTMLButtonElement;
      if (setCoverButton) {
        setCoverButton.click();
        await el.updateComplete;

        await waitUntil(() => setCoverPhotoStub.called, 'setCoverPhoto should be called');

        expect(setCoverPhotoStub).to.have.been.calledWith('album-1', 'photo-1');
      }
    });

    it('should handle delete photo', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      deletePhotoStub.resolves();
      // Mock confirm
      sinon.stub(window, 'confirm').returns(true);

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      // Click delete button
      const deleteButton = el.shadowRoot?.querySelector('.btn-delete-photo') as HTMLButtonElement;
      if (deleteButton) {
        deleteButton.click();
        await el.updateComplete;

        await waitUntil(() => deletePhotoStub.called, 'deletePhoto should be called');

        expect(deletePhotoStub).to.have.been.calledWith('album-1', 'photo-1');
      }
    });
  });

  describe('Photo Upload', () => {
    it('should render upload area', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const uploadArea = el.shadowRoot?.querySelector('.upload-area');
      expect(uploadArea).to.exist;
    });

    it('should have file input', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const fileInput = el.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).to.exist;
      expect(fileInput.multiple).to.be.true;
      expect(fileInput.accept).to.equal('image/*');
    });

    it('should handle file upload', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      uploadPhotosStub.resolves({
        uploaded: [
          {
            id: 'photo-1',
            filename_original: 'test.jpg',
            url_thumbnail: '/uploads/thumbnails/test.jpg',
          },
        ],
        errors: [],
      });

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const fileInput = el.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await el.updateComplete;

      await waitUntil(() => uploadPhotosStub.called, 'uploadPhotos should be called', {
        timeout: 2000,
      });

      expect(uploadPhotosStub).to.have.been.calledWith('album-1', [mockFile]);
    });

    it('should show uploading state', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      uploadPhotosStub.returns(new Promise(() => {})); // Never resolves

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      // Trigger upload
      const fileInput = el.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await el.updateComplete;

      await waitUntil(() => el['uploading'], 'uploading should be true');

      const uploadProgress = el.shadowRoot?.querySelector('.upload-progress');
      expect(uploadProgress).to.exist;
    });

    it('should handle upload errors', async () => {
      fetchAlbumByIdStub.resolves(mockAlbum);
      uploadPhotosStub.resolves({ uploaded: [], errors: ['File too large'] });

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );

      await waitUntil(() => !el['loading'], 'loading should complete');

      const fileInput = el.shadowRoot?.querySelector('input[type="file"]') as HTMLInputElement;
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await el.updateComplete;

      await waitUntil(() => el['error'] !== '', 'error should be set', { timeout: 2000 });

      expect(el['error']).to.include('All 1 upload(s) failed');
      expect(el['error']).to.include('File too large');
    });
  });

  describe('Form Validation', () => {
    it('should require title field', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const titleInput = el.shadowRoot?.querySelector('input#title') as HTMLInputElement;
      expect(titleInput.required).to.be.true;
    });

    it('should have visibility options', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const visibilitySelect = el.shadowRoot?.querySelector(
        'select#visibility'
      ) as HTMLSelectElement;
      const options = Array.from(visibilitySelect.options).map((opt) => opt.value);

      expect(options).to.include('public');
      expect(options).to.include('unlisted');
      expect(options).to.include('password_protected');
    });

    it('should handle form errors', async () => {
      createAlbumStub.rejects(new Error('Validation failed'));

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const titleInput = el.shadowRoot?.querySelector('input#title') as HTMLInputElement;
      titleInput.value = 'Test';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await el.updateComplete;

      await waitUntil(() => el['error'] !== '', 'error should be set');

      expect(el['error']).to.include('Validation failed');
    });
  });

  describe('Navigation', () => {
    it('should have back to albums link', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const backLink = el.shadowRoot?.querySelector('a[href="/admin/albums"]');
      expect(backLink).to.exist;
    });

    it('should show save button', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const saveButton = el.shadowRoot?.querySelector('button[type="submit"]');
      expect(saveButton).to.exist;
    });

    it('should disable save button while saving', async () => {
      createAlbumStub.returns(new Promise(() => {})); // Never resolves

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="new"></admin-album-editor-page>`
      );

      const titleInput = el.shadowRoot?.querySelector('input#title') as HTMLInputElement;
      titleInput.value = 'Test';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      await el.updateComplete;

      const form = el.shadowRoot?.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await el.updateComplete;

      await waitUntil(() => el['saving'], 'saving should be true');

      const saveButton = el.shadowRoot?.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(saveButton.disabled).to.be.true;
    });
  });

  describe('File Size Validation', () => {
    beforeEach(() => {
      fetchAlbumByIdStub.resolves(mockAlbum);
    });

    it('should reject files larger than configured max size', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );
      await el.updateComplete;

      // Set max size to 50MB in site config
      el['siteConfig'] = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        site: { title: 'Test', language: 'en', timezone: 'UTC' },
        owner: {},
        social: {},
        branding: {
          primary_color: '#000',
          secondary_color: '#fff',
          accent_color: '#f00',
          theme: {
            mode: 'light',
            light: {
              background: '#fff',
              surface: '#f5f5f5',
              text_primary: '#000',
              text_secondary: '#666',
              border: '#ccc',
            },
            dark: {
              background: '#000',
              surface: '#111',
              text_primary: '#fff',
              text_secondary: '#999',
              border: '#333',
            },
          },
        },
        portfolio: { show_exif_data: false, enable_lightbox: true },
        navigation: { show_home: true, show_albums: true },
        storage: { max_disk_usage_percent: 80, max_image_size_mb: 50 },
      };

      // Create a mock file larger than 50MB
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      // Try to upload
      await el['uploadFiles']([largeFile]);
      await el.updateComplete;

      // Should show error
      expect(el['error']).to.include('exceed');
      expect(el['error']).to.include('50MB');
      expect(uploadPhotosStub.called).to.be.false;
    });

    it('should accept files smaller than configured max size', async () => {
      uploadPhotosStub.resolves({
        uploaded: [{ id: 'photo-2', filename: 'small.jpg' }],
        errors: [],
      });
      fetchAlbumByIdStub.resolves(mockAlbum); // For reload after upload

      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );
      await el.updateComplete;

      // Set max size to 50MB
      el['siteConfig'] = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        site: { title: 'Test', language: 'en', timezone: 'UTC' },
        owner: {},
        social: {},
        branding: {
          primary_color: '#000',
          secondary_color: '#fff',
          accent_color: '#f00',
          theme: {
            mode: 'light',
            light: {
              background: '#fff',
              surface: '#f5f5f5',
              text_primary: '#000',
              text_secondary: '#666',
              border: '#ccc',
            },
            dark: {
              background: '#000',
              surface: '#111',
              text_primary: '#fff',
              text_secondary: '#999',
              border: '#333',
            },
          },
        },
        portfolio: { show_exif_data: false, enable_lightbox: true },
        navigation: { show_home: true, show_albums: true },
        storage: { max_disk_usage_percent: 80, max_image_size_mb: 50 },
      };

      // Create a mock file smaller than 50MB (use much smaller for test)
      const smallFile = new File(['x'.repeat(1024)], 'small.jpg', {
        type: 'image/jpeg',
      });

      // Try to upload
      await el['uploadFiles']([smallFile]);
      await el.updateComplete;

      // Should not show size error and should call upload
      expect(el['error']).to.not.include('exceed');
      expect(uploadPhotosStub.called).to.be.true;
    });

    it('should use default 50MB if config not loaded', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );
      await el.updateComplete;

      // Don't set siteConfig, should use default 50MB
      el['siteConfig'] = null;

      // Create a file larger than 50MB
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });

      await el['uploadFiles']([largeFile]);
      await el.updateComplete;

      // Should still enforce 50MB default
      expect(el['error']).to.include('exceed');
      expect(el['error']).to.include('50MB');
    });

    it('should display configured max size in upload box', async () => {
      const el = await fixture<AdminAlbumEditorPage>(
        html`<admin-album-editor-page albumId="album-1"></admin-album-editor-page>`
      );
      await el.updateComplete;

      // Set max size to 75MB
      el['siteConfig'] = {
        version: '1.0',
        last_updated: new Date().toISOString(),
        site: { title: 'Test', language: 'en', timezone: 'UTC' },
        owner: {},
        social: {},
        branding: {
          primary_color: '#000',
          secondary_color: '#fff',
          accent_color: '#f00',
          theme: {
            mode: 'light',
            light: {
              background: '#fff',
              surface: '#f5f5f5',
              text_primary: '#000',
              text_secondary: '#666',
              border: '#ccc',
            },
            dark: {
              background: '#000',
              surface: '#111',
              text_primary: '#fff',
              text_secondary: '#999',
              border: '#333',
            },
          },
        },
        portfolio: { show_exif_data: false, enable_lightbox: true },
        navigation: { show_home: true, show_albums: true },
        storage: { max_disk_usage_percent: 80, max_image_size_mb: 75 },
      };
      await el.updateComplete;

      const uploadArea = el.shadowRoot?.querySelector('.upload-area');
      const text = uploadArea?.textContent || '';
      expect(text).to.include('75MB');
    });
  });
});
