# Assignments Hub — repo structure cleanup
#
# Fixes the two confirmed structural problems:
#   1. Root and backend/ are duplicate NestJS apps (identical package.json,
#      main.ts, and 22-model Prisma schema). backend/ is kept, per the
#      target monorepo layout; root's duplicate app files are removed.
#   2. backend/.git is a second, independent clone of the SAME GitHub remote
#      (github.com/Sagide-del/Assignments-Hub.git, branch main) nested inside
#      root's working tree. Root's .git is kept as the only repository.
#
# Run this from a PowerShell prompt AT THE REPO ROOT:
#   cd "C:\Users\Frank\Desktop\Assignment Hub"
#   .\cleanup-repo-structure.ps1
#
# This script does NOT run `git add` / `git commit` / `git push` — review
# `git status` yourself afterwards before committing. It also does NOT touch
# backend/.env or root/.env (both already gitignored; left alone here too).

$ErrorActionPreference = 'Stop'
$root = Get-Location

Write-Host "== Assignments Hub cleanup ==" -ForegroundColor Cyan
Write-Host "Working in: $root"

# --- Safety check: confirm we're at the expected repo root -----------------
if (-not (Test-Path ".\backend\src\main.ts") -or -not (Test-Path ".\src\main.ts")) {
    Write-Host "Doesn't look like the expected layout (missing backend/src/main.ts or src/main.ts)." -ForegroundColor Red
    Write-Host "Aborting — run this from the Assignment Hub root, and verify paths manually first." -ForegroundColor Red
    exit 1
}

# --- 1. Remove the nested backend/.git repository --------------------------
if (Test-Path ".\backend\.git") {
    Write-Host "Removing nested backend/.git ..." -ForegroundColor Yellow
    Remove-Item ".\backend\.git" -Recurse -Force
} else {
    Write-Host "backend/.git not found — already removed?" -ForegroundColor DarkGray
}

# --- 2. Remove root's duplicate NestJS app files ----------------------------
# backend/ remains the one real NestJS app, matching the target tree.
$rootAppPaths = @(
    "src", "prisma", "package.json", "package-lock.json",
    "tsconfig.json", "tsconfig.build.json", "nest-cli.json",
    "node_modules", "dist", ".eslintrc.js", ".eslintrc.json",
    ".prettierrc"
)
foreach ($p in $rootAppPaths) {
    $full = Join-Path $root $p
    if (Test-Path $full) {
        Write-Host "Removing root/$p (duplicate of backend/$p) ..." -ForegroundColor Yellow
        Remove-Item $full -Recurse -Force
    }
}
# Root .env / .env.example are left alone deliberately — .gitignore already
# excludes them, and there's no ambiguity about which one is "real" since
# only backend/ needs a runtime .env going forward.

# --- 3. Consolidate docs -----------------------------------------------------
New-Item -ItemType Directory -Force -Path ".\docs\architecture" | Out-Null
New-Item -ItemType Directory -Force -Path ".\docs\api" | Out-Null
New-Item -ItemType Directory -Force -Path ".\docs\deployment" | Out-Null
New-Item -ItemType Directory -Force -Path ".\database\backups" | Out-Null

if (Test-Path ".\documentation") {
    Write-Host "Moving documentation/ -> docs/architecture/ ..." -ForegroundColor Yellow
    Get-ChildItem ".\documentation" -File | Move-Item -Destination ".\docs\architecture" -Force
    Remove-Item ".\documentation" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path ".\backend\modules") {
    Write-Host "Moving backend/modules/ -> docs/architecture/module-specs/ ..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path ".\docs\architecture\module-specs" | Out-Null
    Get-ChildItem ".\backend\modules" -File | Move-Item -Destination ".\docs\architecture\module-specs" -Force
    Remove-Item ".\backend\modules" -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path ".\backend\authentication") {
    Write-Host "Moving backend/authentication/ -> docs/architecture/auth-spec/ ..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path ".\docs\architecture\auth-spec" | Out-Null
    Get-ChildItem ".\backend\authentication" -File | Move-Item -Destination ".\docs\architecture\auth-spec" -Force
    Remove-Item ".\backend\authentication" -Recurse -Force -ErrorAction SilentlyContinue
}
# Stray *_SETUP.md files sitting next to backend/src
Get-ChildItem ".\backend" -Filter "*_SETUP.md" -File -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Moving backend/$($_.Name) -> docs/deployment/ ..." -ForegroundColor Yellow
    Move-Item $_.FullName ".\docs\deployment" -Force
}

Write-Host ""
Write-Host "Done. Now review before committing:" -ForegroundColor Cyan
Write-Host "  git status"
Write-Host "  git add -A"
Write-Host "  git commit -m `"Consolidate repo: remove duplicate root NestJS app and nested backend/.git`""
Write-Host "  git push"
