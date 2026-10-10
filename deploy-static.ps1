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
  Write-Step "Publishing stage to live root: $PublishPath"
  New-Item -ItemType Directory -Path $PublishPath -Force | Out-Null
  Invoke-Robocopy -From $StagePath -To $PublishPath -RoboArgs @("/E", "/R:2", "/W:2")

  if ($RestartApache) {
    Write-Step "Restarting Apache service: $ApacheServiceName"
    Restart-Service -Name $ApacheServiceName -Force
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
