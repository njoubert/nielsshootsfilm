package services

import (
	"fmt"
	"time"

	"github.com/njoubert/nielsshootsfilm/backend/internal/models"
)

const siteConfigFile = "site_config.json"

// SiteConfigService handles site configuration operations.
type SiteConfigService struct {
	fileService *FileService
}

// NewSiteConfigService creates a new site config service.
func NewSiteConfigService(fileService *FileService) *SiteConfigService {
	return &SiteConfigService{
		fileService: fileService,
	}
}

// Get returns the site configuration.
func (s *SiteConfigService) Get() (*models.SiteConfig, error) {
	var config models.SiteConfig

	if !s.fileService.FileExists(siteConfigFile) {
		// Return default config
		return s.getDefaultConfig(), nil
	}

	if err := s.fileService.ReadJSON(siteConfigFile, &config); err != nil {
		return nil, fmt.Errorf("failed to read site config: %w", err)
	}

	return &config, nil
}

// Update updates the site configuration.
func (s *SiteConfigService) Update(config *models.SiteConfig) error {
	config.LastUpdated = time.Now().UTC()

	if err := s.fileService.WriteJSON(siteConfigFile, config); err != nil {
		return fmt.Errorf("failed to write site config: %w", err)
	}

	return nil
}

// SetMainPortfolioAlbum sets the main portfolio album ID.
func (s *SiteConfigService) SetMainPortfolioAlbum(albumID string) error {
	config, err := s.Get()
	if err != nil {
		return err
	}

	config.Portfolio.MainAlbumID = albumID

	return s.Update(config)
}

// getDefaultConfig returns the default site configuration.
func (s *SiteConfigService) getDefaultConfig() *models.SiteConfig {
	return &models.SiteConfig{
		Version:     "1.0.0",
		LastUpdated: time.Now().UTC(),
		Site: models.SiteInfo{
			Title:    "My Photography Portfolio",
			Language: "en",
			Timezone: "America/Los_Angeles",
		},
		Owner:  models.OwnerInfo{},
		Social: models.SocialLinks{},
		Branding: models.BrandingConfig{
			PrimaryColor:   "#000000",
			SecondaryColor: "#666666",
			AccentColor:    "#ff6b6b",
			Theme: models.ThemeConfig{
				Mode: "system",
				Light: models.ThemeColorSet{
					Background:    "#ffffff",
					Surface:       "#f5f5f5",
					TextPrimary:   "#000000",
					TextSecondary: "#666666",
					Border:        "#e0e0e0",
				},
				Dark: models.ThemeColorSet{
					Background:    "#0a0a0a",
					Surface:       "#1a1a1a",
					TextPrimary:   "#ffffff",
					TextSecondary: "#999999",
					Border:        "#333333",
				},
			},
		},
		Portfolio: models.PortfolioConfig{
			ShowExifData:   true,
			EnableLightbox: true,
		},
		Navigation: models.NavigationConfig{
			ShowHome:   true,
			ShowAlbums: true,
		},
	}
}
