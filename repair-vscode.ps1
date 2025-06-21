#----------------------------------------------------------------------
# 🔧 ALTAMEDICA VS CODE REPAIR TOOL
# Herramienta de reparación y limpieza de VS Code para resolver errores
#----------------------------------------------------------------------

param(
    [switch]$CleanExtensions,
    [switch]$FixProposedAPI,
    [switch]$CleanUserData,
    [switch]$RepairCopilot,
    [switch]$FullRepair,
    [switch]$BackupFirst,
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
    Write-Host "🔧 $Title" -ForegroundColor $Colors.Highlight
    Write-Host ("━" * ($Title.Length + 3)) -ForegroundColor $Colors.Gray
}

function Write-Issue {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Colors.Error
}

function Write-Fixed {
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

function Get-VSCodePaths {
    return @{
        Extensions = "$env:USERPROFILE\.vscode\extensions"
        UserData = "$env:APPDATA\Code\User"
        Settings = "$env:APPDATA\Code\User\settings.json"
        Keybindings = "$env:APPDATA\Code\User\keybindings.json"
        Snippets = "$env:APPDATA\Code\User\snippets"
        Workspaces = "$env:APPDATA\Code\User\workspaceStorage"
        Logs = "$env:APPDATA\Code\logs"
        CachedExtensions = "$env:APPDATA\Code\CachedExtensions"
        PromptsDir = "$env:APPDATA\Code\User\prompts"
    }
}

function Test-VSCodeStatus {
    Write-Header "VS Code Status Check"

    $paths = Get-VSCodePaths
    $issues = @()

    # Verificar VS Code instalado
    if (-not (Get-Command code -ErrorAction SilentlyContinue)) {
        Write-Issue "VS Code not found in PATH"
        $issues += "VS Code not installed or not in PATH"
    } else {
        Write-Fixed "VS Code found in PATH"
    }

    # Verificar directorios principales
    foreach ($pathName in $paths.Keys) {
        $path = $paths[$pathName]
        if (Test-Path $path) {
            Write-Fixed "$pathName directory exists: $path"
        } else {
            Write-Warning "$pathName directory missing: $path"
        }
    }

    # Verificar archivos de configuración corruptos
    $configFiles = @(
        @{ Name = "Settings"; Path = $paths.Settings },
        @{ Name = "Keybindings"; Path = $paths.Keybindings }
    )

    foreach ($config in $configFiles) {
        if (Test-Path $config.Path) {
            try {
                $content = Get-Content $config.Path -Raw | ConvertFrom-Json
                Write-Fixed "$($config.Name) file is valid JSON"
            }
            catch {
                Write-Issue "$($config.Name) file is corrupted: $($config.Path)"
                $issues += "Corrupted $($config.Name) file"
            }
        }
    }

    # Verificar archivos de prompts problemáticos
    $promptsDir = $paths.PromptsDir
    if (Test-Path $promptsDir) {
        $problematicFiles = Get-ChildItem $promptsDir -Filter "*.jsonc" | Where-Object {
            try {
                $content = Get-Content $_.FullName -Raw
                if ([string]::IsNullOrWhiteSpace($content)) {
                    return $true
                }
                # Intentar parsear como JSON
                $content | ConvertFrom-Json | Out-Null
                return $false
            }
            catch {
                return $true
            }
        }

        if ($problematicFiles) {
            Write-Issue "Found $($problematicFiles.Count) corrupted prompt files"
            foreach ($file in $problematicFiles) {
                Write-Host "   • $($file.Name)" -ForegroundColor $Colors.Error
            }
            $issues += "Corrupted prompt files"
        } else {
            Write-Fixed "All prompt files are valid"
        }
    }

    return $issues
}

function Get-ProblematicExtensions {
    Write-Header "Analyzing Problematic Extensions"

    $problematicExtensions = @(
        "betterthantomorrow.calva-backseat-driver",
        "ms-edgedevtools.vscode-edge-devtools",
        "vsls-contrib.gistfs",
        "WallabyJs.console-ninja"
    )

    $installedExtensions = @()
    try {
        $installedExtensions = code --list-extensions 2>$null
    }
    catch {
        Write-Warning "Could not get extension list"
        return @()
    }

    $foundProblematic = @()
    foreach ($ext in $problematicExtensions) {
        if ($installedExtensions -contains $ext) {
            $foundProblematic += $ext
            Write-Issue "Problematic extension found: $ext"
        }
    }

    # Verificar extensiones con APIs propuestas
    $apiProposalExtensions = @(
        "ms-python.vscode-pylance",
        "ms-vsliveshare.vsliveshare"
    )

    foreach ($ext in $apiProposalExtensions) {
        if ($installedExtensions -contains $ext) {
            Write-Warning "Extension using proposed APIs: $ext"
        }
    }

    return $foundProblematic
}

function Backup-VSCodeConfig {
    if (-not $BackupFirst) {
        return
    }

    Write-Header "Creating Backup"

    $backupDir = "$PSScriptRoot\vscode-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $paths = Get-VSCodePaths

    try {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

        # Backup settings
        if (Test-Path $paths.Settings) {
            Copy-Item $paths.Settings "$backupDir\settings.json" -Force
        }

        # Backup keybindings
        if (Test-Path $paths.Keybindings) {
            Copy-Item $paths.Keybindings "$backupDir\keybindings.json" -Force
        }

        # Backup extension list
        try {
            $extensions = code --list-extensions 2>$null
            $extensions | Out-File "$backupDir\extensions.txt" -Encoding UTF8
        }
        catch {
            Write-Warning "Could not backup extension list"
        }

        Write-Fixed "Backup created at: $backupDir"
    }
    catch {
        Write-Issue "Failed to create backup: $_"
    }
}

function Remove-ProblematicExtensions {
    Write-Header "Removing Problematic Extensions"

    $problematic = Get-ProblematicExtensions

    if ($problematic.Count -eq 0) {
        Write-Fixed "No problematic extensions found"
        return
    }

    foreach ($ext in $problematic) {
        Write-Info "Removing extension: $ext"
        try {
            code --uninstall-extension $ext 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Fixed "Removed: $ext"
            } else {
                Write-Warning "Could not remove: $ext"
            }
        }
        catch {
            Write-Warning "Error removing $ext`: $_"
        }
    }
}

