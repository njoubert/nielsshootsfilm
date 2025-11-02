package services

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"

	"github.com/davidbyttow/govips/v2/vips"
	"github.com/google/uuid"
	"github.com/njoubert/nielsshootsfilm/backend/internal"
	"github.com/njoubert/nielsshootsfilm/backend/internal/models"
	"github.com/rwcarlsen/goexif/exif"
)

// Image processing constants.
const (
	displayMaxSize       = 3840              // 4K display version
	thumbnailMaxSize     = 800               // Thumbnail size
	displayQuality       = 85                // Quality for display (JPEG/WebP)
	thumbnailQuality     = 80                // Quality for thumbnail (JPEG/WebP)
	minFreeSpace         = 500 * 1024 * 1024 // Minimum 500 MB free space required
	maxConcurrentVIPSOps = 4                 // Max concurrent VIPS operations (prevents CPU thrashing)
)

// VIPS configuration constants.
const (
	vipsMaxCacheMem   = 500 * 1024 * 1024 // 500 MB cache
	vipsMaxCacheFiles = 0                 // Don't cache files
	vipsMaxCacheSize  = 100               // Max 100 operations in cache
)

var allowedMimeTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
	"image/tiff": true,
	"image/heic": true,
	"image/heif": true,
}

// ImageService handles image upload and processing.
type ImageService struct {
	uploadDir     string
	configService *SiteConfigService
	processSem    chan struct{} // Semaphore to limit concurrent VIPS operations
	logger        *slog.Logger
}

// NewImageService creates a new image service.
func NewImageService(uploadDir string, configService *SiteConfigService, logger *slog.Logger) (*ImageService, error) {
	// Initialize vips with configuration optimized for concurrent operations
	// Use moderate concurrency per operation (2-4 threads) since we'll have multiple operations
	numCPU := runtime.NumCPU()
	vipsConcurrency := numCPU / 2 // Use half the CPUs per operation
	if vipsConcurrency < 1 {
		vipsConcurrency = 1
	}

	config := &vips.Config{
		ConcurrencyLevel: vipsConcurrency, // Threads per VIPS operation
		MaxCacheFiles:    vipsMaxCacheFiles,
		MaxCacheMem:      vipsMaxCacheMem,
		MaxCacheSize:     vipsMaxCacheSize,
		ReportLeaks:      true,
		CacheTrace:       false,
		CollectStats:     true,
	}
	vips.Startup(config)

	// Log VIPS configuration
	if logger != nil {
		logger.Info("vips initialized",
			slog.Int("cpu_count", numCPU),
			slog.Int("concurrency_per_operation", vipsConcurrency),
			slog.Int("max_concurrent_operations", maxConcurrentVIPSOps),
			slog.Int64("cache_mem_mb", vipsMaxCacheMem/(1024*1024)),
			slog.Int("cache_max_files", vipsMaxCacheFiles),
			slog.Int("cache_max_size", vipsMaxCacheSize),
		)
	}

	// Create upload directories
	dirs := []string{
		filepath.Join(uploadDir, "originals"),
		filepath.Join(uploadDir, "display"),
		filepath.Join(uploadDir, "thumbnails"),
	}

	for _, dir := range dirs {
		// #nosec G301 - 0755 is appropriate for upload directories
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create upload directory %s: %w", dir, err)
		}
	}

	return &ImageService{
		uploadDir:     uploadDir,
		configService: configService,
		processSem:    make(chan struct{}, maxConcurrentVIPSOps), // Limit concurrent VIPS operations
		logger:        logger,
	}, nil
}

