#----------------------------------------------------------------------
# 🤖 ALTAMEDICA COPILOT ENHANCED POWERSHELL PROFILE
# Integración completa de GitHub Copilot con PowerShell
# Fecha: 20 de junio de 2025
#----------------------------------------------------------------------

# Configuración de encoding para caracteres especiales
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Configuración de colores mejorada
$PSStyle.FileInfo.Directory = "`e[94m"
$PSStyle.FileInfo.Executable = "`e[92m"
$PSStyle.FileInfo.Extension['.json'] = "`e[93m"
$PSStyle.FileInfo.Extension['.ts'] = "`e[96m"
$PSStyle.FileInfo.Extension['.tsx'] = "`e[96m"
$PSStyle.FileInfo.Extension['.js'] = "`e[93m"
$PSStyle.FileInfo.Extension['.jsx'] = "`e[93m"

# Variables globales
$Global:AltamedicaPath = "C:\Users\Eduardo\Documents\ALTAMEDICADEV"
$Global:CopilotEnabled = $true

# Banner de bienvenida
function Show-AltamedicaBanner {
    $banner = @"
╔══════════════════════════════════════════════════════════════════════╗
║  🏥 ALTAMEDICA DEV ENVIRONMENT + 🤖 GITHUB COPILOT INTEGRATION      ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║  📅 $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') | PowerShell $($PSVersionTable.PSVersion)      ║
║  📂 Workspace: ALTAMEDICADEV                                        ║
║  🤖 Copilot: ENABLED                                                ║
╚══════════════════════════════════════════════════════════════════════╝
"@
    Write-Host $banner -ForegroundColor Cyan
    Write-Host ""
}

# Función para verificar Copilot
function Test-CopilotAvailability {
    try {
        if (Get-Command code -ErrorAction SilentlyContinue) {
            $extensions = code --list-extensions 2>$null
            if ($extensions -match "github.copilot") {
                Write-Host "✅ GitHub Copilot está disponible" -ForegroundColor Green
                return $true
            }
        }
        Write-Host "⚠️  GitHub Copilot no detectado en VS Code" -ForegroundColor Yellow
        return $false
    }
    catch {
        Write-Host "❌ Error verificando Copilot: $_" -ForegroundColor Red
        return $false
    }
}

# Funciones de Copilot Chat
function cc {
    param([string]$Question)
    if (-not $Question) {
        Write-Host "❓ Uso: cc 'tu pregunta para Copilot'" -ForegroundColor Yellow
        return
    }

    Write-Host "🤖 Preguntando a Copilot: $Question" -ForegroundColor Cyan

    # Abrir VS Code con Copilot Chat
    if (Test-Path $Global:AltamedicaPath) {
        Push-Location $Global:AltamedicaPath
        code . --command "github.copilot.interactiveEditor.explain"
        Pop-Location
    }
}

function Ask-Code {
    param([string]$FilePath)
    if (-not $FilePath) {
        Write-Host "❓ Uso: Ask-Code 'archivo.ts'" -ForegroundColor Yellow
        return
    }

    if (Test-Path $FilePath) {
        Write-Host "🔍 Analizando código: $FilePath" -ForegroundColor Cyan
        code $FilePath --command "github.copilot.interactiveEditor.explain"
    } else {
        Write-Host "❌ Archivo no encontrado: $FilePath" -ForegroundColor Red
    }
}

function Fix-Code {
    param([string]$ErrorDescription)
    if (-not $ErrorDescription) {
        Write-Host "❓ Uso: Fix-Code 'descripción del error'" -ForegroundColor Yellow
        return
    }

    Write-Host "🔧 Solicitando ayuda para: $ErrorDescription" -ForegroundColor Cyan
    cc "Ayúdame a resolver este error: $ErrorDescription"
}

function Gen-Code {
    param([string]$Description)
    if (-not $Description) {
        Write-Host "❓ Uso: Gen-Code 'descripción de la funcionalidad'" -ForegroundColor Yellow
        return
    }

    Write-Host "⚙️ Generando código para: $Description" -ForegroundColor Cyan
    cc "Genera código para: $Description"
}

function Start-CopilotSession {
    Write-Host "🚀 Iniciando sesión interactiva con Copilot..." -ForegroundColor Green
    if (Test-Path $Global:AltamedicaPath) {
        Set-Location $Global:AltamedicaPath
        code . --command "github.copilot.toggleCopilot"
    }
}

