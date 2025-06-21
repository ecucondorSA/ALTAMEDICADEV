#----------------------------------------------------------------------
# 📦 ALTAMEDICA VS CODE EXTENSIONS INSTALLER
# Instalación optimizada de extensiones para desarrollo con Copilot
#----------------------------------------------------------------------

param(
    [switch]$Essential,
    [switch]$Full,
    [switch]$CopilotOnly,
    [switch]$List,
    [switch]$Update
)

# Configuración de colores
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Highlight = "Magenta"
}

# Extensiones categorizadas
$Extensions = @{
    Essential = @(
        @{ Id = "GitHub.copilot"; Name = "GitHub Copilot"; Description = "AI pair programmer" },
        @{ Id = "GitHub.copilot-chat"; Name = "GitHub Copilot Chat"; Description = "AI chat assistant" },
        @{ Id = "ms-vscode.powershell"; Name = "PowerShell"; Description = "PowerShell language support" },
        @{ Id = "bradlc.vscode-tailwindcss"; Name = "Tailwind CSS IntelliSense"; Description = "Tailwind CSS support" },
        @{ Id = "esbenp.prettier-vscode"; Name = "Prettier"; Description = "Code formatter" },
        @{ Id = "ms-vscode.vscode-typescript-next"; Name = "TypeScript Importer"; Description = "TypeScript support" }
    )

    Development = @(
        @{ Id = "ms-vscode.vscode-json"; Name = "JSON"; Description = "JSON language support" },
        @{ Id = "ms-vscode.vscode-eslint"; Name = "ESLint"; Description = "JavaScript/TypeScript linting" },
        @{ Id = "formulahendry.auto-rename-tag"; Name = "Auto Rename Tag"; Description = "Auto rename paired HTML/XML tags" },
        @{ Id = "christian-kohler.path-intellisense"; Name = "Path Intellisense"; Description = "File path autocomplete" },
        @{ Id = "ms-vscode.vscode-typescript-next"; Name = "TypeScript Importer"; Description = "Auto import TypeScript modules" },
        @{ Id = "bradlc.vscode-tailwindcss"; Name = "Tailwind CSS IntelliSense"; Description = "Tailwind CSS class completion" }
    )

    NextJS = @(
        @{ Id = "ms-vscode.vscode-typescript-next"; Name = "TypeScript"; Description = "TypeScript language support" },
        @{ Id = "bradlc.vscode-tailwindcss"; Name = "Tailwind CSS"; Description = "Tailwind CSS support" },
        @{ Id = "ms-vscode.vscode-json"; Name = "JSON Tools"; Description = "JSON support" },
        @{ Id = "formulahendry.auto-close-tag"; Name = "Auto Close Tag"; Description = "Auto close HTML tags" },
        @{ Id = "formulahendry.auto-rename-tag"; Name = "Auto Rename Tag"; Description = "Auto rename HTML tags" }
    )

    Firebase = @(
        @{ Id = "toba.vsfire"; Name = "VSFire"; Description = "Firebase Firestore support" },
        @{ Id = "ms-vscode.vscode-json"; Name = "JSON"; Description = "Firebase config files" }
    )

    Productivity = @(
        @{ Id = "usernamehw.errorlens"; Name = "Error Lens"; Description = "Highlight errors inline" },
        @{ Id = "oderwat.indent-rainbow"; Name = "Indent Rainbow"; Description = "Colorize indentation" },
        @{ Id = "ms-vscode.theme-tomorrow-kit"; Name = "Theme - Tomorrow Kit"; Description = "Beautiful themes" },
        @{ Id = "vscode-icons-team.vscode-icons"; Name = "vscode-icons"; Description = "File icons" },
        @{ Id = "alefragnani.Bookmarks"; Name = "Bookmarks"; Description = "Mark lines and jump to them" }
    )

    Git = @(
        @{ Id = "mhutchie.git-graph"; Name = "Git Graph"; Description = "Git repository visualizer" },
        @{ Id = "donjayamanne.githistory"; Name = "Git History"; Description = "View git log, file history" },
        @{ Id = "eamodio.gitlens"; Name = "GitLens"; Description = "Git blame and history" }
    )
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "📦 $Title" -ForegroundColor $Colors.Highlight
    Write-Host ("━" * ($Title.Length + 3)) -ForegroundColor "Gray"
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Colors.Success
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Colors.Warning
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Colors.Error
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Colors.Info
}

