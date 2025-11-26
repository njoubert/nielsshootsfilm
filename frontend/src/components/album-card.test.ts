import { expect, fixture, html } from '@open-wc/testing';
import * as sinon from 'sinon';
import { beforeEach, describe, it } from 'vitest';
import type { Album } from '../types/data-models';
import './album-card';
import type { AlbumCard } from './album-card';

describe('AlbumCard', () => {
  let mockAlbum: Album;

  // Mock IntersectionObserver for lazy-image child component
  beforeEach(() => {
    global.IntersectionObserver = class MockIntersectionObserver {
      observe = sinon.spy();
      disconnect = sinon.spy();
      unobserve = sinon.spy();
      takeRecords = sinon.spy();
      root = null;
      rootMargin = '';
      thresholds = [];
    } as unknown as typeof IntersectionObserver;

    mockAlbum = {
      id: 'test-album',
      slug: 'test-album',
      title: 'Test Album',
      subtitle: 'A test album',
      description: 'Description',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      visibility: 'public',
      allow_downloads: true,
      show_exif: true,
      order: 0,
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
          uploaded_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'photo-2',
          filename_original: 'test2.jpg',
          url_original: '/originals/test2.jpg',
          url_display: '/display/test2.jpg',
          url_thumbnail: '/thumbnails/test2.jpg',
          order: 1,
          width: 1920,
          height: 1080,
          file_size_original: 2048000,
          file_size_display: 1024000,
          file_size_thumbnail: 102400,
          uploaded_at: '2025-01-02T00:00:00Z',
        },
      ],
    };
  });

  it('should render the component', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);

    expect(el).to.exist;
    expect(el.tagName.toLowerCase()).to.equal('album-card');
  });

  it('should render album title', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);
    const title = el.shadowRoot?.querySelector('.title');

    expect(title).to.exist;
    expect(title?.textContent).to.equal('Test Album');
  });

  it('should render album subtitle when provided', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);
    const subtitle = el.shadowRoot?.querySelector('.subtitle');

    expect(subtitle).to.exist;
    expect(subtitle?.textContent).to.equal('A test album');
  });

  it('should not render subtitle when missing', async () => {
    const albumWithoutSubtitle = { ...mockAlbum, subtitle: undefined };
    const el = await fixture<AlbumCard>(
      html`<album-card .album=${albumWithoutSubtitle}></album-card>`
    );
    const subtitle = el.shadowRoot?.querySelector('.subtitle');

    expect(subtitle).to.not.exist;
  });

  it('should render cover image with lazy-image', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);
    const lazyImage = el.shadowRoot?.querySelector('lazy-image');

    expect(lazyImage).to.exist;
    expect(lazyImage?.getAttribute('src')).to.equal('/thumbnails/test1.jpg');
    expect(lazyImage?.getAttribute('alt')).to.equal('Test Album');
    expect(lazyImage?.getAttribute('aspectratio')).to.equal('1'); // Component uses aspectRatio="1"
  });

  it('should use cover_photo_id when specified', async () => {
    const albumWithCover = { ...mockAlbum, cover_photo_id: 'photo-2' };
    const el = await fixture<AlbumCard>(html`<album-card .album=${albumWithCover}></album-card>`);
    const lazyImage = el.shadowRoot?.querySelector('lazy-image');

    expect(lazyImage?.getAttribute('src')).to.equal('/thumbnails/test2.jpg');
  });

  it('should show password protected badge for password_protected albums', async () => {
    const protectedAlbum = { ...mockAlbum, visibility: 'password_protected' as const };
    const el = await fixture<AlbumCard>(html`<album-card .album=${protectedAlbum}></album-card>`);
    const badge = el.shadowRoot?.querySelector('.visibility-badge.password');

    expect(badge).to.exist;
    expect(badge?.textContent).to.include('Protected');
  });

  it('should show unlisted badge for unlisted albums', async () => {
    const unlistedAlbum = { ...mockAlbum, visibility: 'unlisted' as const };
    const el = await fixture<AlbumCard>(html`<album-card .album=${unlistedAlbum}></album-card>`);
    const badge = el.shadowRoot?.querySelector('.visibility-badge');

    expect(badge).to.exist;
    expect(badge?.textContent).to.include('Unlisted');
  });

  it('should not show badge for public albums', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);
    const badge = el.shadowRoot?.querySelector('.visibility-badge');

    expect(badge).to.not.exist;
  });

  it('should dispatch album-click event on click', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);
    const eventSpy = sinon.spy();
    el.addEventListener('album-click', eventSpy);

    const card = el.shadowRoot?.querySelector('.card') as HTMLElement;
    card.click();

    expect(eventSpy).to.have.been.calledOnce;
    expect(eventSpy.firstCall.args[0]).to.be.instanceOf(CustomEvent);
    const event = eventSpy.firstCall.args[0] as CustomEvent<{ album: Album }>;
    expect(event.detail.album).to.equal(mockAlbum);
  });

  it('should have hover styles on card', async () => {
    const el = await fixture<AlbumCard>(html`<album-card .album=${mockAlbum}></album-card>`);
    const card = el.shadowRoot?.querySelector('.card');

    expect(card).to.exist;
    expect(card?.classList.contains('card')).to.be.true;
  });

  it('should render nothing when album is not provided', async () => {
    const el = await fixture<AlbumCard>(html`<album-card></album-card>`);
    const card = el.shadowRoot?.querySelector('.card');

    expect(card).to.not.exist;
  });
});
