package manager

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows/registry"
)

type GoVersion struct {
	Version string `json:"version"`
	Path    string `json:"path"`
	Active  bool   `json:"active"`
}

type Manager struct {
	SDKPath string
}

func NewManager() *Manager {
	home, _ := os.UserHomeDir()
	sdkPath := filepath.Join(home, ".goswitch", "sdk")
	os.MkdirAll(sdkPath, 0755)
	return &Manager{SDKPath: sdkPath}
}

// ListLocalVersions scans installed Go versions
func (m *Manager) ListLocalVersions() ([]GoVersion, error) {
	var versions []GoVersion
	currentGoroot := strings.ToLower(filepath.Clean(os.Getenv("GOROOT")))

	// 1. Scan managed directory (~/.goswitch/sdk)
	entries, _ := os.ReadDir(m.SDKPath)
	for _, entry := range entries {
		if entry.IsDir() && strings.HasPrefix(entry.Name(), "go") {
			fullPath := filepath.Join(m.SDKPath, entry.Name())

			// Check if 'go' subdir exists (standard zip structure)
			goSubDir := filepath.Join(fullPath, "go")
			if info, err := os.Stat(goSubDir); err == nil && info.IsDir() {
				fullPath = goSubDir
			}

			isActive := strings.EqualFold(filepath.Clean(fullPath), currentGoroot)
			versions = append(versions, GoVersion{
				Version: entry.Name(),
				Path:    fullPath,
				Active:  isActive,
			})
		}
	}

	// 2. Scan standard system locations
	stdPaths := []string{`C:\Program Files\Go`, `C:\Go`}

	// Also check current GOROOT if it's not in SDK path
	if currentGoroot != "" && !strings.Contains(currentGoroot, ".goswitch") {
		stdPaths = append(stdPaths, currentGoroot)
	}

	seenPaths := make(map[string]bool)
	for _, v := range versions {
		seenPaths[strings.ToLower(filepath.Clean(v.Path))] = true
	}

	for _, p := range stdPaths {
		cleanP := strings.ToLower(filepath.Clean(p))
		if seenPaths[cleanP] {
			continue
		}

		if _, err := os.Stat(p); err == nil {
			// Try to detect version
			verName := "System"
			// Check VERSION file
			if content, err := os.ReadFile(filepath.Join(p, "VERSION")); err == nil {
				verName = strings.TrimSpace(string(content))
			} else {
				// Fallback: try to guess from folder name or path
				base := filepath.Base(p)
				if strings.HasPrefix(base, "go") {
					verName = base
				}
			}

			isActive := cleanP == currentGoroot
			versions = append(versions, GoVersion{
				Version: verName,
				Path:    p,
				Active:  isActive,
			})
			seenPaths[cleanP] = true
		}
	}

	return versions, nil
}

// SwitchVersion updates system environment variables
func (m *Manager) SwitchVersion(versionName string) error {
	// Check if it's a full path (System install) or version name (Managed install)
	targetPath := versionName

	// If it doesn't look like a path, assume it's in SDK folder
	if !filepath.IsAbs(versionName) {
		targetPath = filepath.Join(m.SDKPath, versionName)
	}

	// Check if 'go' subdir exists in the target path and use it if present
	goSubDir := filepath.Join(targetPath, "go")
	if info, err := os.Stat(goSubDir); err == nil && info.IsDir() {
		targetPath = goSubDir
	}

	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		return fmt.Errorf("version path not found: %s", targetPath)
	}

	// Open System Environment variables key (Requires Admin)
	k, err := registry.OpenKey(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Control\Session Manager\Environment`, registry.SET_VALUE|registry.QUERY_VALUE)
	if err != nil {
		return fmt.Errorf("failed to open system registry (Run as Administrator?): %v", err)
	}
	defer k.Close()

	if err := k.SetStringValue("GOROOT", targetPath); err != nil {
		return fmt.Errorf("failed to set GOROOT: %v", err)
	}

	path, _, err := k.GetStringValue("Path")
	if err != nil {
		return fmt.Errorf("failed to read Path: %v", err)
	}

	newPath := updatePath(path, targetPath)

	err = k.SetExpandStringValue("Path", newPath)
	if err != nil {
		return fmt.Errorf("failed to set Path: %v", err)
	}

	os.Setenv("GOROOT", targetPath)
	return nil
}

// UninstallVersion removes a Go version
func (m *Manager) UninstallVersion(versionName string) error {
	// Security check: only allow deleting from SDK path to prevent deleting system files
	// if versionName is absolute path, reject it?
	// The request is likely for managed versions.

	// If it's a full path, check if it's within SDKPath
	targetPath := versionName
	if !filepath.IsAbs(versionName) {
		targetPath = filepath.Join(m.SDKPath, versionName)
	}

	if !strings.HasPrefix(targetPath, m.SDKPath) {
		return fmt.Errorf("can only uninstall managed versions in %s", m.SDKPath)
	}

	return os.RemoveAll(targetPath)
}

func updatePath(currentPath, newGoRoot string) string {
	parts := strings.Split(currentPath, ";")
	var newParts []string

	binPath := filepath.Join(newGoRoot, "bin")
	newParts = append(newParts, binPath)

	for _, p := range parts {
		if p == "" {
			continue
		}
		lowerP := strings.ToLower(p)
		// Remove old Go bin paths
		if strings.Contains(lowerP, "\\go\\bin") || strings.Contains(lowerP, "go/bin") {
			continue
		}
		if strings.Contains(lowerP, ".goswitch\\sdk") {
			continue
		}
		newParts = append(newParts, p)
	}

	return strings.Join(newParts, ";")
}