// checkDiskSpace checks if there is enough free disk space for an upload
// It enforces both the configured max_disk_usage_percent and always reserves 5% of disk.
func (s *ImageService) checkDiskSpace(estimatedSize int64) error {
	var stat syscall.Statfs_t
	err := syscall.Statfs(s.uploadDir, &stat)
	if err != nil {
		return fmt.Errorf("failed to get filesystem stats: %w", err)
	}

	// Get total and available space
	// #nosec G115 - disk size conversions are safe for reasonable disk sizes
	totalSpace := int64(stat.Blocks) * int64(stat.Bsize)
	// #nosec G115 - disk size conversions are safe for reasonable disk sizes
	availableSpace := int64(stat.Bavail) * int64(stat.Bsize)
	currentUsagePercent := (float64(totalSpace-availableSpace) / float64(totalSpace)) * 100

	// Get max usage percent from config (default 80%)
	maxUsagePercent := 80
	if s.configService != nil {
		config, err := s.configService.Get()
		if err == nil && config.Storage.MaxDiskUsagePercent > 0 {
			maxUsagePercent = config.Storage.MaxDiskUsagePercent
		}
	}

	// Always reserve at least 5% of disk regardless of setting
	minReservePercent := 5
	effectiveMaxPercent := maxUsagePercent
	if effectiveMaxPercent > 100-minReservePercent {
		effectiveMaxPercent = 100 - minReservePercent
	}

	// Estimate total space needed (original + display + thumbnail, approximately 2x original)
	estimatedTotal := estimatedSize * 2

	// Calculate what usage percent would be after upload
	usedAfterUpload := totalSpace - availableSpace + estimatedTotal
	usagePercentAfterUpload := (float64(usedAfterUpload) / float64(totalSpace)) * 100

	// Check absolute minimum free space
	if availableSpace < minFreeSpace {
		return fmt.Errorf("insufficient disk space: %s available, minimum %s required",
			formatBytes(availableSpace), formatBytes(minFreeSpace))
	}

	// Check if current usage already exceeds limit
	if currentUsagePercent >= float64(effectiveMaxPercent) {
		return fmt.Errorf("disk usage is at %.1f%%, exceeding the %d%% limit",
			currentUsagePercent, effectiveMaxPercent)
	}

	// Check if upload would exceed the limit
	if usagePercentAfterUpload >= float64(effectiveMaxPercent) {
		return fmt.Errorf("upload would increase disk usage to %.1f%%, exceeding the %d%% limit (estimated %s needed)",
			usagePercentAfterUpload, effectiveMaxPercent, formatBytes(estimatedTotal))
	}

	return nil
}

// ProcessUpload processes an uploaded image file using libvips.
func (s *ImageService) ProcessUpload(fileHeader *multipart.FileHeader) (*models.Photo, error) {
	// Acquire semaphore to limit concurrent VIPS operations
	s.processSem <- struct{}{}
	defer func() { <-s.processSem }()

	// Validate file size against configured max (default 50MB)
	maxSizeMB := 50
	if s.configService != nil {
		config, err := s.configService.Get()
		if err == nil && config.Storage.MaxImageSizeMB > 0 {
			maxSizeMB = config.Storage.MaxImageSizeMB
		}
	}
	maxSizeBytes := int64(maxSizeMB) * 1024 * 1024
	if fileHeader.Size > maxSizeBytes {
		return nil, fmt.Errorf("file size %s exceeds maximum allowed %s (%dMB)", formatBytes(fileHeader.Size), formatBytes(maxSizeBytes), maxSizeMB)
	}

	// Also check hard limit for safety
	if fileHeader.Size > internal.MaxUploadFileSize {
		return nil, fmt.Errorf("file size %s exceeds absolute maximum %s", formatBytes(fileHeader.Size), formatBytes(internal.MaxUploadFileSize))
	}

	// Check disk space before processing
	if err := s.checkDiskSpace(fileHeader.Size); err != nil {
		return nil, err
	}

	// Open uploaded file
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open uploaded file: %w", err)
	}
	defer func() { _ = file.Close() }()

	// Detect content type
	buffer := make([]byte, 512)
	if _, err := file.Read(buffer); err != nil {
		return nil, fmt.Errorf("failed to read file header: %w", err)
	}

	contentType := detectContentType(buffer, fileHeader.Filename)
	if !allowedMimeTypes[contentType] {
		return nil, fmt.Errorf("unsupported file type: %s", contentType)
	}

	// Reset file pointer
	if _, err := file.Seek(0, 0); err != nil {
		return nil, fmt.Errorf("failed to reset file pointer: %w", err)
	}

	// Generate UUID for this photo
	photoID := uuid.New().String()

	// Read entire file into memory for vips processing
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	// Load image with vips to get dimensions
	img, err := vips.NewImageFromBuffer(fileBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image with vips: %w", err)
	}
	defer img.Close()

	width := img.Width()
	height := img.Height()

	// Determine original format from content type
	originalExt := ""
	switch contentType {
	case "image/jpeg":
		originalExt = ".jpg"
	case "image/png":
		originalExt = ".png"
	case "image/webp":
		originalExt = ".webp"
	case "image/gif":
		originalExt = ".gif"
	case "image/tiff":
		originalExt = ".tiff"
	default:
		originalExt = ".jpg"
	}

	// Save original
	originalFilename := photoID + originalExt
	originalPath := filepath.Join(s.uploadDir, "originals", originalFilename)

	if err := os.WriteFile(originalPath, fileBytes, 0600); err != nil {
		return nil, fmt.Errorf("failed to save original: %w", err)
	}

	originalSize := int64(len(fileBytes))

	// Generate display version (WebP)
	displayFilename := photoID + "_display.webp"
	displayPath := filepath.Join(s.uploadDir, "display", displayFilename)

	displaySize, err := s.generateResizedVersion(fileBytes, displayPath, displayMaxSize, displayQuality)
	if err != nil {
		// Clean up original
		_ = os.Remove(originalPath)
		return nil, fmt.Errorf("failed to generate display version: %w", err)
	}

	// Generate thumbnail (WebP)
	thumbnailFilename := photoID + "_thumbnail.webp"
	thumbnailPath := filepath.Join(s.uploadDir, "thumbnails", thumbnailFilename)

	thumbnailSize, err := s.generateResizedVersion(fileBytes, thumbnailPath, thumbnailMaxSize, thumbnailQuality)
	if err != nil {
		// Clean up original and display
		_ = os.Remove(originalPath)
		_ = os.Remove(displayPath)
		return nil, fmt.Errorf("failed to generate thumbnail: %w", err)
	}

	// Extract EXIF data (using original file bytes)
	exifData, err := s.extractEXIFFromBytes(fileBytes)
	if err != nil {
		// EXIF extraction is not critical, just log and continue
		exifData = nil
	}

	// Final disk space check after upload completes
	totalSize := originalSize + displaySize + thumbnailSize
	if err := s.checkDiskSpace(totalSize); err != nil {
		// Clean up all files
		_ = os.Remove(originalPath)
		_ = os.Remove(displayPath)
		_ = os.Remove(thumbnailPath)
		return nil, fmt.Errorf("insufficient disk space after upload: %w", err)
	}

	// Create photo object
	photo := &models.Photo{
		FilenameOriginal:  fileHeader.Filename,
		URLOriginal:       "/uploads/originals/" + originalFilename,
		URLDisplay:        "/uploads/display/" + displayFilename,
		URLThumbnail:      "/uploads/thumbnails/" + thumbnailFilename,
		Width:             width,
		Height:            height,
		FileSizeOriginal:  originalSize,
		FileSizeDisplay:   displaySize,
		FileSizeThumbnail: thumbnailSize,
		EXIF:              exifData,
	}

	return photo, nil
}

