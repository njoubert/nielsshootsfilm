import { expect, fixture, html, waitUntil } from '@open-wc/testing';
import * as sinon from 'sinon';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import type { Album } from '../types/data-models';
import * as adminApi from '../utils/admin-api';
import './admin-albums-page';
import type { AdminAlbumsPage } from './admin-albums-page';

describe('AdminAlbumsPage', () => {
  let fetchAllAlbumsStub: sinon.SinonStub;
  let deleteAlbumStub: sinon.SinonStub;
  let logoutStub: sinon.SinonStub;

  const mockAlbums: Album[] = [
    {
      id: 'album-1',
      slug: 'album-1',
      title: 'Test Album 1',
      subtitle: 'Subtitle 1',
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
      allow_downloads: true,
      show_exif: true,
      order: 1,
      created_at: '2025-10-20T00:00:00Z',
      updated_at: '2025-10-20T00:00:00Z',
    },
    {
      id: 'album-2',
      slug: 'album-2',
      title: 'Test Album 2',
      visibility: 'unlisted',
      photos: [],
      allow_downloads: true,
      show_exif: true,
      order: 2,
      created_at: '2025-10-20T00:00:00Z',
      updated_at: '2025-10-20T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    fetchAllAlbumsStub = sinon.stub(adminApi, 'fetchAllAlbums');
    deleteAlbumStub = sinon.stub(adminApi, 'deleteAlbum');
    logoutStub = sinon.stub(adminApi, 'logout');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should render the component', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    expect(el).to.exist;
    expect(el.tagName.toLowerCase()).to.equal('admin-albums-page');
  });

  it('should load albums on connect', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => fetchAllAlbumsStub.called, 'fetchAllAlbums should be called');

    expect(fetchAllAlbumsStub).to.have.been.calledOnce;
    expect(el['albums']).to.have.lengthOf(2);
  });

  it('should display loading state', async () => {
    fetchAllAlbumsStub.returns(new Promise(() => {})); // Never resolves

    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    const loading = el.shadowRoot?.querySelector('.loading');
    expect(loading).to.exist;
  });

  it('should display albums grid', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const albumCards = el.shadowRoot?.querySelectorAll('.album-card');
    expect(albumCards).to.have.lengthOf(2);
  });

  it('should display album titles', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const titles = Array.from(el.shadowRoot?.querySelectorAll('.album-title') || []).map(
      (t) => t.textContent
    );
    expect(titles).to.include('Test Album 1');
    expect(titles).to.include('Test Album 2');
  });

  it('should display photo counts', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const photoCounts = el.shadowRoot?.querySelectorAll('.photo-count');
    expect(photoCounts).to.exist;
  });

  it('should display visibility badges', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const badges = el.shadowRoot?.querySelectorAll('.visibility-badge');
    // Should have at least one badge for unlisted album
    expect(badges?.length).to.be.greaterThan(0);
  });

  it('should show empty state when no albums', async () => {
    fetchAllAlbumsStub.resolves([]);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const emptyState = el.shadowRoot?.querySelector('.empty-state');
    expect(emptyState).to.exist;
  });

  it('should display error message on fetch failure', async () => {
    fetchAllAlbumsStub.rejects(new Error('Failed to load'));
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => el['error'] !== '', 'error should be set');

    const errorMessage = el.shadowRoot?.querySelector('.error');
    expect(errorMessage).to.exist;
    expect(errorMessage?.textContent).to.include('Failed to load');
  });

  it('should show delete confirmation modal', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    // Click delete button
    const deleteButton = el.shadowRoot?.querySelector('.btn-delete') as HTMLButtonElement;
    deleteButton?.click();
    await el.updateComplete;

    const modal = el.shadowRoot?.querySelector('.modal');
    expect(modal).to.exist;
  });

  it('should close delete modal on cancel', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    // Show modal
    const deleteButton = el.shadowRoot?.querySelector('.btn-delete') as HTMLButtonElement;
    deleteButton?.click();
    await el.updateComplete;

    // Cancel
    const cancelButton = el.shadowRoot?.querySelector('.btn-secondary') as HTMLButtonElement;
    cancelButton?.click();
    await el.updateComplete;

    const modal = el.shadowRoot?.querySelector('.modal');
    expect(modal).to.not.exist;
  });

  it('should delete album on confirmation', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    deleteAlbumStub.resolves();
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    // Show modal
    const deleteButton = el.shadowRoot?.querySelector('.btn-delete') as HTMLButtonElement;
    deleteButton?.click();
    await el.updateComplete;

    // Confirm delete
    fetchAllAlbumsStub.resolves([mockAlbums[1]]); // Return one less album
    const confirmButton = el.shadowRoot?.querySelector('.btn-danger') as HTMLButtonElement;
    confirmButton?.click();
    await el.updateComplete;

    await waitUntil(() => deleteAlbumStub.called, 'deleteAlbum should be called');

    expect(deleteAlbumStub).to.have.been.calledWith('album-1');
  });

  it('should handle delete error', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    deleteAlbumStub.rejects(new Error('Delete failed'));
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    // Show modal and confirm
    const deleteButton = el.shadowRoot?.querySelector('.btn-delete') as HTMLButtonElement;
    deleteButton?.click();
    await el.updateComplete;

    const confirmButton = el.shadowRoot?.querySelector('.btn-danger') as HTMLButtonElement;
    confirmButton?.click();
    await el.updateComplete;

    await waitUntil(() => el['error'] !== '', 'error should be set');

    expect(el['error']).to.include('Delete failed');
  });

  it('should handle logout', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    logoutStub.resolves();
    const locationHrefSpy = sinon.stub();
    Object.defineProperty(window, 'location', {
      value: { href: locationHrefSpy },
      writable: true,
    });

    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const logoutButton = el.shadowRoot?.querySelector('.btn-secondary') as HTMLButtonElement;
    logoutButton?.click();
    await el.updateComplete;

    await waitUntil(() => logoutStub.called, 'logout should be called');

    expect(logoutStub).to.have.been.calledOnce;
  });

  it('should sort albums by order', async () => {
    const unsortedAlbums = [mockAlbums[1], mockAlbums[0]];
    fetchAllAlbumsStub.resolves(unsortedAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    expect(el['albums'][0].order).to.equal(1);
    expect(el['albums'][1].order).to.equal(2);
  });

  it('should have New Album button', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const newButton = el.shadowRoot?.querySelector('a[href="/admin/albums/new"]');
    expect(newButton).to.exist;
  });

  it('should have edit links for each album', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const editLinks = el.shadowRoot?.querySelectorAll('a[href^="/admin/albums/"][href$="/edit"]');
    expect(editLinks?.length).to.equal(2);
  });

  it('should have view links for each album', async () => {
    fetchAllAlbumsStub.resolves(mockAlbums);
    const el = await fixture<AdminAlbumsPage>(html`<admin-albums-page></admin-albums-page>`);

    await waitUntil(() => !el['loading'], 'loading should complete');

    const viewLinks = el.shadowRoot?.querySelectorAll('a[href^="/albums/"]');
    expect(viewLinks?.length).to.be.greaterThan(0);
  });

  describe('getCoverThumbnail method', () => {
    it('should return null for album with empty photos array', () => {
      fetchAllAlbumsStub.resolves([]);
      const el = document.createElement('admin-albums-page');

      const albumWithNoPhotos: Album = {
        id: 'album-empty',
        slug: 'album-empty',
        title: 'Empty Album',
        visibility: 'public',
        photos: [],
        allow_downloads: true,
        show_exif: true,
        order: 1,
        created_at: '2025-10-20T00:00:00Z',
        updated_at: '2025-10-20T00:00:00Z',
      };

      // Should return null without crashing
      const result = el['getCoverThumbnail'](albumWithNoPhotos);
      expect(result).to.be.null;
    });

    it('should return null for album with null photos array', () => {
      fetchAllAlbumsStub.resolves([]);
      const el = document.createElement('admin-albums-page');

      const albumWithNullPhotos: Album = {
        id: 'album-null',
        slug: 'album-null',
        title: 'Null Photos Album',
        visibility: 'public',
        photos: null as unknown as [],
        allow_downloads: true,
        show_exif: true,
        order: 1,
        created_at: '2025-10-20T00:00:00Z',
        updated_at: '2025-10-20T00:00:00Z',
      };

      // Should return null without crashing
      const result = el['getCoverThumbnail'](albumWithNullPhotos);
      expect(result).to.be.null;
    });

    it('should return null for album with cover_photo_id but no photos', () => {
      fetchAllAlbumsStub.resolves([]);
      const el = document.createElement('admin-albums-page');

      const albumWithInvalidCover: Album = {
        id: 'album-invalid-cover',
        slug: 'album-invalid-cover',
        title: 'Invalid Cover Album',
        visibility: 'public',
        cover_photo_id: 'nonexistent-photo',
        photos: [],
        allow_downloads: true,
        show_exif: true,
        order: 1,
        created_at: '2025-10-20T00:00:00Z',
        updated_at: '2025-10-20T00:00:00Z',
      };

      // Should return null without crashing (even with cover_photo_id set)
      const result = el['getCoverThumbnail'](albumWithInvalidCover);
      expect(result).to.be.null;
    });

    it('should return thumbnail for album with photos', () => {
      fetchAllAlbumsStub.resolves([]);
      const el = document.createElement('admin-albums-page');

      const albumWithPhotos: Album = {
        id: 'album-photos',
        slug: 'album-photos',
        title: 'Album with Photos',
        visibility: 'public',
        photos: [
          {
            id: 'photo-1',
            filename_original: 'test.jpg',
            url_original: '/originals/test.jpg',
            url_display: '/display/test.jpg',
            url_thumbnail: '/thumbnails/test.jpg',
            order: 0,
            width: 1920,
            height: 1080,
            file_size_original: 1000,
            file_size_display: 500,
            file_size_thumbnail: 100,
            uploaded_at: '2025-10-20T00:00:00Z',
          },
        ],
        allow_downloads: true,
        show_exif: true,
        order: 1,
        created_at: '2025-10-20T00:00:00Z',
        updated_at: '2025-10-20T00:00:00Z',
      };

      // Should return the first photo's thumbnail
      const result = el['getCoverThumbnail'](albumWithPhotos);
      expect(result).to.equal('/thumbnails/test.jpg');
    });
  });
});
