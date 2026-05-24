# XAMPP MySQL helper for Nepal Stays (no admin required for start/stop/backup).
# Run install-service as Administrator once so XAMPP Control Panel matches Windows service "mysql".

param(
    [Parameter(Position = 0)]
    [ValidateSet('status', 'start', 'stop', 'restart', 'backup', 'install-service', 'test')]
    [string]$Action = 'status',

    [string]$XamppRoot = 'C:\xampp',
    [string]$DbName = 'nepal_stays',
    [string]$DbHost = '127.0.0.1',
    [int]$DbPort = 3306,
    [string]$DbUser = 'root',
    [string]$DbPassword = ''
)

$ErrorActionPreference = 'Stop'
$MysqlBin = Join-Path $XamppRoot 'mysql\bin'
$Mysqld = Join-Path $MysqlBin 'mysqld.exe'
$Mysql = Join-Path $MysqlBin 'mysql.exe'
$MysqlAdmin = Join-Path $MysqlBin 'mysqladmin.exe'
$Mysqldump = Join-Path $MysqlBin 'mysqldump.exe'
$MyIni = Join-Path $MysqlBin 'my.ini'
$DataDir = Join-Path $XamppRoot 'mysql\data'
$BackupDir = Join-Path $PSScriptRoot '..\backups' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $BackupDir) { $BackupDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'backups' }

function Test-XamppPaths {
    if (-not (Test-Path $Mysqld)) {
        throw "XAMPP MySQL not found at $Mysqld. Set -XamppRoot if XAMPP is installed elsewhere."
    }
}

function Get-MysqldProcess {
    Get-Process -Name mysqld -ErrorAction SilentlyContinue
}

function Get-PidFileValue {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return $null }
    $raw = Get-Content $Path -Raw -ErrorAction SilentlyContinue
    if ($null -eq $raw) { return $null }
    $value = $raw.Trim()
    if ([string]::IsNullOrWhiteSpace($value)) { return $null }
    return $value
}

function Remove-StalePidFiles {
    foreach ($pidFile in @('mysql.pid', "$env:COMPUTERNAME.pid")) {
        $path = Join-Path $DataDir $pidFile
        if (-not (Test-Path $path)) { continue }
        $stalePid = Get-PidFileValue -Path $path
        if (-not $stalePid) {
            Remove-Item $path -Force -ErrorAction SilentlyContinue
            Write-Host "Removed empty or invalid PID file ($pidFile)."
            continue
        }
        if (-not (Get-Process -Id $stalePid -ErrorAction SilentlyContinue)) {
            Remove-Item $path -Force -ErrorAction SilentlyContinue
            Write-Host "Removed stale PID file ($stalePid)."
        }
    }
}

function Test-MySqlPing {
    # mysqladmin writes to stderr when down; do not let that abort the script.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'SilentlyContinue'
    try {
        & $MysqlAdmin -h $DbHost -P $DbPort -u $DbUser $(if ($DbPassword) { "-p$DbPassword" }) ping 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Invoke-Status {
    Test-XamppPaths
    $proc = Get-MysqldProcess
    $port = netstat -ano | Select-String ":$DbPort\s" | Select-String 'LISTENING'
    $svc = Get-Service -Name 'mysql' -ErrorAction SilentlyContinue
    Write-Host "XAMPP root:     $XamppRoot"
    Write-Host "mysqld.exe:     $(if ($proc) { "running (PID $($proc.Id -join ', '))" } else { 'not running' })"
    Write-Host "Port ${DbPort}:     $(if ($port) { 'LISTENING' } else { 'free' })"
    Write-Host "mysql service:  $(if ($svc) { "$($svc.Status) ($($svc.StartType))" } else { 'not installed (use install-service as Admin)' })"
    Write-Host "Ping:           $(if (Test-MySqlPing) { 'OK' } else { 'no response' })"
    $pidValue = Get-PidFileValue -Path (Join-Path $DataDir 'mysql.pid')
    if ($pidValue) {
        Write-Host "PID file:       $pidValue"
    } elseif (Test-Path (Join-Path $DataDir 'mysql.pid')) {
        Write-Host 'PID file:       (empty — run start to recreate or delete mysql.pid)'
    }
}

function Invoke-Start {
    Test-XamppPaths
    if (Test-MySqlPing) {
        Write-Host 'MySQL already responding.'
        return
    }
    Remove-StalePidFiles
    Start-Process -FilePath $Mysqld -ArgumentList "--defaults-file=`"$MyIni`"" -WindowStyle Minimized
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        if (Test-MySqlPing) {
            Write-Host 'MySQL started.'
            return
        }
        Start-Sleep -Milliseconds 500
    }
    throw 'MySQL did not respond. Check C:\xampp\mysql\data\mysql_error.log'
}

function Invoke-Stop {
    Test-XamppPaths
    $svc = Get-Service -Name 'mysql' -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq 'Running') {
        Stop-Service -Name 'mysql' -Force
        Start-Sleep -Seconds 3
    }
    if (Test-MySqlPing) {
        & $MysqlAdmin -h $DbHost -P $DbPort -u $DbUser $(if ($DbPassword) { "-p$DbPassword" }) shutdown 2>$null
        Start-Sleep -Seconds 4
    }
    $stopBat = Join-Path $XamppRoot 'mysql_stop.bat'
    if (Get-MysqldProcess) {
        if (Test-Path $stopBat) {
            & cmd.exe /c "`"$stopBat`""
        } else {
            Get-MysqldProcess | Stop-Process -Force
        }
        Start-Sleep -Seconds 2
    }
    foreach ($pidFile in @('mysql.pid', "$env:COMPUTERNAME.pid")) {
        $path = Join-Path $DataDir $pidFile
        if (Test-Path $path) { Remove-Item $path -Force -ErrorAction SilentlyContinue }
    }
    Write-Host 'MySQL stopped.'
}

