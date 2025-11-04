package services

import (
	"testing"
	"time"

	"github.com/njoubert/nielsshootsfilm/backend/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupAlbumService(t *testing.T) (*AlbumService, string) {
	tmpDir := t.TempDir()
	fileService, err := NewFileService(tmpDir)
	require.NoError(t, err)

	albumService := NewAlbumService(fileService)
	return albumService, tmpDir
}

func TestAlbumService_GetAll(t *testing.T) {
	service, _ := setupAlbumService(t)

	albums, err := service.GetAll()
	require.NoError(t, err)
	assert.NotNil(t, albums)
	assert.Len(t, albums, 0) // Empty initially
}

func TestAlbumService_Create(t *testing.T) {
	service, _ := setupAlbumService(t)

	album := &models.Album{
		Title:       "Test Album",
		Description: "A test album",
		Visibility:  "public",
	}

	err := service.Create(album)
	require.NoError(t, err)
	assert.NotEmpty(t, album.ID)
	assert.Equal(t, "test-album", album.Slug)
	assert.Equal(t, "Test Album", album.Title)
	assert.NotZero(t, album.CreatedAt)
	assert.NotZero(t, album.UpdatedAt)
}

func TestAlbumService_Create_GeneratesUniqueSlug(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create first album
	album1 := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album1)
	require.NoError(t, err)
	assert.Equal(t, "test-album", album1.Slug)

	// Create second album with same title
	album2 := &models.Album{Title: "Test Album", Visibility: "public"}
	err = service.Create(album2)
	require.NoError(t, err)
	assert.NotEqual(t, album1.Slug, album2.Slug)
	assert.Contains(t, album2.Slug, "test-album-")
}

func TestAlbumService_GetByID(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create an album
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	// Retrieve by ID
	retrieved, err := service.GetByID(album.ID)
	require.NoError(t, err)
	assert.Equal(t, album.ID, retrieved.ID)
	assert.Equal(t, album.Title, retrieved.Title)
}

func TestAlbumService_GetByID_NotFound(t *testing.T) {
	service, _ := setupAlbumService(t)

	_, err := service.GetByID("nonexistent-id")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "album not found")
}

func TestAlbumService_GetBySlug(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create an album
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	// Retrieve by slug
	retrieved, err := service.GetBySlug(album.Slug)
	require.NoError(t, err)
	assert.Equal(t, album.Slug, retrieved.Slug)
	assert.Equal(t, album.Title, retrieved.Title)
}

