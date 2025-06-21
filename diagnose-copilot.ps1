#----------------------------------------------------------------------
# 🔧 ALTAMEDICA COPILOT DIAGNOSTIC TOOL
# Herramienta de diagnóstico y solución de problemas con Copilot
#----------------------------------------------------------------------

param(
    [switch]$Fix,
    [switch]$Detailed,
    [switch]$Reset
)

$Script:Issues = @()
$Script:Fixes = @()

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
    Write-Host "🔍 $Title" -ForegroundColor $Colors.Highlight
    Write-Host ("━" * ($Title.Length + 3)) -ForegroundColor $Colors.Gray
}

function Write-Issue {
    param([string]$Message, [string]$Fix = "")
    Write-Host "❌ $Message" -ForegroundColor $Colors.Error
    $Script:Issues += $Message
    if ($Fix) {
        $Script:Fixes += $Fix
    }
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Colors.Warning
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Colors.Success
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor $Colors.Info
}

function Test-PowerShellVersion {
    Write-Header "PowerShell Version Check"

    $version = $PSVersionTable.PSVersion
    Write-Info "PowerShell Version: $version"

    if ($version.Major -lt 7) {
        Write-Issue "PowerShell 7+ recommended for best Copilot experience" "Install PowerShell 7: https://aka.ms/powershell"
    } else {
        Write-Success "PowerShell version is compatible"
    }

    # Verificar ExecutionPolicy
    $policy = Get-ExecutionPolicy
    Write-Info "Execution Policy: $policy"

    if ($policy -eq "Restricted") {
        Write-Issue "Execution Policy is too restrictive" "Run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser"
    } else {
        Write-Success "Execution Policy allows script execution"
    }
}

function Test-RequiredTools {
    Write-Header "Required Tools Check"

    # VS Code
    if (Get-Command code -ErrorAction SilentlyContinue) {
        Write-Success "VS Code found"

        # Verificar extensiones
        try {
            $extensions = code --list-extensions 2>$null

            if ($extensions -match "github.copilot") {
                Write-Success "GitHub Copilot extension installed"
            } else {
                Write-Issue "GitHub Copilot extension missing" "code --install-extension GitHub.copilot"
            }

            if ($extensions -match "github.copilot-chat") {
                Write-Success "GitHub Copilot Chat extension installed"
            } else {
                Write-Issue "GitHub Copilot Chat extension missing" "code --install-extension GitHub.copilot-chat"
            }

            if ($extensions -match "ms-vscode.powershell") {
                Write-Success "PowerShell extension installed"
            } else {
                Write-Warning "PowerShell extension missing (recommended)"
            }
        }
        catch {
            Write-Warning "Could not check VS Code extensions"
        }
    } else {
        Write-Issue "VS Code not found in PATH" "Install VS Code: https://code.visualstudio.com/"
    }

    # Git
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-Success "Git found"
        $gitVersion = git --version
        Write-Info "Git version: $gitVersion"
    } else {
        Write-Issue "Git not found" "Install Git: https://git-scm.com/"
    }

    # GitHub CLI (opcional)
    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-Success "GitHub CLI found"

        try {
            $authStatus = gh auth status 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "GitHub CLI authenticated"
            } else {
                Write-Warning "GitHub CLI not authenticated (run: gh auth login)"
            }
        }
        catch {
            Write-Warning "Could not check GitHub CLI auth status"
        }
    } else {
        Write-Warning "GitHub CLI not found (optional but recommended)"
    }

    # Node.js (para proyectos)
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    } else {
        Write-Warning "Node.js not found (needed for ALTAMEDICA project)"
    }

    # PNPM
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        $pnpmVersion = pnpm --version
        Write-Success "PNPM found: v$pnpmVersion"
    } else {
        Write-Warning "PNPM not found (recommended for ALTAMEDICA)"
    }
}

function Test-PowerShellProfile {
    Write-Header "PowerShell Profile Check"

    $profilePath = $PROFILE.CurrentUserAllHosts
    Write-Info "Profile path: $profilePath"

    if (Test-Path $profilePath) {
        Write-Success "PowerShell profile exists"

        $content = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue
        if ($content -match "copilot-enhanced-profile" -or $content -match "ALTAMEDICA") {
            Write-Success "ALTAMEDICA Copilot integration detected in profile"
        } else {
            Write-Issue "ALTAMEDICA Copilot integration not found in profile" "Run: .\setup-copilot-integration.ps1 -Install"
        }
    } else {
        Write-Issue "PowerShell profile not found" "Run: .\setup-copilot-integration.ps1 -Install"
    }

    # Verificar archivo de perfil de Copilot
    $copilotProfile = Join-Path $PSScriptRoot "copilot-enhanced-profile.ps1"
    if (Test-Path $copilotProfile) {
        Write-Success "Copilot enhanced profile file exists"
    } else {
        Write-Issue "Copilot enhanced profile file missing" "Ensure copilot-enhanced-profile.ps1 exists in project directory"
    }
}