// generateResizedVersion generates a resized WebP version of an image using libvips.
func (s *ImageService) generateResizedVersion(imageBytes []byte, dstPath string, maxSize int, quality int) (int64, error) {
	// Load image with vips
	img, err := vips.NewImageFromBuffer(imageBytes)
	if err != nil {
		return 0, fmt.Errorf("failed to load image: %w", err)
	}
	defer img.Close()

	// Calculate scaling to fit within maxSize
	width := img.Width()
	height := img.Height()

	scale := 1.0
	if width > maxSize || height > maxSize {
		if width > height {
			scale = float64(maxSize) / float64(width)
		} else {
			scale = float64(maxSize) / float64(height)
		}
	}

	// Resize if needed
	if scale < 1.0 {
		if err := img.Resize(scale, vips.KernelLanczos3); err != nil {
			return 0, fmt.Errorf("failed to resize image: %w", err)
		}
	}

	// Export as WebP
	ep := vips.NewWebpExportParams()
	ep.Quality = quality
	ep.Lossless = false
	ep.StripMetadata = true

	imageData, _, err := img.ExportWebp(ep)
	if err != nil {
		return 0, fmt.Errorf("failed to export webp: %w", err)
	}

	// Write to file
	if err := os.WriteFile(dstPath, imageData, 0600); err != nil {
		return 0, fmt.Errorf("failed to write file: %w", err)
	}

	return int64(len(imageData)), nil
}

// extractEXIFFromBytes extracts EXIF data from image bytes.
func (s *ImageService) extractEXIFFromBytes(imageBytes []byte) (*models.EXIF, error) {
	return s.extractEXIF(strings.NewReader(string(imageBytes)))
}

