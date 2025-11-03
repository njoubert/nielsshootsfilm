package models

import (
	"encoding/json"
	"testing"
	"time"
)

// TestAlbumValidation tests the album validation rules.
func TestAlbumValidation(t *testing.T) {
	tests := []struct {
		name    string
		album   Album
		wantErr bool
		errMsg  string
	}{
		{
			name: "valid album with public visibility",
			album: Album{
				Title:      "Test Album",
				Slug:       "test-album",
				Visibility: "public",
			},
			wantErr: false,
		},
		{
			name: "valid album with unlisted visibility",
			album: Album{
				Title:      "Test Album",
				Slug:       "test-album",
				Visibility: "unlisted",
			},
			wantErr: false,
		},
		{
			name: "valid album with password_protected visibility and hash",
			album: Album{
				Title:        "Test Album",
				Slug:         "test-album",
				Visibility:   "password_protected",
				PasswordHash: "$2a$10$abcdefg",
			},
			wantErr: false,
		},
		{
			name: "missing title",
			album: Album{
				Slug:       "test-album",
				Visibility: "public",
			},
			wantErr: true,
			errMsg:  "album title is required",
		},
		{
			name: "missing slug",
			album: Album{
				Title:      "Test Album",
				Visibility: "public",
			},
			wantErr: true,
			errMsg:  "album slug is required",
		},
		{
			name: "invalid visibility",
			album: Album{
				Title:      "Test Album",
				Slug:       "test-album",
				Visibility: "invalid",
			},
			wantErr: true,
			errMsg:  "album visibility must be public, unlisted, or password_protected",
		},
		{
			name: "empty visibility",
			album: Album{
				Title:      "Test Album",
				Slug:       "test-album",
				Visibility: "",
			},
			wantErr: true,
			errMsg:  "album visibility must be public, unlisted, or password_protected",
		},
		// Note: We no longer validate password_hash during album validation
		// because it can be set via a separate API call after creation
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.album.Validate()
			if (err != nil) != tt.wantErr {
				t.Errorf("Album.Validate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if err != nil && err.Error() != tt.errMsg {
				t.Errorf("Album.Validate() error message = %q, want %q", err.Error(), tt.errMsg)
			}
		})
	}
}

// TestAlbumJSONSerialization tests that albums can be serialized/deserialized.
func TestAlbumJSONSerialization(t *testing.T) {
	now := time.Now().UTC()

	original := Album{
		ID:             "test-id",
		Slug:           "test-slug",
		Title:          "Test Album",
		Subtitle:       "Test Subtitle",
		Description:    "Test Description",
		CoverPhotoID:   "photo-1",
		Visibility:     "public",
		AllowDownloads: true,
		Order:          1,
		CreatedAt:      now,
		UpdatedAt:      now,
		Photos:         []Photo{},
	}

	// Marshal to JSON
	data, err := json.Marshal(&original)
	if err != nil {
		t.Fatalf("Failed to marshal album: %v", err)
	}

	// Unmarshal back
	var decoded Album
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Failed to unmarshal album: %v", err)
	}

	// Verify fields
	if decoded.ID != original.ID {
		t.Errorf("ID = %q, want %q", decoded.ID, original.ID)
	}
	if decoded.Visibility != original.Visibility {
		t.Errorf("Visibility = %q, want %q", decoded.Visibility, original.Visibility)
	}
	if decoded.AllowDownloads != original.AllowDownloads {
		t.Errorf("AllowDownloads = %v, want %v", decoded.AllowDownloads, original.AllowDownloads)
	}
}

// TestAlbumJSONFields tests that JSON field names match expectations.
func TestAlbumJSONFields(t *testing.T) {
	album := Album{
		ID:             "test-id",
		Slug:           "test-slug",
		Title:          "Test",
		Visibility:     "public",
		AllowDownloads: true,
		Order:          0,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		Photos:         []Photo{},
	}

	data, err := json.Marshal(&album)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	// Parse as generic map to check field names
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	// Verify snake_case field names match TypeScript/JSON schema
	expectedFields := []string{
		"id",
		"slug",
		"title",
		"visibility",
		"allow_downloads", // snake_case
		"order",
		"created_at", // snake_case
		"updated_at", // snake_case
		"photos",
	}

	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("Missing expected field: %s", field)
		}
	}

	// Verify allow_downloads is boolean
	if _, ok := m["allow_downloads"].(bool); !ok {
		t.Errorf("allow_downloads should be boolean, got %T", m["allow_downloads"])
	}
}

// TestAlbumWithEmptyVisibility tests edge case of empty visibility.
func TestAlbumWithEmptyVisibility(t *testing.T) {
	jsonData := []byte(`{
		"id": "test",
		"slug": "test",
		"title": "Test Album",
		"visibility": "",
		"allow_downloads": false,
		"order": 0,
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"photos": []
	}`)

	var album Album
	if err := json.Unmarshal(jsonData, &album); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	// Validation should fail
	err := album.Validate()
	if err == nil {
		t.Error("Expected validation error for empty visibility, got nil")
	}
	if err != nil && err.Error() != "album visibility must be public, unlisted, or password_protected" {
		t.Errorf("Wrong error message: %q", err.Error())
	}
}

// TestAlbumWithMissingVisibility tests edge case of missing visibility field.
func TestAlbumWithMissingVisibility(t *testing.T) {
	jsonData := []byte(`{
		"id": "test",
		"slug": "test",
		"title": "Test Album",
		"allow_downloads": false,
		"order": 0,
		"created_at": "2025-01-01T00:00:00Z",
		"updated_at": "2025-01-01T00:00:00Z",
		"photos": []
	}`)

	var album Album
	if err := json.Unmarshal(jsonData, &album); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	// Visibility should be empty string (Go zero value)
	if album.Visibility != "" {
		t.Errorf("Expected empty visibility, got %q", album.Visibility)
	}

	// Validation should fail
	err := album.Validate()
	if err == nil {
		t.Error("Expected validation error for missing visibility, got nil")
	}
}

// TestPhotoJSONFields tests that Photo JSON field names match expectations.
func TestPhotoJSONFields(t *testing.T) {
	photo := Photo{
		ID:                "photo-1",
		FilenameOriginal:  "test.jpg",
		URLOriginal:       "/originals/test.jpg",
		URLDisplay:        "/display/test.jpg",
		URLThumbnail:      "/thumbnails/test.jpg",
		Order:             0,
		Width:             1920,
		Height:            1080,
		FileSizeOriginal:  1000000,
		FileSizeDisplay:   500000,
		FileSizeThumbnail: 50000,
		UploadedAt:        time.Now(),
	}

	data, err := json.Marshal(&photo)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		t.Fatalf("Failed to unmarshal: %v", err)
	}

	// Verify snake_case field names
	expectedFields := []string{
		"id",
		"filename_original", // snake_case
		"url_original",      // snake_case
		"url_display",       // snake_case
		"url_thumbnail",     // snake_case
		"order",
		"width",
		"height",
		"file_size_original",  // snake_case
		"file_size_display",   // snake_case
		"file_size_thumbnail", // snake_case
		"uploaded_at",         // snake_case
	}

	for _, field := range expectedFields {
		if _, ok := m[field]; !ok {
			t.Errorf("Missing expected field: %s", field)
		}
	}
}