func TestAlbumService_Update(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create an album
	album := &models.Album{Title: "Original Title", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	originalCreatedAt := album.CreatedAt

	// Update it
	album.Title = "Updated Title"
	album.Description = "New description"

	err = service.Update(album.ID, album)
	require.NoError(t, err)
	assert.Equal(t, "Updated Title", album.Title)
	assert.Equal(t, "New description", album.Description)
	assert.True(t, album.UpdatedAt.After(originalCreatedAt))
}

func TestAlbumService_Delete(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create an album
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	// Delete it
	err = service.Delete(album.ID)
	require.NoError(t, err)

	// Verify it's gone
	_, err = service.GetByID(album.ID)
	assert.Error(t, err)
}

func TestAlbumService_AddPhoto(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create an album
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	// Add a photo
	photo := &models.Photo{
		FilenameOriginal: "test.jpg",
		URLOriginal:      "/uploads/originals/test.jpg",
		URLDisplay:       "/uploads/display/test.jpg",
		URLThumbnail:     "/uploads/thumbnails/test.jpg",
		Caption:          "Test Photo",
	}

	err = service.AddPhoto(album.ID, photo)
	require.NoError(t, err)

	// Re-fetch album
	updated, err := service.GetByID(album.ID)
	require.NoError(t, err)

	assert.Len(t, updated.Photos, 1)
	assert.NotEmpty(t, updated.Photos[0].ID)
	assert.Equal(t, "Test Photo", updated.Photos[0].Caption)
	assert.NotZero(t, updated.Photos[0].UploadedAt)
}

func TestAlbumService_UpdatePhoto(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album and add photo
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	photo := &models.Photo{
		FilenameOriginal: "test.jpg",
		URLOriginal:      "/uploads/originals/test.jpg",
		URLDisplay:       "/uploads/display/test.jpg",
		URLThumbnail:     "/uploads/thumbnails/test.jpg",
		Caption:          "Original Caption",
	}

	err = service.AddPhoto(album.ID, photo)
	require.NoError(t, err)

	// Get album to find photo ID
	updated, err := service.GetByID(album.ID)
	require.NoError(t, err)

	// Update photo
	photoID := updated.Photos[0].ID
	photoUpdate := &models.Photo{
		Caption: "Updated Caption",
		AltText: "New alt text",
	}

	err = service.UpdatePhoto(album.ID, photoID, photoUpdate)
	require.NoError(t, err)

	// Re-fetch and verify
	result, err := service.GetByID(album.ID)
	require.NoError(t, err)

	var updatedPhoto *models.Photo
	for i := range result.Photos {
		if result.Photos[i].ID == photoID {
			updatedPhoto = &result.Photos[i]
			break
		}
	}

	require.NotNil(t, updatedPhoto)
	assert.Equal(t, "Updated Caption", updatedPhoto.Caption)
	assert.Equal(t, "New alt text", updatedPhoto.AltText)
}

func TestAlbumService_DeletePhoto(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album and add photo
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	photo := &models.Photo{
		FilenameOriginal: "test.jpg",
		URLOriginal:      "/uploads/originals/test.jpg",
		URLDisplay:       "/uploads/display/test.jpg",
		URLThumbnail:     "/uploads/thumbnails/test.jpg",
		Caption:          "Test Photo",
	}

	err = service.AddPhoto(album.ID, photo)
	require.NoError(t, err)

	updated, err := service.GetByID(album.ID)
	require.NoError(t, err)
	photoID := updated.Photos[0].ID

	// Delete photo
	err = service.DeletePhoto(album.ID, photoID)
	require.NoError(t, err)

	// Verify it's gone
	result, err := service.GetByID(album.ID)
	require.NoError(t, err)
	assert.Len(t, result.Photos, 0)
}

func TestAlbumService_SetCoverPhoto(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album and add photos
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	photo1 := &models.Photo{
		FilenameOriginal: "1.jpg",
		URLOriginal:      "/uploads/originals/1.jpg",
		URLDisplay:       "/uploads/display/1.jpg",
		URLThumbnail:     "/uploads/thumbnails/1.jpg",
		Caption:          "Photo 1",
	}

	photo2 := &models.Photo{
		FilenameOriginal: "2.jpg",
		URLOriginal:      "/uploads/originals/2.jpg",
		URLDisplay:       "/uploads/display/2.jpg",
		URLThumbnail:     "/uploads/thumbnails/2.jpg",
		Caption:          "Photo 2",
	}

	err = service.AddPhoto(album.ID, photo1)
	require.NoError(t, err)

	err = service.AddPhoto(album.ID, photo2)
	require.NoError(t, err)

	updated, err := service.GetByID(album.ID)
	require.NoError(t, err)
	photo2ID := updated.Photos[1].ID

	// Set second photo as cover
	err = service.SetCoverPhoto(album.ID, photo2ID)
	require.NoError(t, err)

	// Verify
	result, err := service.GetByID(album.ID)
	require.NoError(t, err)
	assert.Equal(t, photo2ID, result.CoverPhotoID)

	// Clear cover photo
	err = service.ClearCoverPhoto(album.ID)
	require.NoError(t, err)
	assert.Equal(t, "", result.CoverPhotoID)

}

func TestAlbumService_Validation(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Test empty title
	album := &models.Album{Title: ""}
	err := service.Create(album)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "title is required")
}

func TestAlbumService_SlugGeneration(t *testing.T) {
	service, _ := setupAlbumService(t)

	testCases := []struct {
		title    string
		expected string
	}{
		{"Simple Title", "simple-title"},
		{"Title With Numbers 123", "title-with-numbers-123"},
		{"Special!@#Characters", "specialcharacters"},
		{"Multiple   Spaces", "multiple-spaces"},
		{"trailing-dash-", "trailing-dash"},
	}

	for _, tc := range testCases {
		t.Run(tc.title, func(t *testing.T) {
			album := &models.Album{Title: tc.title, Visibility: "public"}
			err := service.Create(album)
			require.NoError(t, err)
			assert.Equal(t, tc.expected, album.Slug)
		})
	}
}

