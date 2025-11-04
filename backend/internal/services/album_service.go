package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/njoubert/nielsshootsfilm/backend/internal/models"
)

const albumsFile = "albums.json"

// AlbumService handles album CRUD operations.
type AlbumService struct {
	fileService *FileService
}

// NewAlbumService creates a new album service.
func NewAlbumService(fileService *FileService) *AlbumService {
	return &AlbumService{
		fileService: fileService,
	}
}

// GetAll returns all albums.
func (s *AlbumService) GetAll() ([]models.Album, error) {
	var collection models.AlbumCollection

	// If file doesn't exist, return empty collection
	if !s.fileService.FileExists(albumsFile) {
		return []models.Album{}, nil
	}

	if err := s.fileService.ReadJSON(albumsFile, &collection); err != nil {
		return nil, fmt.Errorf("failed to read albums: %w", err)
	}

	return collection.Albums, nil
}

// GetByID returns an album by its ID.
func (s *AlbumService) GetByID(id string) (*models.Album, error) {
	albums, err := s.GetAll()
	if err != nil {
		return nil, err
	}

	for i := range albums {
		if albums[i].ID == id {
			return &albums[i], nil
		}
	}

	return nil, errors.New("album not found")
}

// GetBySlug returns an album by its slug.
func (s *AlbumService) GetBySlug(slug string) (*models.Album, error) {
	albums, err := s.GetAll()
	if err != nil {
		return nil, err
	}

	for i := range albums {
		if albums[i].Slug == slug {
			return &albums[i], nil
		}
	}

	return nil, errors.New("album not found")
}

// Create creates a new album.
func (s *AlbumService) Create(album *models.Album) error {
	// Set ID and timestamps
	album.ID = uuid.New().String()
	album.CreatedAt = time.Now().UTC()
	album.UpdatedAt = time.Now().UTC()

	// Get existing albums
	albums, err := s.GetAll()
	if err != nil {
		return err
	}

	// Generate slug if not provided
	if album.Slug == "" {
		baseSlug := generateSlug(album.Title)
		album.Slug = generateUniqueSlug(baseSlug, albums)
	} else {
		// If slug is provided, ensure it's unique
		album.Slug = generateUniqueSlug(album.Slug, albums)
	}

	// Validate album
	if err := album.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	// Add album to collection
	albums = append(albums, *album)

	collection := models.AlbumCollection{Albums: albums}
	if err := s.fileService.WriteJSON(albumsFile, &collection); err != nil {
		return fmt.Errorf("failed to write albums: %w", err)
	}

	return nil
}

// Update updates an existing album.
func (s *AlbumService) Update(id string, updates *models.Album) error {
	albums, err := s.GetAll()
	if err != nil {
		return err
	}

	found := false
	for i := range albums {
		if albums[i].ID == id {
			// Preserve ID and CreatedAt
			updates.ID = albums[i].ID
			updates.CreatedAt = albums[i].CreatedAt
			updates.UpdatedAt = time.Now().UTC()

			// Validate updates
			if err := updates.Validate(); err != nil {
				return fmt.Errorf("validation failed: %w", err)
			}

			// Check for duplicate slug (excluding current album)
			for j := range albums {
				if i != j && albums[j].Slug == updates.Slug {
					return errors.New("album with this slug already exists")
				}
			}

			albums[i] = *updates
			found = true
			break
		}
	}

	if !found {
		return errors.New("album not found")
	}

	collection := models.AlbumCollection{Albums: albums}
	if err := s.fileService.WriteJSON(albumsFile, &collection); err != nil {
		return fmt.Errorf("failed to write albums: %w", err)
	}

	return nil
}

// Delete deletes an album by ID.
func (s *AlbumService) Delete(id string) error {
	albums, err := s.GetAll()
	if err != nil {
		return err
	}

	found := false
	newAlbums := make([]models.Album, 0, len(albums))

	for _, album := range albums {
		if album.ID == id {
			found = true
			// Skip this album (delete it)
		} else {
			newAlbums = append(newAlbums, album)
		}
	}

	if !found {
		return errors.New("album not found")
	}

	collection := models.AlbumCollection{Albums: newAlbums}
	if err := s.fileService.WriteJSON(albumsFile, &collection); err != nil {
		return fmt.Errorf("failed to write albums: %w", err)
	}

	return nil
}