function Test-ProjectStructure {
    Write-Header "ALTAMEDICA Project Structure Check"

    $projectPath = "C:\Users\Eduardo\Documents\ALTAMEDICADEV"

    if (Test-Path $projectPath) {
        Write-Success "ALTAMEDICA project directory found"

        # Verificar archivos clave
        $keyFiles = @(
            "package.json",
            "tsconfig.json",
            "next.config.ts",
            "copilot-enhanced-profile.ps1"
        )

        foreach ($file in $keyFiles) {
            $filePath = Join-Path $projectPath $file
            if (Test-Path $filePath) {
                Write-Success "$file found"
            } else {
                Write-Warning "$file missing"
            }
        }

        # Verificar directorios clave
        $keyDirs = @(
            "apps",
            "packages",
            "apps\api-server"
        )

        foreach ($dir in $keyDirs) {
            $dirPath = Join-Path $projectPath $dir
            if (Test-Path $dirPath) {
                Write-Success "$dir directory found"
            } else {
                Write-Warning "$dir directory missing"
            }
        }
    } else {
        Write-Issue "ALTAMEDICA project directory not found" "Ensure project is cloned to: $projectPath"
    }
}

function Test-WindowsTerminal {
    Write-Header "Windows Terminal Configuration Check"

    $terminalSettings = "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"

    if (Test-Path $terminalSettings) {
        Write-Success "Windows Terminal settings found"

        try {
            $settings = Get-Content $terminalSettings | ConvertFrom-Json
            $copilotProfile = $settings.profiles.list | Where-Object { $_.name -match "COPILOT" }

            if ($copilotProfile) {
                Write-Success "Copilot-optimized terminal profile found"
            } else {
                Write-Warning "No Copilot-optimized terminal profile found"
            }
        }
        catch {
            Write-Warning "Could not parse Windows Terminal settings"
        }
    } else {
        Write-Warning "Windows Terminal settings not found"
    }
}

function Test-NetworkConnectivity {
    Write-Header "Network Connectivity Check"

    $testUrls = @(
        "github.com",
        "api.github.com",
        "copilot-proxy.githubusercontent.com"
    )

    foreach ($url in $testUrls) {
        try {
            $result = Test-NetConnection -ComputerName $url -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
            if ($result) {
                Write-Success "Can reach $url"
            } else {
                Write-Issue "Cannot reach $url" "Check internet connection and firewall settings"
            }
        }
        catch {
            Write-Warning "Could not test connectivity to $url"
        }
    }
}

function Test-VSCodeIntegrity {
    Write-Header "VS Code Integrity Check"

    try {
        # Verificar archivos de configuración corruptos
        $userDataPath = "$env:APPDATA\Code\User"
        $promptsPath = "$userDataPath\prompts"

        if (Test-Path $promptsPath) {
            $corruptedPrompts = Get-ChildItem $promptsPath -Filter "*.toolsets.jsonc" | Where-Object {
                try {
                    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
                    return [string]::IsNullOrWhiteSpace($content)
                }
                catch {
                    return $true
                }
            }

            if ($corruptedPrompts) {
                Write-Issue "Found $($corruptedPrompts.Count) corrupted prompt files"
                foreach ($file in $corruptedPrompts) {
                    Write-Host "  • $($file.Name)" -ForegroundColor $Colors.Error
                }
            } else {
                Write-Success "Prompt files are valid"
            }
        }

        # Verificar extensiones problemáticas
        $problematicExtensions = @(
            "betterthantomorrow.calva-backseat-driver",
            "ms-edgedevtools.vscode-edge-devtools",
            "vsls-contrib.gistfs",
            "WallabyJs.console-ninja"
        )

        $installed = code --list-extensions 2>$null
        $foundProblematic = $installed | Where-Object { $_ -in $problematicExtensions }

        if ($foundProblematic) {
            Write-Issue "Found problematic extensions causing API errors"
            foreach ($ext in $foundProblematic) {
                Write-Host "  • $ext" -ForegroundColor $Colors.Error
            }
        } else {
            Write-Success "No problematic extensions found"
        }

        # Verificar configuración de VS Code
        $settingsPath = "$userDataPath\settings.json"
        if (Test-Path $settingsPath) {
            try {
                $settings = Get-Content $settingsPath | ConvertFrom-Json
                Write-Success "VS Code settings file is valid"
            }
            catch {
                Write-Issue "VS Code settings file is corrupted"
            }
        }

        return $true
    }
    catch {
        Write-Error "Failed to check VS Code integrity: $_"
        return $false
    }
}

