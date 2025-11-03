package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewFileService(t *testing.T) {
	tmpDir := t.TempDir()

	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)
	require.NotNil(t, fs)

	// Verify directories were created
	assert.DirExists(t, tmpDir)
	assert.DirExists(t, filepath.Join(tmpDir, ".backups"))
}

func TestFileService_WriteJSON(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	type TestData struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	data := TestData{Name: "test", Value: 42}

	// Write JSON
	err = fs.WriteJSON("test.json", &data)
	require.NoError(t, err)

	// Verify file exists
	filePath := filepath.Join(tmpDir, "test.json")
	assert.FileExists(t, filePath)

	// Verify content
	fileData, err := os.ReadFile(filePath) // #nosec G304 - test file in temp directory
	require.NoError(t, err)

	var readData TestData
	err = json.Unmarshal(fileData, &readData)
	require.NoError(t, err)
	assert.Equal(t, data, readData)
}

func TestFileService_ReadJSON(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	type TestData struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// Write data first
	original := TestData{Name: "test", Value: 42}
	err = fs.WriteJSON("test.json", &original)
	require.NoError(t, err)

	// Read data
	var readData TestData
	err = fs.ReadJSON("test.json", &readData)
	require.NoError(t, err)
	assert.Equal(t, original, readData)
}

func TestFileService_ReadJSON_FileNotFound(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	var data map[string]any
	err = fs.ReadJSON("nonexistent.json", &data)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read file")
}

func TestFileService_Backup(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	type TestData struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// Write initial data
	original := TestData{Name: "test", Value: 42}
	err = fs.WriteJSON("test.json", &original)
	require.NoError(t, err)

	// Update data (this should create a backup)
	updated := TestData{Name: "updated", Value: 100}
	err = fs.WriteJSON("test.json", &updated)
	require.NoError(t, err)

	// Check backup was created
	backupDir := filepath.Join(tmpDir, ".backups")
	files, err := os.ReadDir(backupDir)
	require.NoError(t, err)
	assert.NotEmpty(t, files, "Backup should have been created")
}

func TestFileService_Rollback(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	type TestData struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// Write initial data
	original := TestData{Name: "test", Value: 42}
	err = fs.WriteJSON("test.json", &original)
	require.NoError(t, err)

	// Update data (creates backup of original)
	updated := TestData{Name: "updated", Value: 100}
	err = fs.WriteJSON("test.json", &updated)
	require.NoError(t, err)

	// Verify updated data is current
	var current TestData
	err = fs.ReadJSON("test.json", &current)
	require.NoError(t, err)
	assert.Equal(t, updated, current)

	// Rollback to previous version
	err = fs.Rollback("test.json")
	require.NoError(t, err)

	// Verify rollback restored original
	var restored TestData
	err = fs.ReadJSON("test.json", &restored)
	require.NoError(t, err)
	assert.Equal(t, original, restored)
}

func TestFileService_Rollback_NoBackup(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	err = fs.Rollback("nonexistent.json")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no backups found")
}

func TestFileService_FileExists(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	// Non-existent file
	assert.False(t, fs.FileExists("nonexistent.json"))

	// Write a file
	data := map[string]string{"test": "value"}
	err = fs.WriteJSON("test.json", &data)
	require.NoError(t, err)

	// File should now exist
	assert.True(t, fs.FileExists("test.json"))
}

func TestFileService_ConcurrentWrites(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	type TestData struct {
		Value int `json:"value"`
	}

	// Perform concurrent writes
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func(val int) {
			data := TestData{Value: val}
			err := fs.WriteJSON("concurrent.json", &data)
			assert.NoError(t, err)
			done <- true
		}(i)
	}

	// Wait for all writes to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify file is readable and valid
	var result TestData
	err = fs.ReadJSON("concurrent.json", &result)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, result.Value, 0)
	assert.LessOrEqual(t, result.Value, 9)
}

func TestFileService_BackupCleanup(t *testing.T) {
	tmpDir := t.TempDir()
	fs, err := NewFileService(tmpDir)
	require.NoError(t, err)

	type TestData struct {
		Version int `json:"version"`
	}

	// Create 15 backups by writing 16 times
	for i := 0; i < 16; i++ {
		data := TestData{Version: i}
		err = fs.WriteJSON("test.json", &data)
		require.NoError(t, err)
	}

	// Check that only 10 backups are kept
	backupDir := filepath.Join(tmpDir, ".backups")
	files, err := os.ReadDir(backupDir)
	require.NoError(t, err)

	// Count .bak files
	bakCount := 0
	for _, file := range files {
		if filepath.Ext(file.Name()) == ".bak" {
			bakCount++
		}
	}

	assert.LessOrEqual(t, bakCount, 10, "Should keep at most 10 backups")
}
