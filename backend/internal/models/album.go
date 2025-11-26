package models

import (
	"encoding/json"
	"errors"
	"time"
)

// Album represents a photo album.
type Album struct {
	ID             string     `json:"id"`
	Slug           string     `json:"slug"`
	Title          string     `json:"title"`
	Subtitle       string     `json:"subtitle,omitempty"`
	Description    string     `json:"description,omitempty"`
	CoverPhotoID   string     `json:"cover_photo_id,omitempty"`
	Visibility     string     `json:"visibility"` // public, unlisted, password_protected
	PasswordHash   string     `json:"password_hash,omitempty"`
	ExpirationDate *time.Time `json:"expiration_date,omitempty"`
	AllowDownloads bool       `json:"allow_downloads"`
	ShowExif       bool       `json:"show_exif"`
	Order          int        `json:"order"`
	ThemeOverride  string     `json:"theme_override,omitempty"` // system, light, dark
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	AlbumStartDate *time.Time `json:"date_of_album_start,omitempty"`
	AlbumEndDate   *time.Time `json:"date_of_album_end,omitempty"`
	Photos         []Photo    `json:"photos"`
}

// Photo represents a single photo in an album.
type Photo struct {
	ID                string    `json:"id"`
	FilenameOriginal  string    `json:"filename_original"`
	URLOriginal       string    `json:"url_original"`
	URLDisplay        string    `json:"url_display"`
	URLThumbnail      string    `json:"url_thumbnail"`
	Caption           string    `json:"caption,omitempty"`
	AltText           string    `json:"alt_text,omitempty"`
	Order             int       `json:"order"`
	Width             int       `json:"width"`
	Height            int       `json:"height"`
	FileSizeOriginal  int64     `json:"file_size_original"`
	FileSizeDisplay   int64     `json:"file_size_display"`
	FileSizeThumbnail int64     `json:"file_size_thumbnail"`
	EXIF              *EXIF     `json:"exif,omitempty"`
	UploadedAt        time.Time `json:"uploaded_at"`
}

// EXIF represents photo metadata.
type EXIF struct {
	Camera       string     `json:"camera,omitempty"`
	Lens         string     `json:"lens,omitempty"`
	ISO          int        `json:"iso,omitempty"`
	Aperture     string     `json:"aperture,omitempty"`
	ShutterSpeed string     `json:"shutter_speed,omitempty"`
	FocalLength  string     `json:"focal_length,omitempty"`
	DateTaken    *time.Time `json:"date_taken,omitempty"`
}

// AlbumCollection represents the root albums.json structure.
type AlbumCollection struct {
	Albums []Album `json:"albums"`
}

// Validate checks if the album has required fields.
func (a *Album) Validate() error {
	if a.Title == "" {
		return errors.New("album title is required")
	}
	if a.Slug == "" {
		return errors.New("album slug is required")
	}
	if a.Visibility != "public" && a.Visibility != "unlisted" && a.Visibility != "password_protected" {
		return errors.New("album visibility must be public, unlisted, or password_protected")
	}
	// Note: We don't validate password_hash here because it may be set via a separate API call
	// after album creation. The set-password endpoint handles password setting.
	return nil
}

// ToJSON converts album to JSON bytes.
func (a *Album) ToJSON() ([]byte, error) {
	return json.Marshal(a)
}

// FromJSON populates album from JSON bytes.
func (a *Album) FromJSON(data []byte) error {
	return json.Unmarshal(data, a)
}
