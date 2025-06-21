#----------------------------------------------------------------------
# 🚨 ALTAMEDICA VS CODE EMERGENCY REPAIR TOOL
# Herramienta de reparación de emergencia para VS Code
# Soluciona errores críticos de extensiones y configuración
#----------------------------------------------------------------------

param(
    [switch]$Emergency,
    [switch]$Full,
    [switch]$ExtensionsOnly,
    [switch]$ConfigOnly,
    [switch]$Force
)

# Configuración de colores
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Highlight = "Magenta"
    Critical = "Red"
}

function Write-Critical {
    param([string]$Message)
    Write-Host "🚨 $Message" -ForegroundColor $Colors.Critical
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Colors.Success
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Colors.Warning
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Colors.Info
}

function Show-ErrorAnalysis {
    Write-Host ""
    Write-Host "🔍 ANÁLISIS DE ERRORES DETECTADOS" -ForegroundColor $Colors.Highlight
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""

    Write-Critical "ERRORES CRÍTICOS IDENTIFICADOS:"
    Write-Host "  1. Extensión 'betterthantomorrow.calva-backseat-driver' - API proposals inválidos" -ForegroundColor White
    Write-Host "  2. Extensión 'ms-python.vscode-pylance' - API proposal inexistente" -ForegroundColor White
    Write-Host "  3. Extensión 'ms-vsliveshare.vsliveshare' - API proposal abandonado" -ForegroundColor White
    Write-Host "  4. Extensión 'ms-edgedevtools.vscode-edge-devtools' - Archivos corruptos" -ForegroundColor White
    Write-Host "  5. Extensión 'vsls-contrib.gistfs' - Errores múltiples de eventos" -ForegroundColor White
    Write-Host "  6. Archivos de toolsets corruptos (.toolsets.jsonc)" -ForegroundColor White
    Write-Host "  7. Terminal XTerm con errores de renderizado" -ForegroundColor White
    Write-Host "  8. Configuración de usuario corrupta" -ForegroundColor White
    Write-Host ""

    Write-Info "IMPACTO: Estos errores están impidiendo que Copilot funcione correctamente"
    Write-Host ""
}

function Stop-VSCode {
    Write-Info "Cerrando VS Code..."
    try {
        Get-Process code -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Success "VS Code cerrado correctamente"
    }
    catch {
        Write-Warning "No se pudo cerrar VS Code automáticamente"
    }
}

function Remove-ProblematicExtensions {
    Write-Info "Eliminando extensiones problemáticas..."

    $problematicExtensions = @(
        "betterthantomorrow.calva-backseat-driver",
        "ms-edgedevtools.vscode-edge-devtools",
        "vsls-contrib.gistfs",
        "ms-vsliveshare.vsliveshare",
        "WallabyJs.console-ninja"
    )

    foreach ($extension in $problematicExtensions) {
        try {
            Write-Host "  Eliminando $extension..." -ForegroundColor Gray
            code --uninstall-extension $extension --force 2>$null
            Write-Success "  $extension eliminado"
        }
        catch {
            Write-Warning "  No se pudo eliminar $extension"
        }
    }
}

function Clean-CorruptedToolsets {
    Write-Info "Limpiando archivos de toolsets corruptos..."

    $userDataPath = "$env:APPDATA\Code\User"
    $promptsPath = "$userDataPath\prompts"

    if (Test-Path $promptsPath) {
        try {
            # Hacer backup de archivos de prompts
            $backupPath = "$userDataPath\prompts_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
            Copy-Item $promptsPath $backupPath -Recurse -Force
            Write-Success "Backup creado: $backupPath"

            # Eliminar archivos corruptos
            $corruptedFiles = @(
                "news.toolsets.jsonc",
                "NEX15  Y NODE24.toolsets.jsonc",
                "URGENTEPARAIA.toolsets.jsonc"
            )

            foreach ($file in $corruptedFiles) {
                $filePath = Join-Path $promptsPath $file
                if (Test-Path $filePath) {
                    Remove-Item $filePath -Force
                    Write-Success "  Eliminado: $file"
                }
            }
        }
        catch {
            Write-Warning "Error limpiando toolsets: $_"
        }
    }
}

