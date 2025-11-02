/**
 * Admin album editor page - create or edit an album.
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/admin-header';
import '../components/toast-notification';
import '../components/upload-placeholder';
import type { Album, Photo, SiteConfig } from '../types/data-models';
import {
  createAlbum,
  deleteAlbum,
  deleteAllPhotos,
  deletePhoto,
  fetchAdminSiteConfig,
  fetchAlbumById,
  reorderPhotos,
  setAlbumPassword,
  setCoverPhoto,
  updateAlbum,
  uploadPhotos,
  type UploadProgress,
} from '../utils/admin-api';
import { onLogout } from '../utils/auth-state';
import { CONCURRENT_UPLOAD_COUNT, MAX_UPLOAD_BATCH_SIZE } from '../utils/constants';
import { navigateTo, navigateToAlbum, routes } from '../utils/navigation';

@customElement('admin-album-editor-page')
export class AdminAlbumEditorPage extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--color-background, #f5f5f5);
      overflow: hidden;
    }

    .page-header {
      background: var(--color-surface, white);
      border-bottom: 1px solid var(--color-border, #ddd);
      padding: 1.5rem 2rem;
      margin-bottom: 0;
      flex-shrink: 0;
    }

    .page-title {
      font-family: 'Raleway', sans-serif;
      margin: 0;
      font-size: 32px;
      font-weight: 600;
      color: var(--color-text-primary, #333);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .btn-primary {
      background: var(--color-primary, #007bff);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--color-primary-hover, #0056b3);
    }

    .btn-secondary {
      background: var(--color-border, #ddd);
      color: var(--color-text-primary, #333);
    }

    .btn-secondary:hover {
      background: var(--color-border, #ccc);
    }

    .btn-danger {
      background: var(--color-danger, #dc3545);
      color: white;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .layout-wrapper {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .sidebar {
      width: 450px;
      flex-shrink: 0;
      background: var(--color-surface, white);
      border-right: 1px solid var(--color-border, #ddd);
      padding: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .main-content {
      flex: 1;
      min-width: 0;
      padding: 0;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--color-background, #f5f5f5);
    }

    /* Responsive sidebar scaling beyond 1600px */
    @media (min-width: 1600px) {
      .sidebar {
        width: calc(450px + (100vw - 1600px) * 0.25);
      }
    }

    /* Mobile and tablet portrait: stack vertically */
    @media (max-width: 1023px) {
      :host {
        overflow: auto;
        height: auto;
      }

      .layout-wrapper {
        flex-direction: column;
        overflow: visible;
        min-height: auto;
      }

      .sidebar {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid var(--color-border, #ddd);
        max-height: none;
        overflow: visible;
      }

      .main-content {
        width: 100%;
        overflow: visible;
      }
    }

    .loading,
    .error {
      text-align: center;
      padding: 3rem 1rem;
    }

    .error {
      color: var(--color-danger, #dc3545);
    }

    .form-section {
      background: transparent;
      border-radius: 0;
      padding: 1.5rem;
      margin-bottom: 0;
      box-shadow: none;
      border-bottom: 1px solid var(--color-border, #ddd);
    }

    .form-section:first-child {
      margin-top: 0;
      padding-top: 1.5rem;
    }

    .form-section:last-child {
      border-bottom: none;
    }

    .sidebar .form-section {
      background: transparent;
    }

    .main-content .form-section {
      background: transparent;
      border-bottom: none;
      padding: 1.5rem;
    }

    .form-section h2 {
      font-family: 'Raleway', sans-serif;
      margin: 0 0 1rem;
      font-size: 1rem;
      color: var(--color-text-primary, #333);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .main-content .form-section h2 {
      color: var(--color-text-primary, #333);
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--color-text-primary, #333);
      font-weight: 500;
      font-size: 0.875rem;
    }

    input,
    textarea,
    select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--color-border, #ddd);
      border-radius: 0;
      font-size: 0.875rem;
      font-family: inherit;
      box-sizing: border-box;
      background: var(--color-surface, white);
      color: var(--color-text-primary, #333);
    }

    textarea {
      min-height: 200px;
      resize: vertical;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox-group input[type='checkbox'] {
      width: auto;
      margin: 0;
      flex-shrink: 0;
    }

    .checkbox-group label {
      margin: 0;
      line-height: 1;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    /* Mobile: stack form rows vertically */
    @media (max-width: 639px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }

    .photo-upload {
      margin-top: 1rem;
    }

    .upload-area {
      border: 2px dashed rgba(255, 255, 255, 0.3);
      border-radius: 0;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.03);
      color: rgba(255, 255, 255, 0.8);
    }

    .upload-area p {
      color: rgba(255, 255, 255, 0.8);
    }

    @media (prefers-color-scheme: light) {
      .upload-area {
        background: var(--color-surface, white);
        border: 2px dashed var(--color-border, #ddd);
        color: var(--color-text-primary, #333);
      }

      .upload-area p {
        color: var(--color-text-primary, #333);
      }
    }

    .upload-area:hover {
      border-color: var(--color-primary, #007bff);
      background: var(--color-background, #f8f9fa);
    }

    .upload-area.dragging {
      border-color: var(--color-primary, #007bff);
      background: var(--color-background, #e7f3ff);
    }

    .upload-area.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: var(--color-danger, #dc3545);
      background: var(--color-danger-bg, #f8d7da);
    }

    .upload-area.disabled:hover {
      border-color: var(--color-danger, #dc3545);
      background: var(--color-danger-bg, #f8d7da);
    }

    .upload-progress {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--color-info-bg, #e7f3ff);
      border-radius: 0;
      color: var(--color-info-text, #004085);
    }

    .upload-summary {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--color-surface, white);
      border: 1px solid var(--color-border, #ddd);
      border-radius: 0;
      display: flex;
      gap: 1.5rem;
      font-size: 0.875rem;
      color: var(--color-text-primary, #333);
    }

    .upload-summary span {
      font-weight: 500;
    }

    .upload-summary .error-count {
      color: var(--color-danger, #dc3545);
    }

    .upload-warning {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: var(--color-danger-bg, #f8d7da);
      border: 1px solid var(--color-danger, #f5c6cb);
      border-radius: 0;
      color: var(--color-danger-text, #721c24);
      font-size: 0.875rem;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    /* Responsive photo grid */
    @media (max-width: 1023px) {
      .photos-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 639px) {
      .photos-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .photo-item {
      position: relative;
      border-radius: 0;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.05);
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.45rem;
      cursor: move;
    }

    @media (prefers-color-scheme: light) {
      .photo-item {
        background: rgba(0, 0, 0, 0.05);
      }
    }

    .photo-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .photo-item.dragging {
      opacity: 0;
    }

    .photo-item.drag-over {
      border: 2px solid var(--color-primary, #007bff);
      box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
      background: rgba(0, 123, 255, 0.05);
    }

    .photo-item img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
    }

    .photo-overlay {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 0.5rem;
    }

    .photo-item:hover .photo-overlay {
      opacity: 1;
    }

    .photo-overlay button {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .cover-badge {
      position: absolute;
      top: 0.5rem;
      left: 0.5rem;
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 0;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `;

  @property({ type: String })
  albumId: string | null = null;

  @state()
  private album: Partial<Album> = {
    title: '',
    subtitle: '',
    description: '',
    visibility: 'public',
    allow_downloads: true,
    order: 0,
    photos: [],
  };

  @state()
  private loading = true;

  @state()
  private saving = false;

  @state()
  private uploading = false;

  @state()
  private error = '';

  @state()
  private success = '';

  @state()
  private dragging = false;

  @state()
  private draggedPhotoId: string | null = null;

  @state()
  private dragOverPhotoId: string | null = null;

  @state()
  private siteConfig: SiteConfig | null = null;

  @state()
  private availableSpace: number | null = null;

  @state()
  private totalSpace: number | null = null;

  @state()
  private usagePercent: number | null = null;

  @state()
  private albumPassword: string = '';

  @state()
  private hasUnsavedChanges = false;

  @state()
  private uploadProgress: Map<string, UploadProgress> = new Map();

  @state()
  private completedUploads: Map<
    string,
    { id: string; filename_original: string; url_thumbnail: string }
  > = new Map();

  private unsubscribeLogout?: () => void;

  // ============================================================================
  // Upload State Management Helpers
  // ============================================================================

  /**
   * Initialize upload progress tracking for a batch of files.
   */
  private initializeUploadProgress(files: File[]): void {
    const newProgress = new Map<string, UploadProgress>();
    files.forEach((file) => {
      newProgress.set(file.name, {
        filename: file.name,
        status: 'waiting',
        progress: 0,
      });
    });
    this.uploadProgress = newProgress;
    this.completedUploads = new Map();
  }

  /**
   * Update progress for a single file.
   */
  private updateFileProgress(progress: UploadProgress): void {
    this.uploadProgress = new Map(this.uploadProgress).set(progress.filename, progress);

    // Store completed upload data to render thumbnail immediately
    if (progress.status === 'complete' && progress.uploadedPhoto) {
      this.completedUploads = new Map(this.completedUploads).set(
        progress.filename,
        progress.uploadedPhoto
      );
    }
  }

  /**
   * Remove a file from upload progress tracking (e.g., after dismissing an error).
   */
  private removeFileProgress(filename: string): void {
    const updated = new Map(this.uploadProgress);
    updated.delete(filename);
    this.uploadProgress = updated;
  }

  /**
   * Clear all upload tracking after completion.
   */
  private clearUploadTracking(): void {
    this.uploadProgress = new Map();
    this.completedUploads = new Map();
  }

  /**
   * Add newly uploaded photos to the album.
   */
  private addPhotosToAlbum(photos: Photo[]): void {
    if (!this.album || photos.length === 0) return;

    this.album = {
      ...this.album,
      photos: [...(this.album.photos || []), ...photos],
    };
  }

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  connectedCallback() {
    super.connectedCallback();
    void this.loadData();

    // Subscribe to logout events to clear cached data
    this.unsubscribeLogout = onLogout(() => {
      this.clearState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up logout listener
    if (this.unsubscribeLogout) {
      this.unsubscribeLogout();
    }
  }

  /**
   * Clear all cached state data.
   * Called when user logs out to prevent showing stale data.
   */
  private clearState() {
    this.album = {
      title: '',
      subtitle: '',
      description: '',
      visibility: 'public',
      allow_downloads: true,
      order: 0,
      photos: [],
    };
    this.loading = false;
    this.saving = false;
    this.uploading = false;
    this.error = '';
    this.success = '';
    this.dragging = false;
    this.draggedPhotoId = null;
    this.dragOverPhotoId = null;
    this.siteConfig = null;
    this.availableSpace = null;
    this.totalSpace = null;
    this.usagePercent = null;
    this.albumPassword = '';
  }

  private async loadData() {
    console.debug('Loading admin album editor data');
    await Promise.all([this.loadSiteConfig(), this.loadAlbumIfNeeded(), this.loadStorageStats()]);
  }

  private async loadSiteConfig() {
    console.debug('Loading site config for admin album editor');
    try {
      this.siteConfig = await fetchAdminSiteConfig();
    } catch (err) {
      console.error('Failed to load site config:', err);
    }
  }

  private async loadStorageStats() {
    console.debug('Loading storage stats for admin album editor');
    try {
      const response = await fetch('/api/admin/storage/stats', {
        credentials: 'include',
      });

      // Retry if auth not ready yet
      if (response.status === 401 || response.status === 403) {
        console.debug('Album editor: storage stats auth not ready, will retry in 1s');
        setTimeout(() => void this.loadStorageStats(), 1000);
        return;
      }

      if (response.ok) {
        const stats = (await response.json()) as {
          available_bytes: number;
          usable_bytes: number;
          total_bytes: number;
          usage_percent: number;
        };
        this.availableSpace = stats.usable_bytes;
        this.totalSpace = stats.total_bytes;
        this.usagePercent = stats.usage_percent;
      }
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    }
  }

  private async loadAlbumIfNeeded() {
    console.debug('Checking if album needs to be loaded');
    if (this.albumId && this.albumId !== 'new') {
      await this.loadAlbum();
    } else {
      this.loading = false;
    }
  }

  private async loadAlbum() {
    console.debug('Loading album data for admin album editor:', this.albumId);
    if (!this.albumId || this.albumId === 'new') return;

    this.loading = true;
    this.error = '';

    try {
      this.album = await fetchAlbumById(this.albumId);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load album';
    } finally {
      this.loading = false;
    }
  }

  private async handleSubmit(e: Event) {
    e.preventDefault();
    this.saving = true;
    this.error = '';
    this.success = '';

    try {
      // Validate password for password-protected albums
      if (
        this.album.visibility === 'password_protected' &&
        !this.album.password_hash &&
        !this.albumPassword
      ) {
        this.error = 'Password is required for password-protected albums';
        this.saving = false;
        return;
      }

      if (this.albumId && this.albumId !== 'new') {
        // Update existing album
        await updateAlbum(this.albumId, this.album);

        // Set password if visibility is password_protected and password was entered
        if (this.album.visibility === 'password_protected' && this.albumPassword) {
          await setAlbumPassword(this.albumId, this.albumPassword);
        }

        this.success = 'Album updated successfully';
        this.hasUnsavedChanges = false; // Clear unsaved changes flag
        // Clear password field after successful save
        this.albumPassword = '';
      } else {
        // Create new album
        const newAlbum = await createAlbum({
          title: this.album.title!,
          subtitle: this.album.subtitle,
          description: this.album.description,
          visibility: this.album.visibility!,
          allow_downloads: this.album.allow_downloads,
          order: this.album.order,
        });

        // Set password if visibility is password_protected
        if (this.album.visibility === 'password_protected' && this.albumPassword) {
          await setAlbumPassword(newAlbum.id, this.albumPassword);
        }

        // Navigate to edit page to upload photos
        navigateTo(routes.admin.editAlbum(newAlbum.id));
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to save album';
    } finally {
      this.saving = false;
    }
  }

  /**
   * Auto-save album when certain fields change (visibility, allow_downloads).
   * Skips validation for password since it may not be set yet.
   */
  private async autoSave() {
    if (this.albumId === 'new' || !this.albumId || this.saving) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    try {
      await updateAlbum(this.albumId, this.album);
      this.success = 'Changes saved automatically';
      this.hasUnsavedChanges = false; // Clear unsaved changes flag
      // Clear success message after 2 seconds
      setTimeout(() => {
        this.success = '';
      }, 2000);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to auto-save';
    } finally {
      this.saving = false;
    }
  }

  private async handleView(e: Event) {
    e.preventDefault();

    // Check for unsaved changes
    if (this.hasUnsavedChanges) {
      const shouldSave = confirm(
        'You have unsaved changes. Would you like to save them before viewing the album?'
      );

      if (shouldSave) {
        // Save first
        await this.handleSubmit(e);
        // Only navigate if save was successful
        if (this.error) return;
      }
    }

    // Navigate to album view using slug
    if (this.album?.slug) {
      navigateToAlbum(this.album.slug);
    }
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      void this.uploadFiles(Array.from(input.files));
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  private handleDragLeave() {
    this.dragging = false;
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void this.uploadFiles(Array.from(e.dataTransfer.files));
    }
  }

  private async uploadFiles(files: File[]) {
    if (!this.albumId || this.albumId === 'new') {
      this.error = 'Please save the album first before uploading photos';
      return;
    }

    // Validate file sizes before uploading
    const maxSizeMB = this.siteConfig?.storage?.max_image_size_mb || 50;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const oversizedFiles = files.filter((file) => file.size > maxSizeBytes);

    if (oversizedFiles.length > 0) {
      const fileList = oversizedFiles
        .map((f) => `${f.name} (${this.formatBytes(f.size)})`)
        .join(', ');
      this.error = `${oversizedFiles.length} file(s) exceed the maximum size of ${maxSizeMB}MB: ${fileList}`;
      return;
    }

    // Limit to MAX_UPLOAD_BATCH_SIZE files per batch
    if (files.length > MAX_UPLOAD_BATCH_SIZE) {
      this.error = `Too many files selected. Maximum ${MAX_UPLOAD_BATCH_SIZE} files per batch. You selected ${files.length} files.`;
      return;
    }

    this.uploading = true;
    this.error = '';
    this.success = '';

    // Initialize progress tracking for all files
    this.initializeUploadProgress(files);

    try {
      const result = await uploadPhotos(
        this.albumId,
        files,
        (progress: UploadProgress) => {
          this.updateFileProgress(progress);
        },
        CONCURRENT_UPLOAD_COUNT
      );

      // Append newly uploaded photos to the album (no need to reload!)
      this.addPhotosToAlbum(result.uploaded);

      // Refresh storage stats to show updated disk usage
      await this.loadStorageStats();

      // Clear upload progress and completed uploads after photos are added
      this.clearUploadTracking();

      // Handle results based on success/failure counts
      const uploadedCount = result.uploaded.length;
      const errorCount = result.errors.length;
      const totalFiles = uploadedCount + errorCount;

      if (uploadedCount === 0 && errorCount > 0) {
        // All uploads failed
        this.error = `All ${errorCount} upload(s) failed:\n${result.errors.join('\n')}`;
      } else if (uploadedCount > 0 && errorCount > 0) {
        // Partial success
        this.success = `Uploaded ${uploadedCount} of ${totalFiles} photo(s)`;
        this.error = `${errorCount} upload(s) failed:\n${result.errors.join('\n')}`;
      } else if (uploadedCount > 0) {
        // All succeeded
        this.success = `Successfully uploaded ${uploadedCount} photo(s)`;
      } else {
        // No files processed (shouldn't happen)
        this.error = 'No files were processed';
      }
    } catch (err) {
      // Clear upload progress on error
      this.clearUploadTracking();
      this.error = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      this.uploading = false;
    }
  }

  private async handleDeletePhoto(photoId: string) {
    if (!this.albumId || !confirm('Delete this photo?')) return;

    try {
      await deletePhoto(this.albumId, photoId);

      // Update local state without reloading
      this.album = {
        ...this.album,
        photos: (this.album.photos || []).filter((p) => p.id !== photoId),
      };

      // Refresh storage stats to show updated disk usage
      await this.loadStorageStats();

      this.success = 'Photo deleted';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete photo';
    }
  }

  private async handleDeleteAllPhotos() {
    if (!this.albumId || !this.album?.photos || this.album.photos.length === 0) return;

    const photoCount = this.album.photos.length;
    const confirmed = confirm(
      `Are you sure you want to delete ALL ${photoCount} photo(s) from this album? The album itself will remain. This action cannot be undone.`
    );

    if (!confirmed) return;

    this.saving = true;
    this.error = '';
    this.success = '';

    try {
      // Call bulk delete endpoint
      const result = await deleteAllPhotos(this.albumId);

      // Reload album to get fresh state from server
      await this.loadAlbum();
      await this.loadStorageStats();

      // Report results
      if (result.errors && result.errors.length > 0) {
        this.error = `Deleted ${result.deleted} of ${result.total} photo(s). ${result.errors.length} failed.`;
      } else {
        this.success = `Successfully deleted all ${result.deleted} photo(s)`;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete photos';
      // Still reload to show current state
      await this.loadAlbum();
      await this.loadStorageStats();
    } finally {
      this.saving = false;
    }
  }

  private async handleSetCover(photoId: string) {
    if (!this.albumId) return;

    try {
      await setCoverPhoto(this.albumId, photoId);
      await this.loadAlbum();
      this.success = 'Cover photo updated';
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to set cover';
    }
  }

  private async handleDeleteAlbum() {
    if (!this.album?.id) return;

    const confirmed = confirm(
      `Are you sure you want to delete the album "${this.album.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteAlbum(this.album.id);
      // Navigate to albums list
      navigateTo(routes.admin.albums());
    } catch (error) {
      this.error = `Failed to delete album: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
    }
  }

  // Drag-and-drop handlers for photo reordering
  private handlePhotoDragStart(e: DragEvent, photoId: string) {
    // Stop propagation to prevent file upload drag handler from triggering
    e.stopPropagation();

    this.draggedPhotoId = photoId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', photoId);
    }
  }

  private handlePhotoDragEnd(e: DragEvent) {
    e.stopPropagation();
    this.draggedPhotoId = null;
    this.dragOverPhotoId = null;
  }

  private handlePhotoDragOver(e: DragEvent, photoId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    if (this.draggedPhotoId && this.draggedPhotoId !== photoId) {
      this.dragOverPhotoId = photoId;
    }
  }

  private handlePhotoDragLeave(e: DragEvent, photoId: string) {
    e.stopPropagation();

    if (this.dragOverPhotoId === photoId) {
      this.dragOverPhotoId = null;
    }
  }

  private async handlePhotoDrop(e: DragEvent, targetPhotoId: string) {
    e.preventDefault();
    e.stopPropagation();

    this.dragOverPhotoId = null;

    if (!this.draggedPhotoId || !this.albumId || this.draggedPhotoId === targetPhotoId) {
      return;
    }

    const draggedId = this.draggedPhotoId;
    this.draggedPhotoId = null;

    // Find the indices of the dragged and target photos
    const photos = this.album.photos || [];
    const draggedIndex = photos.findIndex((p) => p.id === draggedId);
    const targetIndex = photos.findIndex((p) => p.id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Reorder photos array
    const newPhotos = [...photos];
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1);
    newPhotos.splice(targetIndex, 0, draggedPhoto);

    // Update local state immediately for responsive UX
    this.album = { ...this.album, photos: newPhotos };

    // Save to backend
    try {
      const photoIds = newPhotos.map((p) => p.id);
      await reorderPhotos(this.albumId, photoIds);
      this.success = 'Photos reordered';

      // Clear success message after 2 seconds
      setTimeout(() => {
        this.success = '';
      }, 2000);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to reorder photos';
      // Reload album to revert to saved state
      await this.loadAlbum();
    }
  }

  private updateField<K extends keyof Album>(field: K, value: Album[K]) {
    this.album = { ...this.album, [field]: value };
    // Mark as having unsaved changes (unless auto-save fields)
    if (field !== 'visibility' && field !== 'allow_downloads') {
      this.hasUnsavedChanges = true;
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private isUploadDisabled(): boolean {
    if (
      this.usagePercent === null ||
      this.siteConfig === null ||
      this.siteConfig.storage === undefined
    ) {
      return false; // Don't disable if we don't have the data yet
    }

    const maxPercent = this.siteConfig.storage.max_disk_usage_percent || 80;
    return this.usagePercent >= maxPercent;
  }

  private getUploadDisabledMessage(): string | null {
    if (!this.isUploadDisabled()) return null;

    const maxPercent = this.siteConfig?.storage?.max_disk_usage_percent || 80;
    return `Uploads disabled: Disk usage is at ${this.usagePercent?.toFixed(
      1
    )}%, exceeding the ${maxPercent}% limit. Please free up space or increase the limit in settings.`;
  }

  render() {
    const siteTitle = this.siteConfig?.site?.title || 'Photography Portfolio';

    if (this.loading) {
      return html`
        <admin-header .siteTitle=${siteTitle} currentPage="albums"></admin-header>
        <div class="container"><div class="loading">Loading...</div></div>
      `;
    }

    const isNew = this.albumId === 'new' || !this.albumId;

    return html`
      <admin-header .siteTitle=${siteTitle} currentPage="albums"></admin-header>

      <div class="page-header">
        <h1 class="page-title">${isNew ? 'Create Album' : 'Edit Album'}</h1>
      </div>

      <div class="layout-wrapper">
        <div class="sidebar">
          <form @submit=${(e: Event) => this.handleSubmit(e)}>
            <div class="form-section">
              <h2>Album Details</h2>

              <div class="form-group">
                <label for="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  .value=${this.album.title || ''}
                  @input=${(e: Event) =>
                    this.updateField('title', (e.target as HTMLInputElement).value)}
                  required
                />
              </div>

              <div class="form-group">
                <label for="subtitle">Subtitle</label>
                <input
                  type="text"
                  id="subtitle"
                  .value=${this.album.subtitle || ''}
                  @input=${(e: Event) =>
                    this.updateField('subtitle', (e.target as HTMLInputElement).value)}
                />
              </div>

              <div class="form-group">
                <label for="description">Description</label>
                <textarea
                  id="description"
                  .value=${this.album.description || ''}
                  @input=${(e: Event) =>
                    this.updateField('description', (e.target as HTMLTextAreaElement).value)}
                ></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="visibility">Visibility</label>
                  <select
                    id="visibility"
                    .value=${this.album.visibility || 'public'}
                    @change=${(e: Event) => {
                      const select = e.target as HTMLSelectElement;
                      const value = select.value as 'public' | 'unlisted' | 'password_protected';
                      this.updateField('visibility', value);
                      // Auto-save unless switching to password_protected (user needs to enter password first)
                      if (value !== 'password_protected') {
                        void this.autoSave();
                      }
                    }}
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="password_protected">Password Protected</option>
                  </select>
                </div>

                ${this.album.visibility === 'password_protected'
                  ? html`
                      <div class="form-group">
                        <label for="album_password">Album Password *</label>
                        <input
                          type="password"
                          id="album_password"
                          placeholder="Enter password for this album"
                          @input=${(e: Event) => {
                            const input = e.target as HTMLInputElement;
                            this.albumPassword = input.value;
                          }}
                        />
                        <small
                          style="color: var(--color-text-secondary, #666); font-size: 0.875rem;"
                        >
                          ${this.album.password_hash
                            ? 'Leave blank to keep current password'
                            : 'Required for password-protected albums'}
                        </small>
                      </div>
                    `
                  : html` <div class="form-group"></div> `}
              </div>

              <div class="form-group">
                <div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="allow_downloads"
                    .checked=${this.album.allow_downloads ?? true}
                    @change=${(e: Event) => {
                      this.updateField('allow_downloads', (e.target as HTMLInputElement).checked);
                      void this.autoSave();
                    }}
                  />
                  <label for="allow_downloads">Allow downloads</label>
                </div>
              </div>

              <div
                style="display: flex; justify-content: flex-start; gap: 1rem; margin-top: 1.5rem;"
              >
                ${!isNew
                  ? html`
                      <button
                        type="button"
                        class="btn btn-secondary"
                        @click=${(e: Event) => this.handleView(e)}
                        ?disabled=${this.saving}
                        style="flex: 1;"
                      >
                        View
                      </button>
                    `
                  : ''}
                <button
                  type="submit"
                  class="btn btn-primary"
                  ?disabled=${this.saving}
                  style="flex: 1;"
                >
                  ${this.saving ? 'Saving...' : isNew ? 'Create Album' : 'Save'}
                </button>
              </div>
            </div>
          </form>

          ${!isNew
            ? html`
                <div class="form-section">
                  <h2>Danger Zone</h2>
                  <div style="display: flex; gap: 1rem; align-items: center;">
                    ${this.album.photos && this.album.photos.length > 0
                      ? html`
                          <button
                            type="button"
                            class="btn btn-danger"
                            @click=${() => this.handleDeleteAllPhotos()}
                            ?disabled=${this.saving || this.uploading}
                            style="flex: 1;"
                          >
                            Delete All Photos
                          </button>
                        `
                      : ''}
                    <button
                      type="button"
                      class="btn btn-danger"
                      @click=${() => this.handleDeleteAlbum()}
                      ?disabled=${this.saving}
                      style="flex: 1;"
                    >
                      Delete Album
                    </button>
                  </div>
                </div>
              `
            : ''}
        </div>

        <div class="main-content">
          ${!isNew
            ? html`
                <div class="form-section">
                  <h2>Photos (${this.album.photos?.length || 0})</h2>

                  ${this.getUploadDisabledMessage()
                    ? html`<div class="upload-warning">${this.getUploadDisabledMessage()}</div>`
                    : ''}

                  <div class="photo-upload">
                    <div
                      class="upload-area ${this.dragging
                        ? 'dragging'
                        : ''} ${this.isUploadDisabled() ? 'disabled' : ''}"
                      @click=${() => {
                        if (this.isUploadDisabled()) return;
                        const input = this.shadowRoot?.querySelector(
                          'input[type="file"]'
                        ) as HTMLInputElement;
                        input?.click();
                      }}
                      @dragover=${(e: DragEvent) => {
                        if (this.isUploadDisabled()) {
                          e.preventDefault();
                          return;
                        }
                        this.handleDragOver(e);
                      }}
                      @dragleave=${() => this.handleDragLeave()}
                      @drop=${(e: DragEvent) => {
                        if (this.isUploadDisabled()) {
                          e.preventDefault();
                          return;
                        }
                        this.handleDrop(e);
                      }}
                    >
                      <p>Drag photos here or click to browse</p>
                      <p style="font-size: 0.875rem; color: var(--color-text-secondary, #666);">
                        Up to ${this.siteConfig?.storage?.max_image_size_mb || 50}MB each
                        ${this.availableSpace !== null
                          ? html` • ${this.formatBytes(this.availableSpace)} available`
                          : ''}
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      style="display: none;"
                      ?disabled=${this.isUploadDisabled()}
                      @change=${(e: Event) => this.handleFileSelect(e)}
                    />
                  </div>

                  ${this.uploadProgress.size > 0
                    ? html`<div class="upload-summary">
                        ${(() => {
                          const progressArray = Array.from(this.uploadProgress.values());
                          const uploading = progressArray.filter(
                            (p) => p.status === 'uploading'
                          ).length;
                          const processing = progressArray.filter(
                            (p) => p.status === 'processing'
                          ).length;
                          const complete = progressArray.filter(
                            (p) => p.status === 'complete'
                          ).length;
                          const errors = progressArray.filter((p) => p.status === 'error').length;
                          return html`
                            <span>Uploading: ${uploading}</span>
                            <span>Processing: ${processing}</span>
                            <span>Complete: ${complete}</span>
                            ${errors > 0
                              ? html`<span class="error-count">Errors: ${errors}</span>`
                              : ''}
                          `;
                        })()}
                      </div>`
                    : ''}
                  ${(this.album.photos && this.album.photos.length > 0) ||
                  this.uploadProgress.size > 0 ||
                  this.completedUploads.size > 0
                    ? html`
                        <div class="photos-grid">
                          <!-- Upload placeholders or completed thumbnails -->
                          ${Array.from(this.uploadProgress.values()).map((progress) => {
                            // If this file is complete and we have the thumbnail, show it
                            const completedPhoto = this.completedUploads.get(progress.filename);
                            if (completedPhoto && progress.status === 'complete') {
                              return html`
                                <div class="photo-item">
                                  <img
                                    src=${completedPhoto.url_thumbnail}
                                    alt=${completedPhoto.filename_original}
                                  />
                                </div>
                              `;
                            }
                            // Otherwise show the progress placeholder
                            return html`
                              <upload-placeholder
                                filename=${progress.filename}
                                status=${progress.status}
                                progress=${progress.progress}
                                error=${progress.error || ''}
                                @dismiss=${() => this.removeFileProgress(progress.filename)}
                              ></upload-placeholder>
                            `;
                          })}
                          <!-- Existing photos -->
                          ${this.album.photos?.map(
                            (photo) => html`
                              <div
                                class="photo-item ${this.draggedPhotoId === photo.id
                                  ? 'dragging'
                                  : ''} ${this.dragOverPhotoId === photo.id ? 'drag-over' : ''}"
                                draggable="true"
                                @dragstart=${(e: DragEvent) =>
                                  this.handlePhotoDragStart(e, photo.id)}
                                @dragend=${(e: DragEvent) => this.handlePhotoDragEnd(e)}
                                @dragover=${(e: DragEvent) => this.handlePhotoDragOver(e, photo.id)}
                                @dragleave=${(e: DragEvent) =>
                                  this.handlePhotoDragLeave(e, photo.id)}
                                @drop=${(e: DragEvent) => this.handlePhotoDrop(e, photo.id)}
                              >
                                ${photo.id === this.album.cover_photo_id
                                  ? html`<span class="cover-badge">COVER</span>`
                                  : ''}
                                <img src=${photo.url_thumbnail} alt=${photo.alt_text || ''} />
                                <div class="photo-overlay">
                                  ${photo.id !== this.album.cover_photo_id
                                    ? html`
                                        <button
                                          class="btn btn-primary"
                                          type="button"
                                          @click=${() => this.handleSetCover(photo.id)}
                                        >
                                          Set Cover
                                        </button>
                                      `
                                    : ''}
                                  <button
                                    class="btn btn-danger"
                                    type="button"
                                    @click=${() => this.handleDeletePhoto(photo.id)}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            `
                          )}
                        </div>
                      `
                    : ''}
                </div>
              `
            : ''}
        </div>
      </div>

      <toast-notification
        .message=${this.success}
        .type=${'success'}
        .visible=${!!this.success}
        @toast-close=${() => {
          this.success = '';
        }}
      ></toast-notification>

      <toast-notification
        .message=${this.error}
        .type=${'error'}
        .visible=${!!this.error}
        @toast-close=${() => {
          this.error = '';
        }}
      ></toast-notification>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'admin-album-editor-page': AdminAlbumEditorPage;
  }
}
