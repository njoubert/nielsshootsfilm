package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// FileService provides atomic file operations with locking and backups.
type FileService struct {
	dataDir    string
	backupDir  string
	fileLocks  map[string]*sync.RWMutex
	locksGuard sync.Mutex
}

// NewFileService creates a new file service.
func NewFileService(dataDir string) (*FileService, error) {
	backupDir := filepath.Join(dataDir, ".backups")

	// Create data directory if it doesn't exist
	// #nosec G301 - 0755 is appropriate for data directory
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	// Create backup directory if it doesn't exist
	// #nosec G301 - 0755 is appropriate for backup directory
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create backup directory: %w", err)
	}

	return &FileService{
		dataDir:   dataDir,
		backupDir: backupDir,
		fileLocks: make(map[string]*sync.RWMutex),
	}, nil
}

// getFileLock gets or creates a mutex for a specific file.
func (fs *FileService) getFileLock(filename string) *sync.RWMutex {
	fs.locksGuard.Lock()
	defer fs.locksGuard.Unlock()

	if lock, exists := fs.fileLocks[filename]; exists {
		return lock
	}

	lock := &sync.RWMutex{}
	fs.fileLocks[filename] = lock
	return lock
}

// ReadJSON reads and unmarshals JSON from a file.
func (fs *FileService) ReadJSON(filename string, v any) error {
	lock := fs.getFileLock(filename)
	lock.RLock()
	defer lock.RUnlock()

	filePath := filepath.Join(fs.dataDir, filename)

	// #nosec G304 - File path is from controlled data directory
	data, err := os.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read file %s: %w", filename, err)
	}

	if err := json.Unmarshal(data, v); err != nil {
		return fmt.Errorf("failed to unmarshal JSON from %s: %w", filename, err)
	}

	return nil
}

// WriteJSON marshals and writes JSON to a file atomically with backup.
func (fs *FileService) WriteJSON(filename string, v any) error {
	lock := fs.getFileLock(filename)
	lock.Lock()
	defer lock.Unlock()

	filePath := filepath.Join(fs.dataDir, filename)

	// Marshal JSON with indentation
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	// Create backup if file exists
	if _, err := os.Stat(filePath); err == nil {
		if err := fs.createBackup(filename); err != nil {
			return fmt.Errorf("failed to create backup: %w", err)
		}
	}

	// Write to temporary file first
	tmpPath := filePath + ".tmp"
	// #nosec G306 - 0644 is appropriate for JSON data files
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write temporary file: %w", err)
	}

	// Atomic rename
	if err := os.Rename(tmpPath, filePath); err != nil {
		// Clean up temp file
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to rename temporary file: %w", err)
	}

	return nil
}

// createBackup creates a timestamped backup of a file.
func (fs *FileService) createBackup(filename string) error {
	filePath := filepath.Join(fs.dataDir, filename)

	// #nosec G304 - File path is from controlled data directory
	data, err := os.ReadFile(filePath)
	if err != nil {
		return err
	}

	timestamp := time.Now().Format("20060102-150405")
	backupName := fmt.Sprintf("%s.%s.bak", filename, timestamp)
	backupPath := filepath.Join(fs.backupDir, backupName)

	// #nosec G306 - 0644 is appropriate for backup files
	if err := os.WriteFile(backupPath, data, 0644); err != nil {
		return err
	} // Clean up old backups (keep last 10 per file)
	fs.cleanupOldBackups(filename, 10)

	return nil
}

// cleanupOldBackups removes old backup files, keeping only the most recent n.
func (fs *FileService) cleanupOldBackups(filename string, keepCount int) {
	pattern := filepath.Join(fs.backupDir, filename+"*.bak")
	backups, err := filepath.Glob(pattern)
	if err != nil || len(backups) <= keepCount {
		return
	}

	// Sort backups by modification time (oldest first)
	type backupInfo struct {
		path    string
		modTime time.Time
	}

	var backupInfos []backupInfo
	for _, backup := range backups {
		info, err := os.Stat(backup)
		if err != nil {
			continue
		}
		backupInfos = append(backupInfos, backupInfo{
			path:    backup,
			modTime: info.ModTime(),
		})
	}

	// Remove oldest backups
	removeCount := len(backupInfos) - keepCount
	for i := 0; i < removeCount; i++ {
		_ = os.Remove(backupInfos[i].path)
	}
}

// Rollback restores the most recent backup of a file.
func (fs *FileService) Rollback(filename string) error {
	lock := fs.getFileLock(filename)
	lock.Lock()
	defer lock.Unlock()

	pattern := filepath.Join(fs.backupDir, filename+"*.bak")
	backups, err := filepath.Glob(pattern)
	if err != nil {
		return fmt.Errorf("failed to find backups: %w", err)
	}

	if len(backups) == 0 {
		return errors.New("no backups found")
	}

	// Find most recent backup
	var mostRecent string
	var mostRecentTime time.Time

	for _, backup := range backups {
		info, err := os.Stat(backup)
		if err != nil {
			continue
		}
		if mostRecent == "" || info.ModTime().After(mostRecentTime) {
			mostRecent = backup
			mostRecentTime = info.ModTime()
		}
	}

	if mostRecent == "" {
		return errors.New("no valid backups found")
	}

	// Read backup
	// #nosec G304 - File path is from controlled backup directory
	data, err := os.ReadFile(mostRecent)
	if err != nil {
		return fmt.Errorf("failed to read backup: %w", err)
	}

	// Write to original file
	filePath := filepath.Join(fs.dataDir, filename)
	// #nosec G306 - 0644 is appropriate for JSON data files
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to restore backup: %w", err)
	}

	return nil
}

// FileExists checks if a file exists in the data directory.
func (fs *FileService) FileExists(filename string) bool {
	filePath := filepath.Join(fs.dataDir, filename)
	_, err := os.Stat(filePath)
	return err == nil
}