function Open-Copilot {
    Write-Host "🤖 Abriendo VS Code con Copilot..." -ForegroundColor Green
    if (Test-Path $Global:AltamedicaPath) {
        Set-Location $Global:AltamedicaPath
        code .
    }
}

# Comandos rápidos de ALTAMEDICA
function af-status {
    Write-Host "📊 ALTAMEDICA Project Status" -ForegroundColor Magenta
    if (Test-Path "$Global:AltamedicaPath\package.json") {
        Write-Host "✅ Proyecto detectado" -ForegroundColor Green
        Push-Location $Global:AltamedicaPath

        # Verificar Git status
        if (Get-Command git -ErrorAction SilentlyContinue) {
            Write-Host "`n📝 Git Status:" -ForegroundColor Yellow
            git status --short
        }

        # Verificar dependencias
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            Write-Host "`n📦 Verificando dependencias..." -ForegroundColor Yellow
            $outdated = pnpm outdated 2>$null
            if ($outdated) {
                Write-Host "⚠️ Hay dependencias desactualizadas" -ForegroundColor Yellow
            } else {
                Write-Host "✅ Dependencias actualizadas" -ForegroundColor Green
            }
        }

        Pop-Location
    } else {
        Write-Host "❌ Proyecto ALTAMEDICA no encontrado" -ForegroundColor Red
    }
}

function af-dev {
    Write-Host "🚀 Iniciando entorno de desarrollo ALTAMEDICA..." -ForegroundColor Green
    if (Test-Path $Global:AltamedicaPath) {
        Set-Location $Global:AltamedicaPath
        Write-Host "📂 Ubicación: $PWD" -ForegroundColor Cyan

        # Abrir VS Code con Copilot
        Start-Process "code" -ArgumentList "."

        # Verificar si hay un dev server configurado
        if (Test-Path "package.json") {
            $package = Get-Content "package.json" | ConvertFrom-Json
            if ($package.scripts.dev) {
                Write-Host "▶️ Ejecutar: pnpm dev (para iniciar servidor)" -ForegroundColor Yellow
            }
        }
    }
}

function af-build {
    Write-Host "🔨 Construyendo proyecto ALTAMEDICA..." -ForegroundColor Green
    if (Test-Path $Global:AltamedicaPath) {
        Push-Location $Global:AltamedicaPath
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm build
        } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            npm run build
        } else {
            Write-Host "❌ No se encontró pnpm o npm" -ForegroundColor Red
        }
        Pop-Location
    }
}

function af-test {
    Write-Host "🧪 Ejecutando tests ALTAMEDICA..." -ForegroundColor Green
    if (Test-Path $Global:AltamedicaPath) {
        Push-Location $Global:AltamedicaPath
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm test
        } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            npm test
        }
        Pop-Location
    }
}

function af-lint {
    Write-Host "🔍 Verificando código con linter..." -ForegroundColor Green
    if (Test-Path $Global:AltamedicaPath) {
        Push-Location $Global:AltamedicaPath
        if (Get-Command pnpm -ErrorAction SilentlyContinue) {
            pnpm lint
        } elseif (Get-Command npm -ErrorAction SilentlyContinue) {
            npm run lint
        }
        Pop-Location
    }
}

function af-copilot {
    Write-Host "🤖 GitHub Copilot Quick Actions" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Yellow
    Write-Host "  cc 'pregunta'              - Chat rápido con Copilot" -ForegroundColor White
    Write-Host "  Ask-Code 'archivo'         - Analizar código" -ForegroundColor White
    Write-Host "  Fix-Code 'error'           - Solicitar corrección" -ForegroundColor White
    Write-Host "  Gen-Code 'descripción'     - Generar código" -ForegroundColor White
    Write-Host "  Start-CopilotSession       - Sesión interactiva" -ForegroundColor White
    Write-Host "  Open-Copilot               - Abrir VS Code" -ForegroundColor White
    Write-Host ""
}

# Aliases útiles
Set-Alias -Name "ll" -Value "Get-ChildItem"
Set-Alias -Name "la" -Value "Get-ChildItem -Force"
Set-Alias -Name "cls" -Value "Clear-Host"
Set-Alias -Name "code" -Value "code.cmd" -ErrorAction SilentlyContinue

# Función para navegación rápida
function cdp {
    Set-Location $Global:AltamedicaPath
    Write-Host "📂 ALTAMEDICA Project Directory" -ForegroundColor Cyan
}

