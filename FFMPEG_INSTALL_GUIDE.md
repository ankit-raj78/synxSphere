# 安装FFmpeg说明

## Windows下安装FFmpeg

### 方法1：使用Chocolatey（推荐）
```powershell
# 如果没有安装Chocolatey，先安装
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))

# 安装FFmpeg
choco install ffmpeg
```

### 方法2：手动安装
1. 访问 https://ffmpeg.org/download.html
2. 下载Windows版本
3. 解压到文件夹（如 C:\ffmpeg）
4. 将 C:\ffmpeg\bin 添加到系统PATH环境变量

### 方法3：使用winget
```powershell
winget install "FFmpeg (Essentials Build)"
```

## 安装后验证
```powershell
ffmpeg -version
```

## 使用Compose功能
1. 确保已上传至少2个音频文件
2. 在音乐房间中点击"Compose Tracks"按钮
3. 选择要合成的音频文件
4. 点击"Compose Tracks"按钮
5. 合成完成后，文件会保存在 uploads/ 文件夹中