// AddPhoto adds a photo to an album.
func (s *AlbumService) AddPhoto(albumID string, photo *models.Photo) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	// Set photo ID and timestamp
	photo.ID = uuid.New().String()
	photo.UploadedAt = time.Now().UTC()

	// Set order (append to end)
	photo.Order = len(album.Photos) + 1

	album.Photos = append(album.Photos, *photo)

	return s.Update(albumID, album)
}

// UpdatePhoto updates a photo in an album.
func (s *AlbumService) UpdatePhoto(albumID, photoID string, updates *models.Photo) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	found := false
	for i := range album.Photos {
		if album.Photos[i].ID == photoID {
			// Preserve ID and UploadedAt
			updates.ID = album.Photos[i].ID
			updates.UploadedAt = album.Photos[i].UploadedAt

			album.Photos[i] = *updates
			found = true
			break
		}
	}

	if !found {
		return errors.New("photo not found")
	}

	return s.Update(albumID, album)
}

// DeletePhoto deletes a photo from an album.
func (s *AlbumService) DeletePhoto(albumID, photoID string) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	found := false
	newPhotos := make([]models.Photo, 0, len(album.Photos))

	for _, photo := range album.Photos {
		if photo.ID == photoID {
			found = true
			// Skip this photo (delete it)
		} else {
			newPhotos = append(newPhotos, photo)
		}
	}

	if !found {
		return errors.New("photo not found")
	}

	album.Photos = newPhotos

	return s.Update(albumID, album)
}

// DeleteAllPhotos deletes all photos from an album.
func (s *AlbumService) DeleteAllPhotos(albumID string) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	// Clear all photos
	album.Photos = []models.Photo{}

	return s.Update(albumID, album)
}

// SetCoverPhoto sets the cover photo for an album.
func (s *AlbumService) SetCoverPhoto(albumID, photoID string) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	// Verify photo exists in album
	found := false
	for _, photo := range album.Photos {
		if photo.ID == photoID {
			found = true
			break
		}
	}

	if !found {
		return errors.New("photo not found in album")
	}

	album.CoverPhotoID = photoID

	return s.Update(albumID, album)
}

// ClearCoverPhoto clears the cover photo for an album.
func (s *AlbumService) ClearCoverPhoto(albumID string) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	album.CoverPhotoID = ""

	return s.Update(albumID, album)
}

// ReorderPhotos reorders photos in an album based on the provided photo IDs.
func (s *AlbumService) ReorderPhotos(albumID string, photoIDs []string) error {
	album, err := s.GetByID(albumID)
	if err != nil {
		return err
	}

	// Verify all photo IDs exist in the album
	if len(photoIDs) != len(album.Photos) {
		return errors.New("photo ID count does not match album photo count")
	}

	photoMap := make(map[string]models.Photo)
	for _, photo := range album.Photos {
		photoMap[photo.ID] = photo
	}

	// Build new photos array in the requested order
	newPhotos := make([]models.Photo, 0, len(photoIDs))
	for i, photoID := range photoIDs {
		photo, exists := photoMap[photoID]
		if !exists {
			return fmt.Errorf("photo ID %s not found in album", photoID)
		}
		// Update the order field
		photo.Order = i + 1
		newPhotos = append(newPhotos, photo)
	}

	album.Photos = newPhotos

	return s.Update(albumID, album)
}

// generateSlug creates a URL-friendly slug from a title.
func generateSlug(title string) string {
	// Convert to lowercase
	slug := strings.ToLower(title)

	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")

	// Remove non-alphanumeric characters (except hyphens)
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}

	// Remove consecutive hyphens
	slug = result.String()
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}

	// Trim hyphens from ends
	slug = strings.Trim(slug, "-")

	// If slug is empty, use a UUID
	if slug == "" {
		slug = uuid.New().String()
	}

	return slug
}

// generateUniqueSlug ensures a slug is unique by appending a number if needed.
func generateUniqueSlug(baseSlug string, existingAlbums []models.Album) string {
	slug := baseSlug

	// Check if slug already exists
	exists := false
	for _, album := range existingAlbums {
		if album.Slug == slug {
			exists = true
			break
		}
	}

	if !exists {
		return slug
	}

	// Append numbers until we find a unique slug
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s-%d", baseSlug, i)
		exists = false

		for _, album := range existingAlbums {
			if album.Slug == candidate {
				exists = true
				break
			}
		}

		if !exists {
			return candidate
		}
	}
}
