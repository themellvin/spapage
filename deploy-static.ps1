param(
  [string]$SourcePath = "C:\Users\melvi\Documents\GitHub\spapage\web\app",
  [string]$StagePath = (Join-Path $env:TEMP "spapage-static-deploy"),
  [string]$PublishPath = "",
  [string]$LiveBaseUrl = "https://www.calcom.run.place",
  [switch]$RestartApache,
  [string]$ApacheServiceName = "Apache2.4"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Warn {
  param([string]$Message)
  Write-Host "WARN: $Message" -ForegroundColor Yellow
}

function Invoke-Robocopy {
  param(
    [string]$From,
    [string]$To,
    [string[]]$RoboArgs
  )

  & robocopy $From $To @RoboArgs
  $code = $LASTEXITCODE
  if ($code -ge 8) {
    throw "robocopy failed with exit code $code"
  }
}

function Get-Sha256 {
  param([string]$Path)
  (Get-FileHash -Algorithm SHA256 -Path $Path).Hash
}

function Resolve-ApacheService {
  param([string]$RequestedName)

  if ($RequestedName) {
    $exact = Get-Service -Name $RequestedName -ErrorAction SilentlyContinue
    if ($exact) {
      return $exact
    }

    function Test-LocalhostUrl {
      param([string]$Url)
      try {
        $uri = [Uri]$Url
        return $uri.Host -in @("localhost", "127.0.0.1")
      }
      catch {
        return $false
      }
    }
    Write-Warn "Service '$RequestedName' was not found. Attempting Apache service auto-detection."
  }

  $candidates = Get-Service | Where-Object {
    $_.Name -match "apache|httpd|xampp" -or
    $_.DisplayName -match "apache|httpd|xampp"
  } | Sort-Object @{ Expression = { $_.Status -eq "Running" }; Descending = $true }, Name

  if ($candidates.Count -gt 0) {
    return $candidates[0]
  }

  return $null
}

function Test-LiveMarker {
  param(
    [string]$Url,
    [string]$ExpectedMarker
  )
  $response = Invoke-WebRequest -Uri $Url -UseBasicParsing
  $ok = $response.Content -like "*$ExpectedMarker*"
  [PSCustomObject]@{
    Url = $Url
    StatusCode = [int]$response.StatusCode
    CacheControl = $response.Headers["Cache-Control"]
    MarkerFound = $ok
    Marker = $ExpectedMarker
  }
}

Write-Step "Preparing stage folder"
Remove-Item -LiteralPath $StagePath -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $StagePath | Out-Null

Write-Step "Copying HTML files to stage"
Invoke-Robocopy -From $SourcePath -To $StagePath -RoboArgs @("*.html", "/R:2", "/W:2")

Write-Step "Copying assets to stage"
Invoke-Robocopy -From (Join-Path $SourcePath "assets") -To (Join-Path $StagePath "assets") -RoboArgs @("/E", "/R:2", "/W:2", "/XD", ".env", ".venv", ".vscode", ".git")

Write-Step "Copying .htaccess to stage"
$htaccessSrc = Join-Path $SourcePath ".htaccess"
if (-not (Test-Path -LiteralPath $htaccessSrc)) {
  throw ".htaccess was not found at $htaccessSrc"
}
Copy-Item -LiteralPath $htaccessSrc -Destination (Join-Path $StagePath ".htaccess") -Force

Write-Step "Computing stage checksums"
$keyFiles = @(
  "index.html",
  "book.html",
  ".htaccess",
  "assets\js\cal-treatments.js",
  "assets\js\cal-booking.js"
)

$checksums = foreach ($relative in $keyFiles) {
  $path = Join-Path $StagePath $relative
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing expected staged file: $relative"
  }
  [PSCustomObject]@{
    File = $relative
    SHA256 = Get-Sha256 -Path $path
  }
}
$checksums | Format-Table -AutoSize

if ($PublishPath) {
  if ($PublishPath -match "^[A-Za-z]:\\xampp\\htdocs" -and -not (Test-LocalhostUrl -Url $LiveBaseUrl)) {
    Write-Warn "PublishPath appears local XAMPP ($PublishPath), but LiveBaseUrl is remote ($LiveBaseUrl). Live verification may fail unless this machine serves that domain."
  }

  Write-Step "Publishing stage to live root: $PublishPath"
  New-Item -ItemType Directory -Path $PublishPath -Force | Out-Null
  Invoke-Robocopy -From $StagePath -To $PublishPath -RoboArgs @("/E", "/R:2", "/W:2")

  if ($RestartApache) {
    Write-Step "Restarting Apache service"
    $apacheService = Resolve-ApacheService -RequestedName $ApacheServiceName
    if (-not $apacheService) {
      Write-Warn "No Apache-like Windows service found. Skipping restart."
    }
    else {
      Write-Host "Using service: $($apacheService.Name) [$($apacheService.DisplayName)]"
      try {
        Restart-Service -Name $apacheService.Name -Force -ErrorAction Stop
      }
      catch {
        Write-Warn "Could not restart service '$($apacheService.Name)'. Run PowerShell as Administrator or restart service manually."
      }
    }
  }
}
else {
  Write-Step "PublishPath not provided; stage-only run complete"
}

Write-Step "Verifying live markers over HTTP"
$checks = @(
  @{ Url = "$LiveBaseUrl/index.html"; ExpectedMarker = "assets/js/cal-treatments.js?v=6" },
  @{ Url = "$LiveBaseUrl/book.html"; ExpectedMarker = "assets/js/cal-booking.js?v=5" },
  @{ Url = "$LiveBaseUrl/assets/js/cal-treatments.js?v=6"; ExpectedMarker = "normalizeTreatmentBookingLinks" }
)

$liveResults = foreach ($check in $checks) {
  Test-LiveMarker -Url $check.Url -ExpectedMarker $check.ExpectedMarker
}
$liveResults | Format-Table -AutoSize

$missing = $liveResults | Where-Object { -not $_.MarkerFound }
if ($missing) {
  Write-Host ""
  Write-Host "Live verification failed for one or more markers." -ForegroundColor Yellow
  $missing | Format-Table -AutoSize
  exit 2
}

Write-Host ""
Write-Host "Deployment verification passed." -ForegroundColor Green
