package models

import (
	"encoding/json"
	"errors"
	"time"
)

// SiteConfig represents the complete site configuration.
type SiteConfig struct {
	Version     string           `json:"version"`
	LastUpdated time.Time        `json:"last_updated"`
	Site        SiteInfo         `json:"site"`
	Owner       OwnerInfo        `json:"owner"`
	Social      SocialLinks      `json:"social"`
	Branding    BrandingConfig   `json:"branding"`
	Portfolio   PortfolioConfig  `json:"portfolio"`
	Navigation  NavigationConfig `json:"navigation"`
	Storage     StorageConfig    `json:"storage"`
}

// SiteInfo contains basic site information.
type SiteInfo struct {
	Title       string `json:"title"`
	Tagline     string `json:"tagline,omitempty"`
	Description string `json:"description,omitempty"`
	Language    string `json:"language"`
	Timezone    string `json:"timezone"`
}

// OwnerInfo contains photographer/owner information.
type OwnerInfo struct {
	Name     string `json:"name,omitempty"`
	Bio      string `json:"bio,omitempty"`
	Email    string `json:"email,omitempty"`
	Phone    string `json:"phone,omitempty"`
	Location string `json:"location,omitempty"`
}

// SocialLinks contains social media links.
type SocialLinks struct {
	Instagram   string       `json:"instagram,omitempty"`
	Facebook    string       `json:"facebook,omitempty"`
	Twitter     string       `json:"twitter,omitempty"`
	LinkedIn    string       `json:"linkedin,omitempty"`
	YouTube     string       `json:"youtube,omitempty"`
	Pinterest   string       `json:"pinterest,omitempty"`
	TikTok      string       `json:"tiktok,omitempty"`
	CustomLinks []CustomLink `json:"custom_links,omitempty"`
}

// CustomLink represents a custom social/external link.
type CustomLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
	Order int    `json:"order,omitempty"`
}

// BrandingConfig contains visual branding settings.
type BrandingConfig struct {
	LogoURL        string      `json:"logo_url,omitempty"`
	FaviconURL     string      `json:"favicon_url,omitempty"`
	PrimaryColor   string      `json:"primary_color"`
	SecondaryColor string      `json:"secondary_color"`
	AccentColor    string      `json:"accent_color"`
	FontHeading    string      `json:"font_heading,omitempty"`
	FontBody       string      `json:"font_body,omitempty"`
	CustomCSSURL   string      `json:"custom_css_url,omitempty"`
	Theme          ThemeConfig `json:"theme"`
}

// ThemeConfig contains light/dark theme settings.
type ThemeConfig struct {
	Mode  string        `json:"mode"` // system, light, dark
	Light ThemeColorSet `json:"light"`
	Dark  ThemeColorSet `json:"dark"`
}

// ThemeColorSet defines colors for a theme variant.
type ThemeColorSet struct {
	Background    string `json:"background"`
	Surface       string `json:"surface"`
	TextPrimary   string `json:"text_primary"`
	TextSecondary string `json:"text_secondary"`
	Border        string `json:"border"`
}

// PortfolioConfig contains portfolio display settings.
type PortfolioConfig struct {
	MainAlbumID    string `json:"main_album_id,omitempty"`
	ShowExifData   bool   `json:"show_exif_data"`
	DefaultLayout  string `json:"default_photo_layout,omitempty"`
	EnableLightbox bool   `json:"enable_lightbox"`
	ShowPhotoCount bool   `json:"show_photo_count,omitempty"`
}

// NavigationConfig controls nav menu visibility.
type NavigationConfig struct {
	ShowHome   bool `json:"show_home"`
	ShowAlbums bool `json:"show_albums"`
}

// StorageConfig contains storage and disk usage settings.
type StorageConfig struct {
	MaxDiskUsagePercent int `json:"max_disk_usage_percent"` // Maximum disk usage percentage (default 80)
	MaxImageSizeMB      int `json:"max_image_size_mb"`      // Maximum individual image size in MB (default 50)
}

// Validate checks if the site config has required fields.
func (sc *SiteConfig) Validate() error {
	if sc.Site.Title == "" {
		return errors.New("site title is required")
	}
	if sc.Site.Language == "" {
		return errors.New("site language is required")
	}
	return nil
}

// ToJSON converts site config to JSON bytes.
func (sc *SiteConfig) ToJSON() ([]byte, error) {
	return json.Marshal(sc)
}

// FromJSON populates site config from JSON bytes.
func (sc *SiteConfig) FromJSON(data []byte) error {
	return json.Unmarshal(data, sc)
}