function cda {
    Set-Location "$Global:AltamedicaPath\apps"
    Write-Host "📱 Apps Directory" -ForegroundColor Cyan
}

function cdapi {
    Set-Location "$Global:AltamedicaPath\apps\api-server"
    Write-Host "🔌 API Server Directory" -ForegroundColor Cyan
}

function cdpkg {
    Set-Location "$Global:AltamedicaPath\packages"
    Write-Host "📦 Packages Directory" -ForegroundColor Cyan
}

# Función de ayuda
function Get-AltamedicaHelp {
    Write-Host ""
    Write-Host "🏥 ALTAMEDICA Development Commands" -ForegroundColor Magenta
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📂 Navigation:" -ForegroundColor Yellow
    Write-Host "  cdp        - Go to project root" -ForegroundColor White
    Write-Host "  cda        - Go to apps directory" -ForegroundColor White
    Write-Host "  cdapi      - Go to API server" -ForegroundColor White
    Write-Host "  cdpkg      - Go to packages" -ForegroundColor White
    Write-Host ""
    Write-Host "⚡ Quick Actions:" -ForegroundColor Yellow
    Write-Host "  af-status  - Project status" -ForegroundColor White
    Write-Host "  af-dev     - Start development" -ForegroundColor White
    Write-Host "  af-build   - Build project" -ForegroundColor White
    Write-Host "  af-test    - Run tests" -ForegroundColor White
    Write-Host "  af-lint    - Run linter" -ForegroundColor White
    Write-Host ""
    Write-Host "🤖 Copilot:" -ForegroundColor Yellow
    Write-Host "  af-copilot - Show Copilot commands" -ForegroundColor White
    Write-Host "  cc 'text'  - Quick chat with Copilot" -ForegroundColor White
    Write-Host ""
    Write-Host "❓ Help:" -ForegroundColor Yellow
    Write-Host "  Get-AltamedicaHelp - Show this help" -ForegroundColor White
    Write-Host ""
}

Set-Alias -Name "help" -Value "Get-AltamedicaHelp"
Set-Alias -Name "?" -Value "Get-AltamedicaHelp"

# Prompt personalizado con indicadores de Git y Copilot
function prompt {
    $currentPath = $PWD.Path
    $isAltamedica = $currentPath.StartsWith($Global:AltamedicaPath)

    # Indicador de ubicación
    if ($isAltamedica) {
        $shortPath = $currentPath.Replace($Global:AltamedicaPath, "ALTAMEDICA")
        Write-Host "🏥 " -NoNewline -ForegroundColor Cyan
    } else {
        $shortPath = Split-Path $currentPath -Leaf
        Write-Host "📁 " -NoNewline -ForegroundColor Gray
    }

    Write-Host $shortPath -NoNewline -ForegroundColor White

    # Indicador de Git si estamos en un repo
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $gitBranch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($gitBranch) {
            Write-Host " 🌿" -NoNewline -ForegroundColor Green
            Write-Host $gitBranch -NoNewline -ForegroundColor Yellow

            # Estado de Git
            $gitStatus = git status --porcelain 2>$null
            if ($gitStatus) {
                Write-Host " ●" -NoNewline -ForegroundColor Red
            }
        }
    }

    # Indicador de Copilot
    if ($Global:CopilotEnabled) {
        Write-Host " 🤖" -NoNewline -ForegroundColor Magenta
    }

    Write-Host ""
    return "▶ "
}

# Configuración de PSReadLine para mejor experiencia
if (Get-Module -ListAvailable PSReadLine) {
    Import-Module PSReadLine
    Set-PSReadLineOption -PredictionSource History
    Set-PSReadLineOption -HistorySearchCursorMovesToEnd
    Set-PSReadLineKeyHandler -Chord "Ctrl+f" -Function ForwardWord
    Set-PSReadLineKeyHandler -Chord "Ctrl+b" -Function BackwardWord
    Set-PSReadLineOption -ShowToolTips
}

# Verificar y mostrar estado inicial
Show-AltamedicaBanner
Test-CopilotAvailability

# Ir al directorio del proyecto al iniciar
if (Test-Path $Global:AltamedicaPath) {
    Set-Location $Global:AltamedicaPath
}

Write-Host "✨ Perfil de Copilot cargado. Escribe " -NoNewline -ForegroundColor Green
Write-Host "help" -NoNewline -ForegroundColor Yellow
Write-Host " para ver comandos disponibles." -ForegroundColor Green
Write-Host ""
