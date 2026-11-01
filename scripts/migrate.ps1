# Script chay migration cho BudgetBot tren Windows PowerShell
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

Write-Host "=== Chay Database Migration cho BudgetBot ===" -ForegroundColor Cyan
Set-Location $projectRoot

$pythonPath = ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonPath)) {
    $pythonPath = "python"
}

& $pythonPath scripts/migrate.py