// extractEXIF extracts EXIF data from an image file.
func (s *ImageService) extractEXIF(r io.Reader) (*models.EXIF, error) {
	x, err := exif.Decode(r)
	if err != nil {
		return nil, err
	}

	exifData := &models.EXIF{}

	// Camera make and model
	if make, err := x.Get(exif.Make); err == nil {
		if makeStr, err := make.StringVal(); err == nil {
			model := ""
			if modelTag, err := x.Get(exif.Model); err == nil {
				if modelStr, err := modelTag.StringVal(); err == nil {
					model = modelStr
				}
			}
			exifData.Camera = strings.TrimSpace(makeStr + " " + model)
		}
	}

	// Lens model
	if lens, err := x.Get(exif.LensModel); err == nil {
		if lensStr, err := lens.StringVal(); err == nil {
			exifData.Lens = lensStr
		}
	}

	// ISO
	if iso, err := x.Get(exif.ISOSpeedRatings); err == nil {
		if isoInt, err := iso.Int(0); err == nil {
			exifData.ISO = isoInt
		}
	}

	// Aperture
	if aperture, err := x.Get(exif.FNumber); err == nil {
		if apertureRat, err := aperture.Rat(0); err == nil {
			num, _ := apertureRat.Num().Float64()
			denom, _ := apertureRat.Denom().Float64()
			exifData.Aperture = fmt.Sprintf("f/%.1f", num/denom)
		}
	}

	// Shutter speed
	if shutter, err := x.Get(exif.ExposureTime); err == nil {
		if shutterRat, err := shutter.Rat(0); err == nil {
			num, _ := shutterRat.Num().Float64()
			denom, _ := shutterRat.Denom().Float64()
			if denom > num {
				exifData.ShutterSpeed = fmt.Sprintf("1/%d", int(denom/num))
			} else {
				exifData.ShutterSpeed = fmt.Sprintf("%.1fs", num/denom)
			}
		}
	}

	// Focal length
	if focal, err := x.Get(exif.FocalLength); err == nil {
		if focalRat, err := focal.Rat(0); err == nil {
			num, _ := focalRat.Num().Float64()
			denom, _ := focalRat.Denom().Float64()
			exifData.FocalLength = fmt.Sprintf("%.0fmm", num/denom)
		}
	}

	// Date taken
	if dateTime, err := x.DateTime(); err == nil {
		exifData.DateTaken = &dateTime
	}

	return exifData, nil
}

// DeletePhoto deletes all versions of a photo.
func (s *ImageService) DeletePhoto(photo *models.Photo) error {
	errors := []error{}

	// Extract filename from URL
	originalFilename := filepath.Base(photo.URLOriginal)
	displayFilename := filepath.Base(photo.URLDisplay)
	thumbnailFilename := filepath.Base(photo.URLThumbnail)

	// Delete original
	originalPath := filepath.Join(s.uploadDir, "originals", originalFilename)
	if err := os.Remove(originalPath); err != nil && !os.IsNotExist(err) {
		errors = append(errors, fmt.Errorf("failed to delete original: %w", err))
	}

	// Delete display version
	displayPath := filepath.Join(s.uploadDir, "display", displayFilename)
	if err := os.Remove(displayPath); err != nil && !os.IsNotExist(err) {
		errors = append(errors, fmt.Errorf("failed to delete display version: %w", err))
	}

	// Delete thumbnail
	thumbnailPath := filepath.Join(s.uploadDir, "thumbnails", thumbnailFilename)
	if err := os.Remove(thumbnailPath); err != nil && !os.IsNotExist(err) {
		errors = append(errors, fmt.Errorf("failed to delete thumbnail: %w", err))
	}

	if len(errors) > 0 {
		return fmt.Errorf("errors deleting photo: %v", errors)
	}

	return nil
}

// ValidateFilename checks for path traversal attacks.
func ValidateFilename(filename string) error {
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return errors.New("invalid filename: path traversal attempt detected")
	}
	return nil
}

// detectContentType detects the content type of an image file.
// Extends http.DetectContentType to support HEIC/HEIF formats.
func detectContentType(data []byte, filename string) string {
	// First try standard detection
	contentType := http.DetectContentType(data)

	// If it's not recognized and we have enough data, check for HEIC/HEIF
	if contentType == "application/octet-stream" && len(data) >= 12 {
		// HEIC/HEIF files are ISO Base Media File Format (similar to MP4)
		// They have 'ftyp' box at offset 4-8, followed by brand identifier
		if string(data[4:8]) == "ftyp" {
			brand := string(data[8:12])
			// Check for HEIC/HEIF brand codes
			if brand == "heic" || brand == "heix" || brand == "heim" ||
				brand == "heis" || brand == "hevc" || brand == "hevx" {
				return "image/heic"
			}
			if brand == "mif1" || brand == "msf1" {
				// These can be HEIF
				// Check file extension as fallback
				lowerFilename := strings.ToLower(filename)
				if strings.HasSuffix(lowerFilename, ".heif") {
					return "image/heif"
				}
				if strings.HasSuffix(lowerFilename, ".heic") {
					return "image/heic"
				}
			}
		}
	}

	return contentType
}

// formatBytes converts bytes to human-readable format.
func formatBytes(bytes int64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}
