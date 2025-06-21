#----------------------------------------------------------------------
# 🔧 ALTAMEDICA COPILOT POWERSHELL SETUP
# Configuración automática del perfil de PowerShell con Copilot
#----------------------------------------------------------------------

param(
    [switch]$Install,
    [switch]$Uninstall,
    [switch]$Status,
    [switch]$Force
)

# Configuración de colores
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Highlight = "Magenta"
}

function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White",
        [string]$Icon = ""
    )
    if ($Icon) {
        Write-Host "$Icon $Message" -ForegroundColor $Color
    } else {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-PowerShellProfile {
    $ProfilePath = $PROFILE.CurrentUserAllHosts
    $ProfileExists = Test-Path $ProfilePath
    $CopilotProfilePath = "$PSScriptRoot\copilot-enhanced-profile.ps1"
    $CopilotProfileExists = Test-Path $CopilotProfilePath

    return @{
        ProfilePath = $ProfilePath
        ProfileExists = $ProfileExists
        CopilotProfilePath = $CopilotProfilePath
        CopilotProfileExists = $CopilotProfileExists
        IsConfigured = $ProfileExists -and (Get-Content $ProfilePath -ErrorAction SilentlyContinue) -match "copilot-enhanced-profile"
    }
}

function Show-Status {
    Write-ColorMessage "🔍 ALTAMEDICA Copilot Integration Status" $Colors.Highlight
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

    $status = Test-PowerShellProfile

    Write-ColorMessage "📂 PowerShell Profile Path:" $Colors.Info
    Write-Host "   $($status.ProfilePath)" -ForegroundColor White

    if ($status.ProfileExists) {
        Write-ColorMessage "✅ PowerShell Profile exists" $Colors.Success
    } else {
        Write-ColorMessage "❌ PowerShell Profile not found" $Colors.Error
    }

    if ($status.CopilotProfileExists) {
        Write-ColorMessage "✅ Copilot Profile exists" $Colors.Success
    } else {
        Write-ColorMessage "❌ Copilot Profile not found" $Colors.Error
    }

    if ($status.IsConfigured) {
        Write-ColorMessage "✅ Copilot Integration is ACTIVE" $Colors.Success
    } else {
        Write-ColorMessage "❌ Copilot Integration is NOT ACTIVE" $Colors.Error
    }

    # Verificar VS Code y extensiones
    if (Get-Command code -ErrorAction SilentlyContinue) {
        Write-ColorMessage "✅ VS Code found" $Colors.Success

        try {
            $extensions = code --list-extensions 2>$null
            if ($extensions -match "github.copilot") {
                Write-ColorMessage "✅ GitHub Copilot extension installed" $Colors.Success
            } else {
                Write-ColorMessage "⚠️ GitHub Copilot extension not found" $Colors.Warning
                Write-Host "   Install with: code --install-extension GitHub.copilot" -ForegroundColor Gray
            }

            if ($extensions -match "github.copilot-chat") {
                Write-ColorMessage "✅ GitHub Copilot Chat extension installed" $Colors.Success
            } else {
                Write-ColorMessage "⚠️ GitHub Copilot Chat extension not found" $Colors.Warning
                Write-Host "   Install with: code --install-extension GitHub.copilot-chat" -ForegroundColor Gray
            }
        }
        catch {
            Write-ColorMessage "⚠️ Could not check VS Code extensions" $Colors.Warning
        }
    } else {
        Write-ColorMessage "❌ VS Code not found in PATH" $Colors.Error
    }

    # Verificar GitHub CLI
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-ColorMessage "✅ GitHub CLI found" $Colors.Success
        try {
            $authStatus = gh auth status 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-ColorMessage "✅ GitHub CLI authenticated" $Colors.Success
            } else {
                Write-ColorMessage "⚠️ GitHub CLI not authenticated" $Colors.Warning
                Write-Host "   Authenticate with: gh auth login" -ForegroundColor Gray
            }
        }
        catch {
            Write-ColorMessage "⚠️ Could not check GitHub CLI auth status" $Colors.Warning
        }
    } else {
        Write-ColorMessage "⚠️ GitHub CLI not found (optional)" $Colors.Warning
    }

    Write-Host ""
}

function Install-CopilotIntegration {
    Write-ColorMessage "🚀 Installing ALTAMEDICA Copilot Integration..." $Colors.Highlight

    $status = Test-PowerShellProfile

    # Crear directorio del perfil si no existe
    $profileDir = Split-Path $status.ProfilePath -Parent
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
        Write-ColorMessage "📁 Created profile directory" $Colors.Success
    }

    # Backup del perfil existente
    if ($status.ProfileExists -and -not $Force) {
        $backupPath = "$($status.ProfilePath).backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $status.ProfilePath $backupPath
        Write-ColorMessage "💾 Backed up existing profile to: $(Split-Path $backupPath -Leaf)" $Colors.Info
    }

    # Verificar que el perfil de Copilot existe
    if (-not $status.CopilotProfileExists) {
        Write-ColorMessage "❌ Copilot profile not found at: $($status.CopilotProfilePath)" $Colors.Error
        Write-Host "   Make sure you're running this from the ALTAMEDICADEV directory" -ForegroundColor Gray
        return $false
    }

    # Crear o actualizar el perfil de PowerShell
    $profileContent = @"
