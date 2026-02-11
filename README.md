# GoSwitch - Go 版本管理工具

**GoSwitch** 是一个基于 [Wails](https://wails.io) 和 React 构建的轻量级跨平台 Go 版本管理工具。它提供了一个现代化的图形界面，方便开发者在不同项目间快速切换 Go 版本，同时支持一键下载、安装和卸载。

## 功能特性

- **可视化版本管理**：清晰展示系统中已安装的所有 Go 版本（包括系统自带和 GoSwitch 管理的版本）。
- **一键切换**：快速切换当前系统的激活 Go 版本，自动更新 `GOROOT` 和 `Path` 环境变量。
    - **注意**：因修改系统环境变量，Windows 下需**以管理员身份运行**。
- **在线安装**：直接从官网获取最新 Go 版本列表并一键下载安装，支持断点续传与进度显示。
- **卸载清理**：轻松卸载不再使用的 Go 版本，释放磁盘空间。
- **现代 UI**：基于 React + TailwindCSS 打造的清爽界面，操作简单直观。

## 环境要求

- **Go**: 1.18+
- **Node.js**: 16+
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

## 开发指南

### 源码安装与运行

1. 克隆仓库：
    ```bash
    git clone https://github.com/your-username/goswitch.git
    cd goswitch
    ```

2. 安装前端依赖：
    ```bash
    cd frontend
    npm install
    # 或者使用 yarn / pnpm
    npm run dev  # 启动前端开发服务器
    cd ..
    ```

3. 启动开发模式（支持热重载）：
    ```bash
    wails dev
    ```

4. 构建生产版本：
    ```bash
    wails build
    ```
    构建完成后，可执行文件将生成在 `build/bin` 目录下。

## 使用说明

**重要提示：Windows 管理员权限**

GoSwitch 需要修改系统的环境变量 (`GOROOT` 和 `Path`) 才能生效。因此在 Windows 系统上，请务必**以管理员身份运行**生成的 `.exe` 文件。

1. 右键点击 `GoSwitch.exe`（或构建出的二进制文件）。
2. 选择“以管理员身份运行”。
3. 在应用界面中选择需要的 Go 版本进行切换或安装。

## 项目结构

- `main.go`: 应用程序入口。
- `app.go`: 后端应用逻辑与 Wails 绑定方法。
- `internal/manager`: 核心版本管理逻辑（注册表修改、文件操作等）。
- `frontend/`: React 前端应用代码。
    - `src/`: 页面源码。
    - `wailsjs/`: Wails 自动生成的 Go 方法绑定代码。

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。