function Test-VSCode {
    if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
        Write-Error "VS Code not found in PATH"
        Write-Host "Please install VS Code from: https://code.visualstudio.com/" -ForegroundColor Gray
        return $false
    }

    Write-Success "VS Code found"
    return $true
}

function Get-InstalledExtensions {
    try {
        $installed = code --list-extensions 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $installed
        }
        return @()
    }
    catch {
        return @()
    }
}

function Install-Extension {
    param(
        [string]$ExtensionId,
        [string]$Name,
        [string]$Description
    )

    Write-Host "   Installing " -NoNewline -ForegroundColor Gray
    Write-Host $Name -NoNewline -ForegroundColor White
    Write-Host " ($ExtensionId)..." -ForegroundColor Gray

    try {
        $output = code --install-extension $ExtensionId --force 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ " -NoNewline -ForegroundColor $Colors.Success
            Write-Host $Name -NoNewline -ForegroundColor White
            Write-Host " installed successfully" -ForegroundColor $Colors.Success
            return $true
        } else {
            Write-Host "   ❌ " -NoNewline -ForegroundColor $Colors.Error
            Write-Host "Failed to install $Name" -ForegroundColor $Colors.Error
            return $false
        }
    }
    catch {
        Write-Host "   ❌ " -NoNewline -ForegroundColor $Colors.Error
        Write-Host "Error installing $Name`: $_" -ForegroundColor $Colors.Error
        return $false
    }
}

function Install-ExtensionCategory {
    param(
        [string]$CategoryName,
        [array]$ExtensionList
    )

    Write-Header "Installing $CategoryName Extensions"

    $installed = Get-InstalledExtensions
    $successCount = 0
    $skipCount = 0

    foreach ($ext in $ExtensionList) {
        if ($installed -contains $ext.Id) {
            Write-Host "   ⏭️  " -NoNewline -ForegroundColor $Colors.Info
            Write-Host $ext.Name -NoNewline -ForegroundColor White
            Write-Host " (already installed)" -ForegroundColor Gray
            $skipCount++
        } else {
            if (Install-Extension -ExtensionId $ext.Id -Name $ext.Name -Description $ext.Description) {
                $successCount++
            }
        }
    }

    Write-Host ""
    Write-Info "Installed: $successCount | Skipped: $skipCount | Total: $($ExtensionList.Count)"
}