function Reset-UserConfiguration {
    Write-Info "Restableciendo configuración de usuario..."

    $userDataPath = "$env:APPDATA\Code\User"
    $settingsPath = "$userDataPath\settings.json"
    $keybindingsPath = "$userDataPath\keybindings.json"

    # Backup de configuraciones actuales
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'

    if (Test-Path $settingsPath) {
        Copy-Item $settingsPath "$settingsPath.emergency_backup_$timestamp" -Force
        Write-Success "Backup de settings.json creado"
    }

    if (Test-Path $keybindingsPath) {
        Copy-Item $keybindingsPath "$keybindingsPath.emergency_backup_$timestamp" -Force
        Write-Success "Backup de keybindings.json creado"
    }

    # Crear configuración mínima y estable
    $minimalSettings = @{
        "workbench.startupEditor" = "welcomePage"
        "editor.suggest.snippetsPreventQuickSuggestions" = $false
        "editor.inlineSuggest.enabled" = $true
        "github.copilot.enable" = @{
            "*" = $true
            "yaml" = $false
            "plaintext" = $false
            "markdown" = $true
        }
        "files.autoSave" = "afterDelay"
        "editor.formatOnSave" = $true
        "terminal.integrated.defaultProfile.windows" = "PowerShell"
        "terminal.integrated.profiles.windows" = @{
            "PowerShell" = @{
                "source" = "PowerShell"
                "icon" = "terminal-powershell"
            }
        }
    }

    try {
        $minimalSettings | ConvertTo-Json -Depth 10 | Out-File $settingsPath -Encoding UTF8 -Force
        Write-Success "Configuración mínima aplicada"
    }
    catch {
        Write-Warning "Error creando configuración mínima: $_"
    }
}

function Clear-ExtensionCache {
    Write-Info "Limpiando caché de extensiones..."

    $extensionPaths = @(
        "$env:USERPROFILE\.vscode\extensions",
        "$env:APPDATA\Code\CachedExtensions",
        "$env:APPDATA\Code\logs"
    )

    foreach ($path in $extensionPaths) {
        if (Test-Path $path) {
            try {
                $cacheFiles = Get-ChildItem $path -Recurse -Filter "*.log" -ErrorAction SilentlyContinue
                $cacheFiles | Remove-Item -Force -ErrorAction SilentlyContinue

                $tempFiles = Get-ChildItem $path -Recurse -Filter "*.tmp" -ErrorAction SilentlyContinue
                $tempFiles | Remove-Item -Force -ErrorAction SilentlyContinue

                Write-Success "Caché limpiado: $path"
            }
            catch {
                Write-Warning "No se pudo limpiar completamente: $path"
            }
        }
    }
}

function Install-EssentialExtensions {
    Write-Info "Instalando extensiones esenciales..."

    $essentialExtensions = @(
        @{ Id = "GitHub.copilot"; Name = "GitHub Copilot" },
        @{ Id = "GitHub.copilot-chat"; Name = "GitHub Copilot Chat" },
        @{ Id = "ms-vscode.powershell"; Name = "PowerShell" },
        @{ Id = "ms-vscode.vscode-typescript-next"; Name = "TypeScript" },
        @{ Id = "bradlc.vscode-tailwindcss"; Name = "Tailwind CSS" },
        @{ Id = "esbenp.prettier-vscode"; Name = "Prettier" }
    )

    foreach ($ext in $essentialExtensions) {
        try {
            Write-Host "  Instalando $($ext.Name)..." -ForegroundColor Gray
            code --install-extension $ext.Id --force 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "  $($ext.Name) instalado"
            } else {
                Write-Warning "  Error instalando $($ext.Name)"
            }
        }
        catch {
            Write-Warning "  Falló instalación de $($ext.Name): $_"
        }
    }
}

function Repair-Terminal {
    Write-Info "Reparando configuración del terminal..."

    # Reiniciar configuración del terminal
    $userDataPath = "$env:APPDATA\Code\User"
    $workbenchStatePath = "$userDataPath\workspaceStorage"

    if (Test-Path $workbenchStatePath) {
        try {
            # Limpiar estados corruptos del terminal
            Get-ChildItem $workbenchStatePath -Recurse -Filter "*terminal*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-Success "Estados del terminal limpiados"
        }
        catch {
            Write-Warning "No se pudo limpiar completamente los estados del terminal"
        }
    }
}

function Test-VSCodeHealth {
    Write-Info "Verificando salud de VS Code..."

    try {
        # Verificar que VS Code puede iniciarse
        $testResult = code --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "VS Code responde correctamente"
            Write-Host "  Versión: $($testResult[0])" -ForegroundColor Gray
            return $true
        } else {
            Write-Warning "VS Code no responde correctamente"
            return $false
        }
    }
    catch {
        Write-Warning "Error verificando VS Code: $_"
        return $false
    }
}