#----------------------------------------------------------------------
# 🏥 ALTAMEDICA PowerShell Profile with GitHub Copilot Integration
# Auto-generated on $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
#----------------------------------------------------------------------

# Load ALTAMEDICA Copilot Enhanced Profile
`$AltamedicaCopilotProfile = "$($status.CopilotProfilePath)"
if (Test-Path `$AltamedicaCopilotProfile) {
    . `$AltamedicaCopilotProfile
} else {
    Write-Warning "ALTAMEDICA Copilot profile not found: `$AltamedicaCopilotProfile"
}

# Additional customizations can be added below this line
#----------------------------------------------------------------------
"@

    try {
        $profileContent | Out-File -FilePath $status.ProfilePath -Encoding UTF8 -Force
        Write-ColorMessage "✅ PowerShell profile configured successfully" $Colors.Success
        Write-ColorMessage "📝 Profile location: $($status.ProfilePath)" $Colors.Info

        return $true
    }
    catch {
        Write-ColorMessage "❌ Failed to configure PowerShell profile: $_" $Colors.Error
        return $false
    }
}

function Uninstall-CopilotIntegration {
    Write-ColorMessage "🗑️ Uninstalling ALTAMEDICA Copilot Integration..." $Colors.Warning

    $status = Test-PowerShellProfile

    if (-not $status.ProfileExists) {
        Write-ColorMessage "ℹ️ No PowerShell profile found to remove" $Colors.Info
        return $true
    }

    # Backup before removal
    $backupPath = "$($status.ProfilePath).backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $status.ProfilePath $backupPath
    Write-ColorMessage "💾 Backed up profile to: $(Split-Path $backupPath -Leaf)" $Colors.Info

    try {
        Remove-Item $status.ProfilePath -Force
        Write-ColorMessage "✅ PowerShell profile removed" $Colors.Success
        Write-ColorMessage "💾 Backup available at: $backupPath" $Colors.Info
        return $true
    }
    catch {
        Write-ColorMessage "❌ Failed to remove PowerShell profile: $_" $Colors.Error
        return $false
    }
}

function Install-VSCodeExtensions {
    Write-ColorMessage "📦 Installing required VS Code extensions..." $Colors.Info

    if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
        Write-ColorMessage "❌ VS Code not found in PATH" $Colors.Error
        return $false
    }

    $extensions = @(
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "ms-vscode.powershell"
    )

    foreach ($extension in $extensions) {
        Write-Host "   Installing $extension..." -ForegroundColor Gray
        try {
            code --install-extension $extension --force 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-ColorMessage "   ✅ $extension installed" $Colors.Success
            } else {
                Write-ColorMessage "   ⚠️ $extension installation may have failed" $Colors.Warning
            }
        }
        catch {
            Write-ColorMessage "   ❌ Failed to install $extension" $Colors.Error
        }
    }
}

# Función principal
function Main {
    Write-Host ""
    Write-ColorMessage "🤖 ALTAMEDICA Copilot PowerShell Setup" $Colors.Highlight "🔧"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""

    if ($Status) {
        Show-Status
        return
    }

    if ($Uninstall) {
        if (Uninstall-CopilotIntegration) {
            Write-ColorMessage "🎉 Copilot integration uninstalled successfully!" $Colors.Success
            Write-ColorMessage "💡 Restart PowerShell to apply changes" $Colors.Info
        }
        return
    }

    if ($Install) {
        # Instalar integración
        if (Install-CopilotIntegration) {
            Write-ColorMessage "🎉 Copilot integration installed successfully!" $Colors.Success

            # Instalar extensiones de VS Code
            Install-VSCodeExtensions

            Write-Host ""
            Write-ColorMessage "🚀 Next Steps:" $Colors.Highlight
            Write-Host "   1. Restart PowerShell or run: " -NoNewline -ForegroundColor Gray
            Write-Host ". `$PROFILE" -ForegroundColor Yellow
            Write-Host "   2. Authenticate GitHub CLI: " -NoNewline -ForegroundColor Gray
            Write-Host "gh auth login" -ForegroundColor Yellow
            Write-Host "   3. Open VS Code and sign in to GitHub Copilot" -ForegroundColor Gray
            Write-Host "   4. Type " -NoNewline -ForegroundColor Gray
            Write-Host "help" -NoNewline -ForegroundColor Yellow
            Write-Host " in PowerShell to see available commands" -ForegroundColor Gray
            Write-Host ""
        }
        return
    }

    # Sin parámetros, mostrar ayuda
    Write-ColorMessage "Usage:" $Colors.Info
    Write-Host "   .\setup-copilot-integration.ps1 -Install     # Install Copilot integration" -ForegroundColor White
    Write-Host "   .\setup-copilot-integration.ps1 -Status      # Show current status" -ForegroundColor White
    Write-Host "   .\setup-copilot-integration.ps1 -Uninstall   # Remove integration" -ForegroundColor White
    Write-Host "   .\setup-copilot-integration.ps1 -Install -Force  # Force reinstall" -ForegroundColor White
    Write-Host ""
    Write-ColorMessage "💡 Start with: -Status to check current configuration" $Colors.Info
    Write-Host ""
}

# Ejecutar función principal
Main
