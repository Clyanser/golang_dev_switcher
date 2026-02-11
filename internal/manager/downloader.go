package manager

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// Release represents a Go release
type Release struct {
	Version string `json:"version"`
	Stable  bool   `json:"stable"`
}

// FetchRemoteVersions fetches available Go versions from go.dev
func FetchRemoteVersions() ([]Release, error) {
	resp, err := http.Get("https://go.dev/dl/?mode=json&include=all")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	type ToolRelease struct {
		Version string `json:"version"`
		Stable  bool   `json:"stable"`
	}

	var tools []ToolRelease
	if err := json.NewDecoder(resp.Body).Decode(&tools); err != nil {
		return nil, err
	}

	var releases []Release
	for _, t := range tools {
		isStable := !strings.Contains(t.Version, "rc") && !strings.Contains(t.Version, "beta")
		releases = append(releases, Release{
			Version: t.Version,
			Stable:  isStable,
		})
	}
	return releases, nil
}

// DownloadVersion downloads and extracts the specified version
func (m *Manager) DownloadVersion(version string, onProgress func(int)) error {
	if strings.Contains(version, "..") || strings.Contains(version, "/") || strings.Contains(version, "\\") {
		return fmt.Errorf("invalid version name")
	}

	// Find the download URL for windows/amd64
	url := fmt.Sprintf("https://go.dev/dl/%s.windows-amd64.zip", version)

	// Create temp file
	tempFile := filepath.Join(os.TempDir(), version+".zip")
	out, err := os.Create(tempFile)
	if err != nil {
		return err
	}
	defer out.Close()

	// Download
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	total := resp.ContentLength
	if total <= 0 {
		// Try HEAD request
		headResp, err := http.Head(url)
		if err == nil {
			total = headResp.ContentLength
			headResp.Body.Close()
		}
	}

	// Fallback estimate: ~140MB
	if total <= 0 {
		total = 140 * 1024 * 1024
	}

	fmt.Printf("Downloading %s: ContentLength = %d\n", version, total)

	// Progress tracking
	counter := &WriteCounter{
		Total:      total,
		OnProgress: onProgress,
	}
	if _, err = io.Copy(out, io.TeeReader(resp.Body, counter)); err != nil {
		return err
	}

	// Extract
	dest := filepath.Join(m.SDKPath, version)
	os.RemoveAll(dest)
	return unzip(tempFile, dest)
}

// WriteCounter counts the number of bytes written to it.
type WriteCounter struct {
	Total        int64
	Current      int64
	LastProgress int
	OnProgress   func(int)
}

func (wc *WriteCounter) Write(p []byte) (int, error) {
	n := len(p)
	wc.Current += int64(n)

	if wc.Total > 0 && wc.OnProgress != nil {
		// Calculate percentage
		progress := int(float64(wc.Current) / float64(wc.Total) * 100)

		// Throttle: only update if percentage changed
		if progress > wc.LastProgress {
			wc.LastProgress = progress
			wc.OnProgress(progress)
		}
	}
	return n, nil
}

func unzip(src, dest string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fpath := filepath.Join(dest, f.Name)

		if !strings.HasPrefix(fpath, filepath.Clean(dest)+string(os.PathSeparator)) {
			return fmt.Errorf("illegal file path: %s", fpath)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(fpath, os.ModePerm)
			continue
		}

		if err = os.MkdirAll(filepath.Dir(fpath), os.ModePerm); err != nil {
			return err
		}

		outFile, err := os.OpenFile(fpath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		rc, err := f.Open()
		if err != nil {
			outFile.Close()
			return err
		}

		_, err = io.Copy(outFile, rc)

		outFile.Close()
		rc.Close()

		if err != nil {
			return err
		}
	}
	return nil
}