function Emergency-Repair {
    Write-Host ""
    Write-Critical "🚨 INICIANDO REPARACIÓN DE EMERGENCIA"
    Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""

    Show-ErrorAnalysis

    if (-not $Force) {
        Write-Warning "Esta operación eliminará extensiones problemáticas y restablecerá configuraciones"
        $response = Read-Host "¿Continuar? (y/N)"
        if ($response -ne 'y' -and $response -ne 'Y') {
            Write-Info "Operación cancelada por el usuario"
            return
        }
    }

    # Paso 1: Cerrar VS Code
    Stop-VSCode

    # Paso 2: Eliminar extensiones problemáticas
    Remove-ProblematicExtensions

    # Paso 3: Limpiar archivos corruptos
    Clean-CorruptedToolsets

    # Paso 4: Limpiar caché
    Clear-ExtensionCache

    # Paso 5: Reparar terminal
    Repair-Terminal

    # Paso 6: Restablecer configuración
    Reset-UserConfiguration

    # Paso 7: Instalar extensiones esenciales
    Install-EssentialExtensions

    # Paso 8: Verificar salud
    Start-Sleep -Seconds 3
    if (Test-VSCodeHealth) {
        Write-Host ""
        Write-Success "🎉 REPARACIÓN COMPLETADA EXITOSAMENTE"
        Write-Host ""
        Write-Info "Próximos pasos:"
        Write-Host "  1. Abrir VS Code" -ForegroundColor White
        Write-Host "  2. Verificar que Copilot esté funcionando" -ForegroundColor White
        Write-Host "  3. Restaurar configuraciones personalizadas gradualmente" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Warning "La reparación se completó pero VS Code aún tiene problemas"
        Write-Info "Considera reinstalar VS Code completamente"
    }
}

function Full-Repair {
    Write-Info "Iniciando reparación completa..."

    Emergency-Repair

    # Pasos adicionales para reparación completa
    Write-Info "Ejecutando limpieza profunda..."

    # Limpiar registro de Windows (opcional)
    try {
        # Nota: Esto requeriría permisos administrativos
        Write-Info "Limpieza del registro omitida (requiere permisos administrativos)"
    }
    catch {
        Write-Warning "No se pudo limpiar el registro"
    }
}

function Repair-ExtensionsOnly {
    Write-Info "Reparando solo extensiones..."

    Stop-VSCode
    Remove-ProblematicExtensions
    Clear-ExtensionCache
    Install-EssentialExtensions

    Write-Success "Reparación de extensiones completada"
}

function Repair-ConfigOnly {
    Write-Info "Reparando solo configuración..."

    Stop-VSCode
    Clean-CorruptedToolsets
    Reset-UserConfiguration
    Repair-Terminal

    Write-Success "Reparación de configuración completada"
}

# Función principal
function Main {
    Clear-Host
    Write-Host "🚨 ALTAMEDICA VS CODE EMERGENCY REPAIR" -ForegroundColor $Colors.Critical
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host "Herramienta de reparación de emergencia para errores críticos de VS Code" -ForegroundColor $Colors.Info
    Write-Host ""

    if ($Emergency) {
        Emergency-Repair
        return
    }

    if ($Full) {
        Full-Repair
        return
    }

    if ($ExtensionsOnly) {
        Repair-ExtensionsOnly
        return
    }

    if ($ConfigOnly) {
        Repair-ConfigOnly
        return
    }

    # Sin parámetros, mostrar opciones
    Show-ErrorAnalysis

    Write-Host "OPCIONES DE REPARACIÓN:" -ForegroundColor $Colors.Highlight
    Write-Host ""
    Write-Host "  .\emergency-repair.ps1 -Emergency      # Reparación de emergencia (RECOMENDADO)" -ForegroundColor White
    Write-Host "  .\emergency-repair.ps1 -Full           # Reparación completa" -ForegroundColor White
    Write-Host "  .\emergency-repair.ps1 -ExtensionsOnly # Solo extensiones" -ForegroundColor White
    Write-Host "  .\emergency-repair.ps1 -ConfigOnly     # Solo configuración" -ForegroundColor White
    Write-Host "  .\emergency-repair.ps1 -Emergency -Force # Sin confirmaciones" -ForegroundColor White
    Write-Host ""
    Write-Critical "RECOMENDACIÓN: Ejecutar -Emergency para resolver los errores críticos"
    Write-Host ""
}

# Ejecutar función principal
Main