function Invoke-Backup {
    Test-XamppPaths
    if (-not (Test-MySqlPing)) { throw 'MySQL is not running. Run: .\xampp-mysql.ps1 start' }
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $outFile = Join-Path $BackupDir "$DbName-full-$stamp.sql"
    $args = @(
        '-h', $DbHost,
        '-P', $DbPort,
        '-u', $DbUser,
        '--skip-comments',
        '--single-transaction',
        '--routines',
        '--triggers',
        '--events',
        '--hex-blob',
        '--complete-insert',
        '--add-drop-table',
        '--databases', $DbName
    )
    if ($DbPassword) { $args += @("-p$DbPassword") }
    & $Mysqldump @args | Set-Content -Path $outFile -Encoding utf8
    if ($LASTEXITCODE -ne 0) { throw "mysqldump failed (exit $LASTEXITCODE)" }
    $info = Get-Item $outFile
    Write-Host "Backup: $($info.FullName) ($([math]::Round($info.Length / 1MB, 2)) MB)"
}

function Invoke-InstallService {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
    if (-not $isAdmin) {
        throw 'install-service must run in an elevated PowerShell (Run as administrator).'
    }
    Test-XamppPaths
    Invoke-Stop
    $existing = Get-Service -Name 'mysql' -ErrorAction SilentlyContinue
    if ($existing) {
        & $Mysqld --remove mysql 2>$null
        Start-Sleep -Seconds 2
    }
    & $Mysqld --install mysql --defaults-file="$MyIni"
    if ($LASTEXITCODE -ne 0) { throw "mysqld --install failed (exit $LASTEXITCODE)" }
    Set-Service -Name 'mysql' -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name 'mysql'
    Start-Sleep -Seconds 3
    if (-not (Test-MySqlPing)) { throw 'Service installed but MySQL did not respond.' }
    Write-Host 'Windows service "mysql" installed and started. XAMPP Control Panel should now stay in sync.'
}

function Invoke-Test {
    Test-XamppPaths
    if (-not (Test-MySqlPing)) { throw 'MySQL ping failed.' }
    & $Mysql -h $DbHost -P $DbPort -u $DbUser $(if ($DbPassword) { "-p$DbPassword" }) -e "SELECT VERSION() AS version; SHOW DATABASES LIKE '$DbName';"
    if ($LASTEXITCODE -ne 0) { throw 'mysql test query failed.' }
    Write-Host 'Database test OK.'
}

Test-XamppPaths
switch ($Action) {
    'status' { Invoke-Status }
    'start' { Invoke-Start }
    'stop' { Invoke-Stop }
    'restart' { Invoke-Stop; Invoke-Start }
    'backup' { Invoke-Backup }
    'install-service' { Invoke-InstallService }
    'test' { Invoke-Test }
}
