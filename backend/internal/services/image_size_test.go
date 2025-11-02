package services

import (
	"mime/multipart"
	"net/textproto"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createMockFileHeader creates a mock multipart.FileHeader for testing.
func createMockFileHeader(filename string, size int64, content []byte) *multipart.FileHeader {
	header := &multipart.FileHeader{
		Filename: filename,
		Size:     size,
		Header:   make(textproto.MIMEHeader),
	}
	return header
}

func TestImageService_MaxImageSize_Default(t *testing.T) {
	tmpDir := t.TempDir()

	// Create image service with nil config (should use default 50MB)
	imageService, err := NewImageService(tmpDir, nil, nil)
	require.NoError(t, err, "NewImageService should succeed")

	// Create a file header that's larger than 50MB
	largeFileSize := int64(51 * 1024 * 1024) // 51MB
	fileHeader := createMockFileHeader("large.jpg", largeFileSize, nil)

	// Should reject file larger than default 50MB
	_, err = imageService.ProcessUpload(fileHeader)
	assert.Error(t, err, "Should reject file larger than 50MB")
	assert.Contains(t, err.Error(), "exceeds maximum allowed", "Error should mention exceeding limit")
	assert.Contains(t, err.Error(), "50MB", "Error should mention 50MB limit")
}

func TestImageService_MaxImageSize_Configured(t *testing.T) {
	tmpDir := t.TempDir()

	// Create config service with 10MB max image size
	configService := createTestConfigService(t, 80)
	config, err := configService.Get()
	require.NoError(t, err)
	config.Storage.MaxImageSizeMB = 10
	err = configService.Update(config)
	require.NoError(t, err)

	// Create image service with config
	imageService, err := NewImageService(tmpDir, configService, nil)
	require.NoError(t, err, "NewImageService should succeed")

	// Test file just under the limit (should pass size check but fail on content)
	smallFileSize := int64(9 * 1024 * 1024) // 9MB
	smallFile := createMockFileHeader("small.jpg", smallFileSize, nil)
	_, err = imageService.ProcessUpload(smallFile)
	// Will fail on reading file content, but should not fail on size check
	assert.NotContains(t, err.Error(), "exceeds maximum allowed", "9MB file should pass size check")

	// Test file over the configured limit
	largeFileSize := int64(11 * 1024 * 1024) // 11MB
	largeFile := createMockFileHeader("large.jpg", largeFileSize, nil)
	_, err = imageService.ProcessUpload(largeFile)
	assert.Error(t, err, "Should reject file larger than configured 10MB")
	assert.Contains(t, err.Error(), "exceeds maximum allowed", "Error should mention exceeding limit")
	assert.Contains(t, err.Error(), "10MB", "Error should mention 10MB limit")
}

func TestImageService_MaxImageSize_HardLimit(t *testing.T) {
	tmpDir := t.TempDir()

	// Create config service with very high max image size
	configService := createTestConfigService(t, 80)
	config, err := configService.Get()
	require.NoError(t, err)
	config.Storage.MaxImageSizeMB = 200 // Set to 200MB
	err = configService.Update(config)
	require.NoError(t, err)

	// Create image service with config
	imageService, err := NewImageService(tmpDir, configService, nil)
	require.NoError(t, err, "NewImageService should succeed")

	// Test file over the hard limit of 100MB
	hugeFileSize := int64(101 * 1024 * 1024) // 101MB
	hugeFile := createMockFileHeader("huge.jpg", hugeFileSize, nil)
	_, err = imageService.ProcessUpload(hugeFile)
	assert.Error(t, err, "Should reject file larger than hard limit of 100MB")
	assert.Contains(t, err.Error(), "absolute maximum", "Error should mention absolute maximum")
}

func TestImageService_MaxImageSize_EdgeCases(t *testing.T) {
	tmpDir := t.TempDir()

	// Create config service with 50MB max
	configService := createTestConfigService(t, 80)
	config, err := configService.Get()
	require.NoError(t, err)
	config.Storage.MaxImageSizeMB = 50
	err = configService.Update(config)
	require.NoError(t, err)

	imageService, err := NewImageService(tmpDir, configService, nil)
	require.NoError(t, err)

	// Test exactly at the limit (50MB exactly)
	exactSize := int64(50 * 1024 * 1024)
	exactFile := createMockFileHeader("exact.jpg", exactSize, nil)
	_, err = imageService.ProcessUpload(exactFile)
	// Should pass size check (will fail on content reading, but that's OK)
	assert.NotContains(t, err.Error(), "exceeds maximum allowed", "Exactly 50MB should pass")

	// Test 1 byte over the limit
	overSize := int64(50*1024*1024 + 1)
	overFile := createMockFileHeader("over.jpg", overSize, nil)
	_, err = imageService.ProcessUpload(overFile)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "exceeds maximum allowed", "50MB + 1 byte should fail")
}