function Clean-CorruptedPrompts {
    Write-Header "Cleaning Corrupted Prompt Files"

    $paths = Get-VSCodePaths
    $promptsDir = $paths.PromptsDir

    if (-not (Test-Path $promptsDir)) {
        Write-Info "No prompts directory found"
        return
    }

    $problematicFiles = @(
        "news.toolsets.jsonc",
        "NEX15  Y NODE24.toolsets.jsonc",
        "URGENTEPARAIA.toolsets.jsonc"
    )

    foreach ($file in $problematicFiles) {
        $filePath = Join-Path $promptsDir $file
        if (Test-Path $filePath) {
            try {
                $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
                if ([string]::IsNullOrWhiteSpace($content) -or $content.Trim() -eq "") {
                    Write-Info "Removing empty file: $file"
                    Remove-Item $filePath -Force
                    Write-Fixed "Removed: $file"
                } else {
                    # Intentar reparar JSON básico
                    try {
                        $content | ConvertFrom-Json | Out-Null
                        Write-Fixed "File is valid: $file"
                    }
                    catch {
                        Write-Info "Fixing corrupted file: $file"
                        # Crear contenido JSON válido básico
                        $validContent = @{
                            "version" = "1.0"
                            "tools" = @()
                        } | ConvertTo-Json -Depth 3

                        $validContent | Out-File $filePath -Encoding UTF8 -Force
                        Write-Fixed "Fixed: $file"
                    }
                }
            }
            catch {
                Write-Warning "Could not process file: $file - $_"
            }
        }
    }
}

