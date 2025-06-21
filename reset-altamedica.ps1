#----------------------------------------------------------------------
# 🔄 ALTAMEDICA RESET TOOL
# Restablecimiento completo de terminal y extensiones de VS Code
#----------------------------------------------------------------------

param(
    [switch]$Terminal,
    [switch]$Extensions,
    [switch]$All,
    [switch]$CleanInstall,
    [switch]$Backup,
    [switch]$Status
)

# Configuración de colores
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Highlight = "Magenta"
    Gray = "Gray"
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "🔄 $Title" -ForegroundColor $Colors.Highlight
    Write-Host ("━" * ($Title.Length + 3)) -ForegroundColor $Colors.Gray
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

function Stop-VSCode {
    Write-Info "Cerrando VS Code..."
    try {
        Get-Process "Code" -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Success "VS Code cerrado"
        return $true
    }
    catch {
        Write-Warning "No se encontraron procesos de VS Code ejecutándose"
        return $true
    }
}

function Clear-VSCodeCache {
    Write-Header "Limpiando Cache de VS Code"

    $cachePaths = @(
        "$env:APPDATA\Code\User\workspaceStorage",
        "$env:APPDATA\Code\logs",
        "$env:APPDATA\Code\CachedExtensions",
        "$env:LOCALAPPDATA\Microsoft\vscode-cpptools",
        "$env:TEMP\vscode-*"
    )

    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            try {
                Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-Success "Limpiado: $(Split-Path $path -Leaf)"
            }
            catch {
                Write-Warning "No se pudo limpiar: $path"
            }
        }
    }
}

function Fix-CorruptedToolsets {
    Write-Header "Reparando Toolsets Corruptos"

    $toolsetsPath = "$env:APPDATA\Code\User\prompts"

    if (Test-Path $toolsetsPath) {
        $corruptedFiles = Get-ChildItem $toolsetsPath -Filter "*.toolsets.jsonc" | Where-Object {
            try {
                $content = Get-Content $_.FullName -Raw
                if ([string]::IsNullOrWhiteSpace($content)) {
                    return $true
                }
                ConvertFrom-Json $content -ErrorAction Stop
                return $false
            }
            catch {
                return $true
            }
        }

        foreach ($file in $corruptedFiles) {
            try {
                Write-Info "Reparando archivo corrupto: $($file.Name)"

                # Crear contenido válido básico
                $validContent = @"
{
  "name": "$($file.BaseName.Replace('.toolsets', ''))",
  "description": "Restored toolset",
  "tools": []
}
"@
                $validContent | Out-File -FilePath $file.FullName -Encoding UTF8 -Force
                Write-Success "Archivo reparado: $($file.Name)"
            }
            catch {
                Write-Warning "No se pudo reparar: $($file.Name)"
                # Si no se puede reparar, eliminar el archivo corrupto
                try {
                    Remove-Item $file.FullName -Force
                    Write-Success "Archivo corrupto eliminado: $($file.Name)"
                }
                catch {
                    Write-Error "No se pudo eliminar archivo corrupto: $($file.Name)"
                }
            }
        }

        if ($corruptedFiles.Count -eq 0) {
            Write-Success "No se encontraron archivos de toolsets corruptos"
        }
    } else {
        Write-Info "Directorio de toolsets no encontrado, creando..."
        New-Item -ItemType Directory -Path $toolsetsPath -Force | Out-Null
        Write-Success "Directorio de toolsets creado"
    }
}