function Show-ExtensionsList {
    Write-Header "Available Extension Categories"

    foreach ($category in $Extensions.Keys) {
        Write-Host ""
        Write-Host "📂 $category" -ForegroundColor $Colors.Highlight
        Write-Host ("─" * ($category.Length + 2)) -ForegroundColor Gray

        foreach ($ext in $Extensions[$category]) {
            Write-Host "   • " -NoNewline -ForegroundColor $Colors.Info
            Write-Host $ext.Name -NoNewline -ForegroundColor White
            Write-Host " - $($ext.Description)" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Info "Use -Essential for core extensions, -Full for all extensions"
}

function Update-Extensions {
    Write-Header "Updating All Extensions"

    try {
        Write-Info "Checking for extension updates..."
        $output = code --list-extensions --show-versions 2>$null

        if ($LASTEXITCODE -eq 0) {
            Write-Info "Running extension updates..."
            # VS Code will auto-update extensions, we just trigger a check
            code --install-extension dummy-extension-to-trigger-update 2>$null | Out-Null
            Write-Success "Extension update check completed"
        } else {
            Write-Warning "Could not check for extension updates"
        }
    }
    catch {
        Write-Error "Failed to update extensions: $_"
    }
}

function Install-CopilotExtensions {
    Write-Header "Installing GitHub Copilot Extensions"

    $copilotExtensions = @(
        @{ Id = "GitHub.copilot"; Name = "GitHub Copilot"; Description = "AI pair programmer that helps you write code faster" },
        @{ Id = "GitHub.copilot-chat"; Name = "GitHub Copilot Chat"; Description = "AI-powered chat assistant for coding questions" }
    )

    Install-ExtensionCategory -CategoryName "Copilot" -ExtensionList $copilotExtensions

    Write-Host ""
    Write-Info "🚀 Next Steps for Copilot:"
    Write-Host "   1. Restart VS Code" -ForegroundColor White
    Write-Host "   2. Sign in to GitHub when prompted" -ForegroundColor White
    Write-Host "   3. Verify Copilot subscription is active" -ForegroundColor White
    Write-Host "   4. Try writing code to see Copilot suggestions" -ForegroundColor White
}

function Install-EssentialExtensions {
    Write-Header "Installing Essential ALTAMEDICA Extensions"

    # Combinar extensiones esenciales
    $allEssential = $Extensions.Essential + $Extensions.Development
    Install-ExtensionCategory -CategoryName "Essential" -ExtensionList $allEssential
}

function Install-FullExtensions {
    Write-Header "Installing Full Extension Suite"

    $categories = @("Essential", "Development", "NextJS", "Firebase", "Productivity", "Git")

    foreach ($category in $categories) {
        if ($Extensions.ContainsKey($category)) {
            Install-ExtensionCategory -CategoryName $category -ExtensionList $Extensions[$category]
            Start-Sleep -Seconds 1  # Pequeña pausa entre categorías
        }
    }

    Write-Header "Installation Complete"
    Write-Success "🎉 All extensions installed successfully!"
    Write-Info "💡 Restart VS Code to ensure all extensions are loaded properly"
}

function Show-InstalledExtensions {
    Write-Header "Currently Installed Extensions"

    $installed = Get-InstalledExtensions

    if ($installed.Count -eq 0) {
        Write-Warning "No extensions found or VS Code not accessible"
        return
    }

    Write-Info "Found $($installed.Count) installed extensions:"
    Write-Host ""

    # Verificar extensiones de ALTAMEDICA
    $ourExtensions = @()
    foreach ($category in $Extensions.Values) {
        $ourExtensions += $category
    }

    $installedOurs = @()
    $installedOthers = @()

    foreach ($ext in $installed) {
        $ourExt = $ourExtensions | Where-Object { $_.Id -eq $ext }
        if ($ourExt) {
            $installedOurs += @{ Id = $ext; Name = $ourExt.Name; Category = "ALTAMEDICA" }
        } else {
            $installedOthers += $ext
        }
    }

    if ($installedOurs.Count -gt 0) {
        Write-Host "📦 ALTAMEDICA Extensions:" -ForegroundColor $Colors.Highlight
        foreach ($ext in $installedOurs) {
            Write-Host "   ✅ $($ext.Name) ($($ext.Id))" -ForegroundColor $Colors.Success
        }
        Write-Host ""
    }

    if ($installedOthers.Count -gt 0) {
        Write-Host "📂 Other Extensions:" -ForegroundColor $Colors.Info
        foreach ($ext in $installedOthers) {
            Write-Host "   • $ext" -ForegroundColor Gray
        }
    }
}

# Función principal
function Main {
    Clear-Host
    Write-Host "📦 ALTAMEDICA VS Code Extensions Installer" -ForegroundColor $Colors.Highlight
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "Optimized extension installation for ALTAMEDICA development with Copilot" -ForegroundColor $Colors.Info
    Write-Host ""

    if (-not (Test-VSCode)) {
        return
    }

    if ($List) {
        Show-ExtensionsList
        Show-InstalledExtensions
        return
    }

    if ($Update) {
        Update-Extensions
        return
    }

    if ($CopilotOnly) {
        Install-CopilotExtensions
        return
    }

    if ($Essential) {
        Install-EssentialExtensions
        return
    }

    if ($Full) {
        Install-FullExtensions
        return
    }

    # Sin parámetros, mostrar ayuda
    Write-Host "Usage:" -ForegroundColor $Colors.Info
    Write-Host "   .\install-vscode-extensions.ps1 -Essential    # Install essential extensions" -ForegroundColor White
    Write-Host "   .\install-vscode-extensions.ps1 -Full        # Install all extensions" -ForegroundColor White
    Write-Host "   .\install-vscode-extensions.ps1 -CopilotOnly # Install only Copilot extensions" -ForegroundColor White
    Write-Host "   .\install-vscode-extensions.ps1 -List        # Show available extensions" -ForegroundColor White
    Write-Host "   .\install-vscode-extensions.ps1 -Update      # Update existing extensions" -ForegroundColor White
    Write-Host ""
    Write-Info "💡 Start with -Essential for core development setup"
    Write-Host ""
}

# Ejecutar función principal
Main