function Reset-VSCodeExtensionHost {
    Write-Header "Resetting Extension Host"

    Write-Info "Stopping all VS Code processes..."
    try {
        Get-Process code -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Fixed "VS Code processes stopped"
    }
    catch {
        Write-Warning "Could not stop VS Code processes"
    }

    # Limpiar cache de extensiones
    $paths = Get-VSCodePaths
    $cacheDir = $paths.CachedExtensions

    if (Test-Path $cacheDir) {
        try {
            Remove-Item $cacheDir -Recurse -Force
            Write-Fixed "Extension cache cleared"
        }
        catch {
            Write-Warning "Could not clear extension cache: $_"
        }
    }

    # Limpiar logs
    $logsDir = $paths.Logs
    if (Test-Path $logsDir) {
        try {
            Get-ChildItem $logsDir -Recurse -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
            Write-Fixed "Old log files cleared"
        }
        catch {
            Write-Warning "Could not clear old logs: $_"
        }
    }
}

function Fix-ProposedAPIIssues {
    Write-Header "Fixing Proposed API Issues"

    $paths = Get-VSCodePaths
    $settingsPath = $paths.Settings

    if (-not (Test-Path $settingsPath)) {
        Write-Info "Creating new settings file"
        $settings = @{}
    } else {
        try {
            $content = Get-Content $settingsPath -Raw
            $settings = $content | ConvertFrom-Json -AsHashtable
        }
        catch {
            Write-Warning "Settings file corrupted, creating new one"
            $settings = @{}
        }
    }

    # Configuraciones para manejar APIs propuestas
    $apiSettings = @{
        "extensions.autoUpdate" = $false
        "extensions.ignoreRecommendations" = $true
        "telemetry.telemetryLevel" = "off"
        "workbench.enableExperiments" = $false
        "python.analysis.autoImportCompletions" = $true
        "python.analysis.typeCheckingMode" = "basic"
    }

    $changed = $false
    foreach ($key in $apiSettings.Keys) {
        if ($settings[$key] -ne $apiSettings[$key]) {
            $settings[$key] = $apiSettings[$key]
            $changed = $true
            Write-Info "Updated setting: $key"
        }
    }

    if ($changed) {
        try {
            $settings | ConvertTo-Json -Depth 10 | Out-File $settingsPath -Encoding UTF8 -Force
            Write-Fixed "Settings updated to handle API issues"
        }
        catch {
            Write-Issue "Could not update settings: $_"
        }
    } else {
        Write-Fixed "Settings already optimized"
    }
}

function Repair-CopilotIntegration {
    Write-Header "Repairing Copilot Integration"

    # Verificar extensiones de Copilot
    try {
        $extensions = code --list-extensions 2>$null
        $copilotExtensions = @("GitHub.copilot", "GitHub.copilot-chat")
        $missing = @()

        foreach ($ext in $copilotExtensions) {
            if ($extensions -notcontains $ext) {
                $missing += $ext
            }
        }

        if ($missing.Count -gt 0) {
            Write-Info "Installing missing Copilot extensions..."
            foreach ($ext in $missing) {
                Write-Info "Installing $ext..."
                code --install-extension $ext --force 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Fixed "Installed: $ext"
                } else {
                    Write-Issue "Failed to install: $ext"
                }
            }
        } else {
            Write-Fixed "All Copilot extensions are installed"
        }

        # Verificar configuración de Copilot
        $paths = Get-VSCodePaths
        $settingsPath = $paths.Settings

        if (Test-Path $settingsPath) {
            try {
                $content = Get-Content $settingsPath -Raw
                $settings = $content | ConvertFrom-Json -AsHashtable

                $copilotSettings = @{
                    "github.copilot.enable" = @{
                        "*" = $true
                        "yaml" = $true
                        "plaintext" = $true
                        "markdown" = $true
                        "powershell" = $true
                        "typescript" = $true
                        "javascript" = $true
                    }
                    "github.copilot.advanced" = @{}
                    "github.copilot.chat.experimental.codeGeneration" = $true
                }

                $copilotChanged = $false
                foreach ($key in $copilotSettings.Keys) {
                    if (-not $settings.ContainsKey($key)) {
                        $settings[$key] = $copilotSettings[$key]
                        $copilotChanged = $true
                        Write-Info "Added Copilot setting: $key"
                    }
                }

                if ($copilotChanged) {
                    $settings | ConvertTo-Json -Depth 10 | Out-File $settingsPath -Encoding UTF8 -Force
                    Write-Fixed "Copilot settings updated"
                }
            }
            catch {
                Write-Warning "Could not update Copilot settings: $_"
            }
        }
    }
    catch {
        Write-Issue "Error repairing Copilot integration: $_"
    }
}