function Reset-VSCodeExtensions {
    Write-Header "Restableciendo Extensiones de VS Code"

    if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
        Write-Error "VS Code no encontrado en PATH"
        return $false
    }

    # Obtener lista de extensiones instaladas
    Write-Info "Obteniendo lista de extensiones instaladas..."
    $installedExtensions = code --list-extensions 2>$null

    if ($installedExtensions) {
        Write-Info "Encontradas $($installedExtensions.Count) extensiones"

        # Hacer backup de la lista si se solicita
        if ($Backup) {
            $backupFile = "extensions-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
            $installedExtensions | Out-File $backupFile
            Write-Success "Backup de extensiones guardado en: $backupFile"
        }

        # Desinstalar todas las extensiones
        Write-Info "Desinstalando todas las extensiones..."
        foreach ($extension in $installedExtensions) {
            try {
                Write-Host "   Desinstalando: $extension" -ForegroundColor Gray
                code --uninstall-extension $extension --force 2>$null
            }
            catch {
                Write-Warning "No se pudo desinstalar: $extension"
            }
        }
        Write-Success "Extensiones desinstaladas"
    }

    # Limpiar directorio de extensiones
    $extensionsPath = "$env:USERPROFILE\.vscode\extensions"
    if (Test-Path $extensionsPath) {
        try {
            Write-Info "Limpiando directorio de extensiones..."
            Remove-Item "$extensionsPath\*" -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "Directorio de extensiones limpiado"
        }
        catch {
            Write-Warning "No se pudo limpiar completamente el directorio de extensiones"
        }
    }

    return $true
}

function Install-EssentialExtensions {
    Write-Header "Instalando Extensiones Esenciales"

    $essentialExtensions = @(
        "GitHub.copilot",
        "GitHub.copilot-chat",
        "ms-vscode.powershell",
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode"
    )

    Write-Info "Instalando extensiones esenciales para ALTAMEDICA..."

    foreach ($extension in $essentialExtensions) {
        Write-Host "   Instalando: $extension" -ForegroundColor Gray
        try {
            code --install-extension $extension --force 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Instalado: $extension"
            } else {
                Write-Warning "Posible error instalando: $extension"
            }
        }
        catch {
            Write-Error "Error instalando: $extension"
        }
        Start-Sleep -Milliseconds 500
    }
}

function Reset-Terminal {
    Write-Header "Restableciendo Configuración de Terminal"

    # Limpiar configuración de Windows Terminal
    $terminalSettingsPath = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"

    if (Test-Path $terminalSettingsPath) {
        if ($Backup) {
            $backupPath = "$terminalSettingsPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Copy-Item $terminalSettingsPath $backupPath
            Write-Success "Backup de configuración de terminal: $(Split-Path $backupPath -Leaf)"
        }
    }

    # Aplicar configuración optimizada de ALTAMEDICA
    $altamedicaTerminalConfig = "$PSScriptRoot\windows-terminal-settings.json"
    if (Test-Path $altamedicaTerminalConfig) {
        try {
            Copy-Item $altamedicaTerminalConfig $terminalSettingsPath -Force
            Write-Success "Configuración de terminal ALTAMEDICA aplicada"
        }
        catch {
            Write-Error "No se pudo aplicar configuración de terminal"
        }
    } else {
        Write-Warning "Archivo de configuración de terminal ALTAMEDICA no encontrado"
    }

    # Limpiar historial de PowerShell
    $historyPath = "$env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt"
    if (Test-Path $historyPath) {
        try {
            Clear-Content $historyPath
            Write-Success "Historial de PowerShell limpiado"
        }
        catch {
            Write-Warning "No se pudo limpiar historial de PowerShell"
        }
    }
}

function Reset-PowerShellProfile {
    Write-Header "Restableciendo Perfil de PowerShell"

    $profilePath = $PROFILE.CurrentUserAllHosts

    if (Test-Path $profilePath) {
        if ($Backup) {
            $backupPath = "$profilePath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Copy-Item $profilePath $backupPath
            Write-Success "Backup de perfil PowerShell: $(Split-Path $backupPath -Leaf)"
        }
    }

    # Reinstalar perfil de Copilot
    $setupScript = "$PSScriptRoot\setup-copilot-integration.ps1"
    if (Test-Path $setupScript) {
        try {
            Write-Info "Reinstalando integración de Copilot..."
            & $setupScript -Install -Force
        }
        catch {
            Write-Error "Error reinstalando integración de Copilot"
        }
    } else {
        Write-Warning "Script de configuración de Copilot no encontrado"
    }
}