func TestAlbumService_PhotoOrdering(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	// Add photos with different timestamps
	photo1 := &models.Photo{
		FilenameOriginal: "1.jpg",
		URLOriginal:      "/1.jpg",
		URLDisplay:       "/1.jpg",
		URLThumbnail:     "/1.jpg",
		Caption:          "First",
	}
	photo2 := &models.Photo{
		FilenameOriginal: "2.jpg",
		URLOriginal:      "/2.jpg",
		URLDisplay:       "/2.jpg",
		URLThumbnail:     "/2.jpg",
		Caption:          "Second",
	}

	err = service.AddPhoto(album.ID, photo1)
	require.NoError(t, err)

	time.Sleep(10 * time.Millisecond) // Ensure different timestamps

	err = service.AddPhoto(album.ID, photo2)
	require.NoError(t, err)

	// Re-fetch
	updated, err := service.GetByID(album.ID)
	require.NoError(t, err)

	// Verify photos exist
	assert.Len(t, updated.Photos, 2)
	assert.Equal(t, "First", updated.Photos[0].Caption)
	assert.Equal(t, "Second", updated.Photos[1].Caption)
}

func TestAlbumService_ReorderPhotos(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	// Add three photos
	photo1 := &models.Photo{
		FilenameOriginal: "1.jpg",
		URLOriginal:      "/1.jpg",
		URLDisplay:       "/1.jpg",
		URLThumbnail:     "/1.jpg",
		Caption:          "First",
	}
	photo2 := &models.Photo{
		FilenameOriginal: "2.jpg",
		URLOriginal:      "/2.jpg",
		URLDisplay:       "/2.jpg",
		URLThumbnail:     "/2.jpg",
		Caption:          "Second",
	}
	photo3 := &models.Photo{
		FilenameOriginal: "3.jpg",
		URLOriginal:      "/3.jpg",
		URLDisplay:       "/3.jpg",
		URLThumbnail:     "/3.jpg",
		Caption:          "Third",
	}

	err = service.AddPhoto(album.ID, photo1)
	require.NoError(t, err)
	err = service.AddPhoto(album.ID, photo2)
	require.NoError(t, err)
	err = service.AddPhoto(album.ID, photo3)
	require.NoError(t, err)

	// Get the album to get photo IDs
	updated, err := service.GetByID(album.ID)
	require.NoError(t, err)
	require.Len(t, updated.Photos, 3)

	// Original order: photo1, photo2, photo3
	assert.Equal(t, "First", updated.Photos[0].Caption)
	assert.Equal(t, "Second", updated.Photos[1].Caption)
	assert.Equal(t, "Third", updated.Photos[2].Caption)

	// Store photo IDs
	photo1ID := updated.Photos[0].ID
	photo2ID := updated.Photos[1].ID
	photo3ID := updated.Photos[2].ID

	// Reorder: photo3, photo1, photo2
	err = service.ReorderPhotos(album.ID, []string{photo3ID, photo1ID, photo2ID})
	require.NoError(t, err)

	// Verify new order
	reordered, err := service.GetByID(album.ID)
	require.NoError(t, err)
	require.Len(t, reordered.Photos, 3)

	assert.Equal(t, "Third", reordered.Photos[0].Caption)
	assert.Equal(t, photo3ID, reordered.Photos[0].ID)
	assert.Equal(t, 1, reordered.Photos[0].Order)

	assert.Equal(t, "First", reordered.Photos[1].Caption)
	assert.Equal(t, photo1ID, reordered.Photos[1].ID)
	assert.Equal(t, 2, reordered.Photos[1].Order)

	assert.Equal(t, "Second", reordered.Photos[2].Caption)
	assert.Equal(t, photo2ID, reordered.Photos[2].ID)
	assert.Equal(t, 3, reordered.Photos[2].Order)
}

func TestAlbumService_ReorderPhotos_InvalidCount(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album with one photo
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	photo := &models.Photo{
		FilenameOriginal: "1.jpg",
		URLOriginal:      "/1.jpg",
		URLDisplay:       "/1.jpg",
		URLThumbnail:     "/1.jpg",
	}
	err = service.AddPhoto(album.ID, photo)
	require.NoError(t, err)

	// Try to reorder with wrong count
	err = service.ReorderPhotos(album.ID, []string{"fake-id-1", "fake-id-2"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "photo ID count does not match")
}

func TestAlbumService_ReorderPhotos_InvalidPhotoID(t *testing.T) {
	service, _ := setupAlbumService(t)

	// Create album with one photo
	album := &models.Album{Title: "Test Album", Visibility: "public"}
	err := service.Create(album)
	require.NoError(t, err)

	photo := &models.Photo{
		FilenameOriginal: "1.jpg",
		URLOriginal:      "/1.jpg",
		URLDisplay:       "/1.jpg",
		URLThumbnail:     "/1.jpg",
	}
	err = service.AddPhoto(album.ID, photo)
	require.NoError(t, err)

	// Try to reorder with invalid photo ID
	err = service.ReorderPhotos(album.ID, []string{"fake-photo-id"})
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found in album")
}
