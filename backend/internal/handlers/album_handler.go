package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/njoubert/nielsshootsfilm/backend/internal"
	"github.com/njoubert/nielsshootsfilm/backend/internal/models"
	"github.com/njoubert/nielsshootsfilm/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

// AlbumHandler handles album-related HTTP requests.
type AlbumHandler struct {
	albumService *services.AlbumService
	imageService *services.ImageService
	logger       *slog.Logger
}

// NewAlbumHandler creates a new album handler.
func NewAlbumHandler(
	albumService *services.AlbumService,
	imageService *services.ImageService,
	logger *slog.Logger,
) *AlbumHandler {
	return &AlbumHandler{
		albumService: albumService,
		imageService: imageService,
		logger:       logger,
	}
}

// GetAll returns all albums.
func (h *AlbumHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	albums, err := h.albumService.GetAll()
	if err != nil {
		h.logger.Error("failed to get albums", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"albums": albums,
	})
}

// GetByID returns a single album by ID.
func (h *AlbumHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	album, err := h.albumService.GetByID(id)
	if err != nil {
		if err.Error() == "album not found" {
			http.Error(w, "Album not found", http.StatusNotFound)
			return
		}
		h.logger.Error("failed to get album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	respondJSON(w, http.StatusOK, album)
}

// Create creates a new album.
func (h *AlbumHandler) Create(w http.ResponseWriter, r *http.Request) {
	var album models.Album
	if err := json.NewDecoder(r.Body).Decode(&album); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.albumService.Create(&album); err != nil {
		h.logger.Error("failed to create album", slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusCreated, album)
}

// Update updates an existing album.
func (h *AlbumHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var updates models.Album
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.albumService.Update(id, &updates); err != nil {
		h.logger.Error("failed to update album", slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	respondJSON(w, http.StatusOK, updates)
}

// Delete deletes an album.
func (h *AlbumHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Get album to delete photos
	album, err := h.albumService.GetByID(id)
	if err != nil {
		if err.Error() == "album not found" {
			http.Error(w, "Album not found", http.StatusNotFound)
			return
		}
		h.logger.Error("failed to get album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Delete all photos from filesystem
	for _, photo := range album.Photos {
		if err := h.imageService.DeletePhoto(&photo); err != nil {
			h.logger.Warn("failed to delete photo file",
				slog.String("photo_id", photo.ID),
				slog.String("error", err.Error()),
			)
		}
	}

	// Delete album from JSON
	if err := h.albumService.Delete(id); err != nil {
		h.logger.Error("failed to delete album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// UploadPhotos handles photo upload to an album.
func (h *AlbumHandler) UploadPhotos(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	// Verify album exists
	if _, err := h.albumService.GetByID(albumID); err != nil {
		if err.Error() == "album not found" {
			http.Error(w, "Album not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Parse multipart form
	// Each request contains one file, but allow some overhead for form metadata
	maxFormSize := int64(internal.MaxUploadFileSize + (10 * 1024 * 1024)) // Max file size + 10MB overhead
	if err := r.ParseMultipartForm(maxFormSize); err != nil {
		// Check if this is a timeout or connection error
		errMsg := err.Error()
		if strings.Contains(errMsg, "timeout") || strings.Contains(errMsg, "timed out") {
			http.Error(w, "Upload timed out at the server. Try uploading smaller files or use a faster connection.", http.StatusRequestTimeout)
			return
		}
		if strings.Contains(errMsg, "connection reset") || strings.Contains(errMsg, "broken pipe") {
			http.Error(w, "Connection lost during upload. Please try again.", http.StatusBadRequest)
			return
		}
		if errors.Is(err, http.ErrHandlerTimeout) {
			http.Error(w, "Upload timed out at the server. Please try uploading smaller files or use a faster connection.", http.StatusRequestTimeout)
			return
		}
		// Generic parse error
		http.Error(w, "Failed to parse form: "+err.Error(), http.StatusBadRequest)
		return
	}

	files := r.MultipartForm.File["photos"]
	if len(files) == 0 {
		http.Error(w, "No files uploaded", http.StatusBadRequest)
		return
	}

	// Process each file
	uploadedPhotos := []models.Photo{}
	errors := []string{}

	for _, fileHeader := range files {
		photo, err := h.imageService.ProcessUpload(fileHeader)
		if err != nil {
			h.logger.Error("failed to process upload",
				slog.String("filename", fileHeader.Filename),
				slog.String("error", err.Error()),
			)
			errors = append(errors, fileHeader.Filename+": "+err.Error())
			continue
		}

		// Add photo to album
		if err := h.albumService.AddPhoto(albumID, photo); err != nil {
			h.logger.Error("failed to add photo to album",
				slog.String("filename", fileHeader.Filename),
				slog.String("error", err.Error()),
			)
			errors = append(errors, fileHeader.Filename+": "+err.Error())
			continue
		}

		uploadedPhotos = append(uploadedPhotos, *photo)
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"uploaded": uploadedPhotos,
		"errors":   errors,
	})
}

// DeletePhoto deletes a photo from an album.
func (h *AlbumHandler) DeletePhoto(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")
	photoID := chi.URLParam(r, "photoId")

	// Get album to find photo
	album, err := h.albumService.GetByID(albumID)
	if err != nil {
		http.Error(w, "Album not found", http.StatusNotFound)
		return
	}

	// Find photo
	var photo *models.Photo
	for i := range album.Photos {
		if album.Photos[i].ID == photoID {
			photo = &album.Photos[i]
			break
		}
	}

	if photo == nil {
		http.Error(w, "Photo not found", http.StatusNotFound)
		return
	}

	// Delete photo files
	if err := h.imageService.DeletePhoto(photo); err != nil {
		h.logger.Warn("failed to delete photo files",
			slog.String("photo_id", photoID),
			slog.String("error", err.Error()),
		)
	}

	// Delete photo from album
	if err := h.albumService.DeletePhoto(albumID, photoID); err != nil {
		h.logger.Error("failed to delete photo from album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteAllPhotos deletes all photos from an album.
func (h *AlbumHandler) DeleteAllPhotos(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	// Get album
	album, err := h.albumService.GetByID(albumID)
	if err != nil {
		http.Error(w, "Album not found", http.StatusNotFound)
		return
	}

	// Delete all photo files
	var deletionErrors []string
	for i := range album.Photos {
		if err := h.imageService.DeletePhoto(&album.Photos[i]); err != nil {
			h.logger.Warn("failed to delete photo files",
				slog.String("photo_id", album.Photos[i].ID),
				slog.String("error", err.Error()),
			)
			deletionErrors = append(deletionErrors, album.Photos[i].ID)
		}
	}

	// Delete all photos from album
	if err := h.albumService.DeleteAllPhotos(albumID); err != nil {
		h.logger.Error("failed to delete all photos from album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Return result
	response := map[string]any{
		"deleted": len(album.Photos) - len(deletionErrors),
		"total":   len(album.Photos),
	}
	if len(deletionErrors) > 0 {
		response["errors"] = deletionErrors
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// SetPassword sets a password for an album.
func (h *AlbumHandler) SetPassword(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	var req struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Get album
	album, err := h.albumService.GetByID(albumID)
	if err != nil {
		http.Error(w, "Album not found", http.StatusNotFound)
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("failed to hash password", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Update album
	album.Visibility = "password_protected"
	album.PasswordHash = string(hash)

	if err := h.albumService.Update(albumID, album); err != nil {
		h.logger.Error("failed to update album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// RemovePassword removes password protection from an album.
func (h *AlbumHandler) RemovePassword(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	// Get album
	album, err := h.albumService.GetByID(albumID)
	if err != nil {
		http.Error(w, "Album not found", http.StatusNotFound)
		return
	}

	// Update album
	album.Visibility = "public"
	album.PasswordHash = ""

	if err := h.albumService.Update(albumID, album); err != nil {
		h.logger.Error("failed to update album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SetCoverPhoto sets the cover photo for an album.
func (h *AlbumHandler) SetCoverPhoto(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	var req struct {
		PhotoID string `json:"photo_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.albumService.SetCoverPhoto(albumID, req.PhotoID); err != nil {
		h.logger.Error("failed to set cover photo", slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SetCoverPhoto sets the cover photo for an album.
func (h *AlbumHandler) ClearCoverPhoto(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	if err := h.albumService.ClearCoverPhoto(albumID); err != nil {
		h.logger.Error("failed to clear cover photo", slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ReorderPhotos reorders photos in an album.
func (h *AlbumHandler) ReorderPhotos(w http.ResponseWriter, r *http.Request) {
	albumID := chi.URLParam(r, "id")

	var req struct {
		PhotoIDs []string `json:"photo_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.PhotoIDs) == 0 {
		http.Error(w, "photo_ids array is required", http.StatusBadRequest)
		return
	}

	if err := h.albumService.ReorderPhotos(albumID, req.PhotoIDs); err != nil {
		h.logger.Error("failed to reorder photos", slog.String("error", err.Error()))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DownloadAlbum streams a ZIP file containing album photos at the requested quality level.
func (h *AlbumHandler) DownloadAlbum(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	quality := r.URL.Query().Get("quality")

	// Validate quality parameter
	if quality != "thumbnail" && quality != "display" && quality != "original" {
		http.Error(w, "Invalid quality parameter. Must be: thumbnail, display, or original", http.StatusBadRequest)
		return
	}

	// Get album by slug
	album, err := h.albumService.GetBySlug(slug)
	if err != nil {
		if err.Error() == "album not found" {
			http.Error(w, "Album not found", http.StatusNotFound)
			return
		}
		h.logger.Error("failed to get album", slog.String("error", err.Error()))
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Check if downloads are allowed for this album
	if !album.AllowDownloads {
		http.Error(w, "Downloads are not enabled for this album", http.StatusForbidden)
		return
	}

	// Stream the ZIP file
	if err := h.imageService.StreamAlbumZIP(w, album, quality); err != nil {
		h.logger.Error("failed to stream album ZIP",
			slog.String("album", album.Slug),
			slog.String("quality", quality),
			slog.String("error", err.Error()))
		// Don't write error response as headers may already be sent
		return
	}
}

// respondJSON writes a JSON response.
func respondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// Log error but can't send another response
		slog.Error("failed to encode JSON response", slog.String("error", err.Error()))
	}
}