function Show-Status {
    Write-Header "Estado Actual del Sistema"

    # Estado de VS Code
    if (Get-Command code -ErrorAction SilentlyContinue) {
        Write-Success "VS Code encontrado"

        $extensions = code --list-extensions 2>$null
        if ($extensions) {
            Write-Info "Extensiones instaladas: $($extensions.Count)"

            # Verificar extensiones esenciales
            $essential = @("github.copilot", "github.copilot-chat", "ms-vscode.powershell")
            $missing = @()

            foreach ($ext in $essential) {
                if ($extensions -notcontains $ext) {
                    $missing += $ext
                }
            }

            if ($missing.Count -eq 0) {
                Write-Success "Todas las extensiones esenciales están instaladas"
            } else {
                Write-Warning "Extensiones esenciales faltantes: $($missing -join ', ')"
            }
        } else {
            Write-Warning "No se pudieron obtener las extensiones instaladas"
        }
    } else {
        Write-Error "VS Code no encontrado"
    }

    # Estado del perfil de PowerShell
    if (Test-Path $PROFILE.CurrentUserAllHosts) {
        $content = Get-Content $PROFILE.CurrentUserAllHosts -Raw
        if ($content -match "ALTAMEDICA" -or $content -match "copilot") {
            Write-Success "Perfil de PowerShell con integración ALTAMEDICA/Copilot"
        } else {
            Write-Warning "Perfil de PowerShell sin integración ALTAMEDICA"
        }
    } else {
        Write-Warning "Perfil de PowerShell no encontrado"
    }

    # Estado del terminal
    $terminalSettings = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
    if (Test-Path $terminalSettings) {
        Write-Success "Configuración de Windows Terminal encontrada"
    } else {
        Write-Warning "Configuración de Windows Terminal no encontrada"
    }
}

function Main {
    Clear-Host
    Write-Host "🔄 ALTAMEDICA Reset Tool" -ForegroundColor $Colors.Highlight
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor $Colors.Gray
    Write-Host "Herramienta para restablecer terminal y extensiones de VS Code" -ForegroundColor $Colors.Info
    Write-Host ""

    if ($Status) {
        Show-Status
        return
    }

    if ($All -or $CleanInstall) {
        Write-Warning "⚠️  ADVERTENCIA: Esto eliminará TODAS las extensiones y configuraciones"
        $confirm = Read-Host "¿Continuar? (y/N)"
        if ($confirm -ne 'y' -and $confirm -ne 'Y') {
            Write-Info "Operación cancelada"
            return
        }

        Stop-VSCode
        Clear-VSCodeCache
        Fix-CorruptedToolsets
        Reset-VSCodeExtensions
        Reset-Terminal
        Reset-PowerShellProfile
        Install-EssentialExtensions

        Write-Header "🎉 Restablecimiento Completo Finalizado"
        Write-Success "Sistema completamente restablecido"
        Write-Info "Por favor:"
        Write-Host "   1. Reinicia VS Code" -ForegroundColor White
        Write-Host "   2. Reinicia PowerShell" -ForegroundColor White
        Write-Host "   3. Autentica GitHub Copilot cuando se solicite" -ForegroundColor White
        Write-Host ""
        return
    }

    if ($Extensions) {
        $confirm = Read-Host "¿Restablecer todas las extensiones de VS Code? (y/N)"
        if ($confirm -eq 'y' -or $confirm -eq 'Y') {
            Stop-VSCode
            Fix-CorruptedToolsets
            Reset-VSCodeExtensions
            Install-EssentialExtensions
            Write-Success "Extensiones restablecidas"
        }
        return
    }

    if ($Terminal) {
        Reset-Terminal
        Reset-PowerShellProfile
        Write-Success "Terminal y PowerShell restablecidos"
        return
    }

    # Sin parámetros, mostrar ayuda
    Write-Host "Uso:" -ForegroundColor $Colors.Info
    Write-Host "   .\reset-altamedica.ps1 -Status        # Mostrar estado actual" -ForegroundColor White
    Write-Host "   .\reset-altamedica.ps1 -Extensions    # Restablecer solo extensiones" -ForegroundColor White
    Write-Host "   .\reset-altamedica.ps1 -Terminal      # Restablecer solo terminal" -ForegroundColor White
    Write-Host "   .\reset-altamedica.ps1 -All          # Restablecimiento completo" -ForegroundColor White
    Write-Host "   .\reset-altamedica.ps1 -All -Backup  # Restablecimiento con backup" -ForegroundColor White
    Write-Host ""
    Write-Info "💡 Recomendado: Empezar con -Status para ver el estado actual"
    Write-Host ""
}

# Ejecutar función principal
Main