function Apply-CommonFixes {
    Write-Header "Applying Common Fixes"

    if ($Script:Fixes.Count -eq 0) {
        Write-Success "No fixes needed"
        return
    }

    Write-Info "Found $($Script:Issues.Count) issues with suggested fixes:"

    for ($i = 0; $i -lt $Script:Fixes.Count; $i++) {
        Write-Host ""
        Write-Host "Issue: " -NoNewline -ForegroundColor $Colors.Error
        Write-Host $Script:Issues[$i] -ForegroundColor White
        Write-Host "Fix: " -NoNewline -ForegroundColor $Colors.Success
        Write-Host $Script:Fixes[$i] -ForegroundColor Yellow

        if ($Fix) {
            $response = Read-Host "Apply this fix? (y/N)"
            if ($response -eq 'y' -or $response -eq 'Y') {
                try {
                    if ($Script:Fixes[$i].StartsWith("code --install-extension")) {
                        $extension = $Script:Fixes[$i].Replace("code --install-extension ", "")
                        Write-Info "Installing VS Code extension: $extension"
                        Invoke-Expression $Script:Fixes[$i]
                    }
                    elseif ($Script:Fixes[$i].StartsWith("Set-ExecutionPolicy")) {
                        Write-Info "Changing execution policy..."
                        Invoke-Expression $Script:Fixes[$i]
                    }
                    elseif ($Script:Fixes[$i].StartsWith("Run:")) {
                        $command = $Script:Fixes[$i].Replace("Run: ", "")
                        Write-Info "Execute manually: $command"
                    }
                    else {
                        Write-Info "Manual action required: $($Script:Fixes[$i])"
                    }
                }
                catch {
                    Write-Error "Failed to apply fix: $_"
                }
            }
        }
    }
}

function Reset-CopilotIntegration {
    Write-Header "Resetting Copilot Integration"

    if (-not $Reset) {
        return
    }

    Write-Warning "This will reset your PowerShell profile and Copilot integration"
    $response = Read-Host "Continue? (y/N)"

    if ($response -ne 'y' -and $response -ne 'Y') {
        Write-Info "Reset cancelled"
        return
    }

    try {
        # Backup existing profile
        if (Test-Path $PROFILE.CurrentUserAllHosts) {
            $backupPath = "$($PROFILE.CurrentUserAllHosts).backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Copy-Item $PROFILE.CurrentUserAllHosts $backupPath
            Write-Success "Backed up profile to: $backupPath"
        }

        # Remove profile
        if (Test-Path $PROFILE.CurrentUserAllHosts) {
            Remove-Item $PROFILE.CurrentUserAllHosts -Force
            Write-Success "Removed PowerShell profile"
        }

        # Reinstall
        Write-Info "Reinstalling Copilot integration..."
        & "$PSScriptRoot\setup-copilot-integration.ps1" -Install -Force

        Write-Success "Reset complete. Restart PowerShell to apply changes."
    }
    catch {
        Write-Error "Reset failed: $_"
    }
}

function Show-Summary {
    Write-Header "Diagnostic Summary"

    if ($Script:Issues.Count -eq 0) {
        Write-Success "🎉 No issues found! Copilot integration should work perfectly."
    } else {
        Write-Warning "⚠️ Found $($Script:Issues.Count) issue(s) that may affect Copilot integration:"
        foreach ($issue in $Script:Issues) {
            Write-Host "  • $issue" -ForegroundColor $Colors.Error
        }

        Write-Host ""
        Write-Info "💡 Suggested next steps:"
        Write-Host "  1. Run with -Fix to apply automatic fixes" -ForegroundColor White
        Write-Host "  2. Run .\setup-copilot-integration.ps1 -Install" -ForegroundColor White
        Write-Host "  3. Restart PowerShell" -ForegroundColor White
        Write-Host "  4. Test with 'cc \"hello copilot\"'" -ForegroundColor White
    }
}

# Función principal
function Main {
    Clear-Host
    Write-Host "🔧 ALTAMEDICA Copilot Diagnostic Tool" -ForegroundColor $Colors.Highlight
    Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor $Colors.Gray
    Write-Host "This tool will diagnose common issues with GitHub Copilot integration" -ForegroundColor $Colors.Info
    Write-Host ""

    # Ejecutar diagnósticos
    Test-PowerShellVersion
    Test-RequiredTools
    Test-PowerShellProfile
    Test-ProjectStructure
    Test-WindowsTerminal

    if ($Detailed) {
        Test-NetworkConnectivity
    }

    # Reset si se solicitó
    Reset-CopilotIntegration

    # Aplicar correcciones si se solicitó
    if ($Fix -or $Script:Fixes.Count -gt 0) {
        Apply-CommonFixes
    }

    # Mostrar resumen
    Show-Summary

    Write-Host ""
    Write-Host "💡 For more help, visit: https://docs.github.com/en/copilot" -ForegroundColor $Colors.Info
    Write-Host ""
}

# Ejecutar
Main
