package main

import (
	"context"
	"fmt"
	"goswitch/internal/manager"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx     context.Context
	manager *manager.Manager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		manager: manager.NewManager(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ListVersions returns the installed Go versions
func (a *App) ListVersions() ([]manager.GoVersion, error) {
	return a.manager.ListLocalVersions()
}

// FetchRemoteVersions returns available Go versions from go.dev
func (a *App) FetchRemoteVersions() ([]manager.Release, error) {
	return manager.FetchRemoteVersions()
}

// SwitchVersion changes the active Go version
func (a *App) SwitchVersion(version string) string {
	err := a.manager.SwitchVersion(version)
	if err != nil {
		return fmt.Sprintf("Error: %s", err)
	}
	return "Success"
}

// InstallVersion downloads and installs a specific Go version
func (a *App) InstallVersion(version string) string {
	// Pass a progress callback
	err := a.manager.DownloadVersion(version, func(progress int) {
		runtime.EventsEmit(a.ctx, "download_progress", map[string]interface{}{
			"version":  version,
			"progress": progress,
		})
	})

	if err != nil {
		return fmt.Sprintf("Error: %s", err)
	}
	return "Success"
}

// UninstallVersion removes a Go version
func (a *App) UninstallVersion(version string) string {
	err := a.manager.UninstallVersion(version)
	if err != nil {
		return fmt.Sprintf("Error: %s", err)
	}
	return "Success"
}