function Perform-FullRepair {
    Write-Header "Performing Full VS Code Repair"

    Write-Info "Starting comprehensive repair process..."

    # 1. Backup
    Backup-VSCodeConfig

    # 2. Limpiar archivos corruptos
    Clean-CorruptedPrompts

    # 3. Arreglar APIs propuestas
    Fix-ProposedAPIIssues

    # 4. Remover extensiones problemáticas
    Remove-ProblematicExtensions

    # 5. Reset extension host
    Reset-VSCodeExtensionHost

    # 6. Reparar Copilot
    Repair-CopilotIntegration

    # 7. Instalar extensiones esenciales
    Write-Info "Installing essential extensions..."
    & "$PSScriptRoot\install-vscode-extensions.ps1" -Essential

    Write-Header "Repair Complete"
    Write-Fixed "🎉 VS Code repair completed successfully!"
    Write-Info "💡 Next steps:"
    Write-Host "   1. Restart VS Code completely" -ForegroundColor White
    Write-Host "   2. Sign in to GitHub Copilot when prompted" -ForegroundColor White
    Write-Host "   3. Test Copilot with a simple code suggestion" -ForegroundColor White
    Write-Host "   4. Run PowerShell profile setup if needed" -ForegroundColor White
}

# Función principal
function Main {
    Clear-Host
    Write-Host "🔧 ALTAMEDICA VS Code Repair Tool" -ForegroundColor $Colors.Highlight
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor $Colors.Gray
    Write-Host "Diagnose and repair VS Code extension and configuration issues" -ForegroundColor $Colors.Info
    Write-Host ""

    if ($Status) {
        $issues = Test-VSCodeStatus
        Get-ProblematicExtensions | Out-Null

        if ($issues.Count -eq 0) {
            Write-Fixed "🎉 No major issues detected!"
        } else {
            Write-Warning "⚠️ Found $($issues.Count) issue(s) that need attention"
        }
        return
    }

    if ($CleanExtensions) {
        Remove-ProblematicExtensions
        return
    }

    if ($FixProposedAPI) {
        Fix-ProposedAPIIssues
        return
    }

    if ($CleanUserData) {
        Clean-CorruptedPrompts
        Reset-VSCodeExtensionHost
        return
    }

    if ($RepairCopilot) {
        Repair-CopilotIntegration
        return
    }

    if ($FullRepair) {
        Perform-FullRepair
        return
    }

    # Sin parámetros, mostrar ayuda
    Write-Host "Usage:" -ForegroundColor $Colors.Info
    Write-Host "   .\repair-vscode.ps1 -Status           # Check current status" -ForegroundColor White
    Write-Host "   .\repair-vscode.ps1 -FullRepair       # Perform complete repair" -ForegroundColor White
    Write-Host "   .\repair-vscode.ps1 -CleanExtensions  # Remove problematic extensions" -ForegroundColor White
    Write-Host "   .\repair-vscode.ps1 -FixProposedAPI   # Fix proposed API issues" -ForegroundColor White
    Write-Host "   .\repair-vscode.ps1 -RepairCopilot    # Repair Copilot integration" -ForegroundColor White
    Write-Host "   .\repair-vscode.ps1 -CleanUserData    # Clean corrupted user data" -ForegroundColor White
    Write-Host ""
    Write-Info "💡 Start with -Status to see what needs fixing"
    Write-Host ""
    Write-Info "🚨 Add -BackupFirst to any command to create a backup first"
    Write-Host ""
}

# Ejecutar función principal
Main
