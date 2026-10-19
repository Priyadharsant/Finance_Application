# Automated Hourly Database Backup Script for KAMBAM FINANCE (Neon PostgreSQL)
# Retains 3 full days of individual hourly backups (72 rolling slots)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$EnvFile = Join-Path $ProjectRoot "Backend\.env"
$BackupDir = Join-Path $ProjectRoot "Backend\backups"
$HourlyDir = Join-Path $BackupDir "hourly"

if (-not (Test-Path $HourlyDir)) {
    New-Item -ItemType Directory -Path $HourlyDir -Force | Out-Null
}

# Read database URL from .env
$PostgresUrl = $null
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^(?:POSTGRES_URL|DATABASE_URL)=(.*)$') {
            $val = $matches[1].Trim()
            if ($val -and -not $val.StartsWith("#")) {
                $PostgresUrl = $val
            }
        }
    }
}

if (-not $PostgresUrl) {
    Write-Error "Could not find POSTGRES_URL or DATABASE_URL in $EnvFile"
    exit 1
}

$Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH-mm-ss")
$LatestFile = Join-Path $BackupDir "latest_backup.sql.gz"
$TimestampedFile = Join-Path $HourlyDir "backup_$Timestamp.sql.gz"
$TempFile = Join-Path $BackupDir "temp_$Timestamp.sql.gz"

Write-Host "[Backup] Running full database backup from Neon PostgreSQL..."
& pg_dump -d $PostgresUrl -Z 6 -f $TempFile

if (Test-Path $TempFile) {
    Copy-Item -Path $TempFile -Destination $LatestFile -Force
    Move-Item -Path $TempFile -Destination $TimestampedFile -Force

    $Size = (Get-Item $LatestFile).Length
    $SizeKb = [math]::Round($Size / 1024, 1)
    Write-Host "[Backup] Backup succeeded: $SizeKb KB"
    Write-Host "[Backup] Saved to: $TimestampedFile"
    Write-Host "[Backup] Updated pointer: $LatestFile"

    # Retain only the latest 72 hourly files (3 days)
    Get-ChildItem -Path $HourlyDir -Filter "backup_*.sql.gz" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 72 |
        Remove-Item -Force -ErrorAction SilentlyContinue

    Write-Host "[Backup] Finished successfully (retained 3-day window)."
} else {
    Write-Error "Backup file was not created by pg_dump."
    exit 1
}
