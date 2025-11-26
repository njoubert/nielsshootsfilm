import { expect, fixture, html } from '@open-wc/testing';
import sinon from 'sinon';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import type { Album } from '../types/data-models';
import * as api from '../utils/api';
import './album-photo-page';
import type { AlbumPhotoPage } from './album-photo-page';

describe('AlbumPhotoPage', () => {
  const mockAlbum: Album = {
    id: 'album-1',
    slug: 'test-album',
    title: 'Test Album',
    subtitle: 'Test Subtitle',
    description: 'Test Description',
    cover_photo_id: 'photo-1',
    visibility: 'public',
    allow_downloads: true,
    show_exif: true,
    order: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    photos: [
      {
        id: 'photo-1',
        filename_original: 'test1.jpg',
        url_original: '/originals/test1.jpg',
        url_display: '/display/test1.jpg',
        url_thumbnail: '/thumbnails/test1.jpg',
        caption: 'Test photo 1',
        alt_text: 'First test image',
        order: 0,
        width: 1920,
        height: 1080,
        file_size_original: 2048000,
        file_size_display: 1024000,
        file_size_thumbnail: 102400,
        uploaded_at: '2025-01-01T00:00:00Z',
        exif: {
          camera: 'Canon EOS R5',
          lens: 'RF 24-70mm f/2.8',
          iso: 400,
          aperture: 'f/2.8',
          shutter_speed: '1/125',
          focal_length: '50mm',
        },
      },
      {
        id: 'photo-2',
        filename_original: 'test2.jpg',
        url_original: '/originals/test2.jpg',
        url_display: '/display/test2.jpg',
        url_thumbnail: '/thumbnails/test2.jpg',
        caption: 'Test photo 2',
        alt_text: 'Second test image',
        order: 1,
        width: 1080,
        height: 1920,
        file_size_original: 2048000,
        file_size_display: 1024000,
        file_size_thumbnail: 102400,
        uploaded_at: '2025-01-02T00:00:00Z',
      },
      {
        id: 'photo-3',
        filename_original: 'test3.jpg',
        url_original: '/originals/test3.jpg',
        url_display: '/display/test3.jpg',
        url_thumbnail: '/thumbnails/test3.jpg',
        caption: 'Test photo 3',
        order: 2,
        width: 1920,
        height: 1280,
        file_size_original: 2048000,
        file_size_display: 1024000,
        file_size_thumbnail: 102400,
        uploaded_at: '2025-01-03T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetchAlbumBySlug
    vi.spyOn(api, 'fetchAlbumBySlug').mockResolvedValue(mockAlbum);
  });

  describe('Rendering', () => {
    it('should render the component', async () => {
      const el = await fixture<AlbumPhotoPage>(html`<album-photo-page></album-photo-page>`);
      expect(el).to.exist;
      expect(el.tagName.toLowerCase()).to.equal('album-photo-page');
    });

    it('should show loading state initially', async () => {
      // Don't await fixture to check initial loading state
      const el = document.createElement('album-photo-page');
      el.setAttribute('albumSlug', 'test-album');
      el.setAttribute('photoId', 'photo-1');
      document.body.appendChild(el);

      await el.updateComplete;

      // Component should show loading indicator or no content initially
      const loading = el.shadowRoot?.querySelector('.loading');
      const photoLoading = el.shadowRoot?.querySelector('.photo-loading');

      // Either loading state or no loaded photo initially
      const hasLoadingState =
        loading !== null ||
        photoLoading !== null ||
        el.shadowRoot?.querySelector('.toolbar') === null;
      expect(hasLoadingState).to.be.true;

      document.body.removeChild(el);
    });

    it('should load and display photo after data loads', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      // Wait for async data loading
      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      // Should show toolbar
      const toolbar = el.shadowRoot?.querySelector('.toolbar');
      expect(toolbar).to.exist;

      // Should show photo counter
      const counter = el.shadowRoot?.querySelector('.photo-counter');
      expect(counter?.textContent).to.include('1');
      expect(counter?.textContent).to.include('3');
    });

    it('should show error when album not found', async () => {
      vi.spyOn(api, 'fetchAlbumBySlug').mockResolvedValue(null);

      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="invalid" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const error = el.shadowRoot?.querySelector('.error');
      expect(error).to.exist;
      expect(error?.textContent).to.include('Album not found');
    });

    it('should show error when photo not found in album', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="invalid-photo"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const error = el.shadowRoot?.querySelector('.error');
      expect(error).to.exist;
      expect(error?.textContent).to.include('Photo not found');
    });
  });

  describe('Navigation', () => {
    it('should render prev and next buttons', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-2"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const prevButton = el.shadowRoot?.querySelector('.nav-button.prev');
      const nextButton = el.shadowRoot?.querySelector('.nav-button.next');

      expect(prevButton).to.exist;
      expect(nextButton).to.exist;
    });

    it('should navigate to next photo on next button click', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const pushStateSpy = sinon.spy(window.history, 'pushState');
      const nextButton = el.shadowRoot?.querySelector('.nav-button.next') as HTMLButtonElement;
      nextButton.click();

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-2');

      pushStateSpy.restore();
    });

    it('should navigate to previous photo on prev button click', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-2"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const pushStateSpy = sinon.spy(window.history, 'pushState');
      const prevButton = el.shadowRoot?.querySelector('.nav-button.prev') as HTMLButtonElement;
      prevButton.click();

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-1');

      pushStateSpy.restore();
    });

    it('should wrap to first photo when navigating next from last', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-3"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const pushStateSpy = sinon.spy(window.history, 'pushState');
      const nextButton = el.shadowRoot?.querySelector('.nav-button.next') as HTMLButtonElement;
      nextButton.click();

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-1');

      pushStateSpy.restore();
    });

    it('should wrap to last photo when navigating prev from first', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const pushStateSpy = sinon.spy(window.history, 'pushState');
      const prevButton = el.shadowRoot?.querySelector('.nav-button.prev') as HTMLButtonElement;
      prevButton.click();

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-3');

      pushStateSpy.restore();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next photo on ArrowRight', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const pushStateSpy = sinon.spy(window.history, 'pushState');
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      document.dispatchEvent(event);

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-2');

      pushStateSpy.restore();
    });

    it('should navigate to previous photo on ArrowLeft', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-2"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const pushStateSpy = sinon.spy(window.history, 'pushState');
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      document.dispatchEvent(event);

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-1');

      pushStateSpy.restore();
    });
  });

  describe('Touch Swipe Navigation', () => {
    let pushStateSpy: sinon.SinonSpy;

    beforeEach(() => {
      pushStateSpy = sinon.spy(window.history, 'pushState');
    });

    afterEach(() => {
      pushStateSpy.restore();
    });

    it('should navigate to next photo on swipe left', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const container = el.shadowRoot?.querySelector('.photo-container');
      expect(container).to.exist;

      // Simulate swipe left (touch start on right, move left, release)
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 300, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 100, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchEnd);

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-2');
    });

    it('should navigate to previous photo on swipe right', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-2"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const container = el.shadowRoot?.querySelector('.photo-container');
      expect(container).to.exist;

      // Simulate swipe right (touch start on left, move right, release)
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 100, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 200, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 300, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchEnd);

      await el.updateComplete;

      expect(pushStateSpy).to.have.been.calledOnce;
      expect(pushStateSpy.firstCall.args[2]).to.include('/albums/test-album/photo/photo-1');
    });

    it('should not navigate on vertical swipe', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const container = el.shadowRoot?.querySelector('.photo-container');
      expect(container).to.exist;

      // Simulate vertical swipe (more Y movement than X)
      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 200, clientY: 100 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchStart);

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 190, clientY: 200 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchMove);

      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 190, clientY: 300 } as Touch],
        bubbles: true,
        cancelable: true,
      });
      container?.dispatchEvent(touchEnd);

      await el.updateComplete;

      expect(pushStateSpy).to.not.have.been.called;
    });
  });

  describe('Toolbar', () => {
    it('should render toolbar with all buttons', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const toolbar = el.shadowRoot?.querySelector('.toolbar');
      const buttons = toolbar?.querySelectorAll('.toolbar-button');
      const closeButton = toolbar?.querySelector('.close-button');

      expect(toolbar).to.exist;
      expect(buttons?.length).to.equal(3); // Download, Share, Copy Link
      expect(closeButton).to.exist;
    });

    it('should trigger download on download button click', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const createElementSpy = sinon.spy(document, 'createElement');
      const buttons = el.shadowRoot?.querySelectorAll('.toolbar-button');
      const downloadButton = buttons?.[0] as HTMLButtonElement;
      downloadButton.click();

      expect(createElementSpy).to.have.been.calledWith('a');

      createElementSpy.restore();
    });
  });

  describe('Loading State', () => {
    it('should show loading screen after grace period when photo is slow to load', async () => {
      // Mock slow XHR that doesn't complete
      const originalXHR = global.XMLHttpRequest;
      const slowXHR = vi.fn(() => ({
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        responseType: '',
        abort: vi.fn(),
      }));
      // @ts-expect-error - Mocking XMLHttpRequest for tests
      global.XMLHttpRequest = slowXHR;

      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      // Wait for initial load
      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      // Loading screen should NOT be visible yet (grace period)
      let photoLoading = el.shadowRoot?.querySelector('.photo-loading');
      expect(photoLoading).to.not.exist;

      // Wait for grace period (200ms) to pass
      await new Promise((resolve) => setTimeout(resolve, 250));
      await el.updateComplete;

      // Now loading screen SHOULD be visible
      photoLoading = el.shadowRoot?.querySelector('.photo-loading');
      expect(photoLoading).to.exist;

      const loadingText = el.shadowRoot?.querySelector('.photo-loading-text');
      expect(loadingText?.textContent).to.include('Loading photo');

      // Restore original XHR
      global.XMLHttpRequest = originalXHR;
    });

    it('should show progress bar with percentage during slow load', async () => {
      // Mock slow XHR that doesn't complete
      const originalXHR = global.XMLHttpRequest;
      const slowXHR = vi.fn(() => ({
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        responseType: '',
        abort: vi.fn(),
      }));
      // @ts-expect-error - Mocking XMLHttpRequest for tests
      global.XMLHttpRequest = slowXHR;

      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      // Wait for initial load + grace period
      await new Promise((resolve) => setTimeout(resolve, 350));
      await el.updateComplete;

      const progressBar = el.shadowRoot?.querySelector('.progress-bar');
      const progressPercentage = el.shadowRoot?.querySelector('.progress-percentage');

      expect(progressBar).to.exist;
      expect(progressPercentage).to.exist;
      expect(progressPercentage?.textContent).to.include('%');

      // Restore original XHR
      global.XMLHttpRequest = originalXHR;
    });
  });

  describe('Photo Display', () => {
    it('should display photo counter with current position', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-2"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const counter = el.shadowRoot?.querySelector('.photo-counter');
      expect(counter?.textContent).to.include('2 / 3');
    });

    it('should update photo counter when navigating', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const nextButton = el.shadowRoot?.querySelector('.nav-button.next') as HTMLButtonElement;
      nextButton.click();

      await el.updateComplete;

      const counter = el.shadowRoot?.querySelector('.photo-counter');
      expect(counter?.textContent).to.include('2 / 3');
    });
  });

  describe('Body Scroll and Zoom Management', () => {
    it('should disable body scroll on connect', async () => {
      await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      expect(document.body.style.overflow).to.equal('hidden');
    });

    it('should restore body scroll on disconnect', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      expect(document.body.style.overflow).to.equal('hidden');

      el.disconnectedCallback();

      expect(document.body.style.overflow).to.equal('');
    });
  });

  describe('Error Handling', () => {
    it('should show error when API call fails', async () => {
      vi.spyOn(api, 'fetchAlbumBySlug').mockRejectedValue(new Error('Network error'));

      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      await el.updateComplete;

      const error = el.shadowRoot?.querySelector('.error');
      expect(error).to.exist;
      expect(error?.textContent).to.include('Failed to load album');
    });
  });

  describe('Cleanup', () => {
    it('should remove keyboard listener on disconnect', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      const removeEventListenerSpy = sinon.spy(document, 'removeEventListener');

      el.disconnectedCallback();

      expect(removeEventListenerSpy).to.have.been.called;

      removeEventListenerSpy.restore();
    });

    it('should clean up body styles on disconnect', async () => {
      const el = await fixture<AlbumPhotoPage>(
        html`<album-photo-page albumSlug="test-album" photoId="photo-1"></album-photo-page>`
      );

      expect(document.body.style.overflow).to.equal('hidden');

      el.disconnectedCallback();

      expect(document.body.style.overflow).to.equal('');
    });
  });
});
