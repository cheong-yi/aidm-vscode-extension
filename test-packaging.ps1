Write-Host "Testing packaging process..." -ForegroundColor Green

Write-Host "`nStep 1: Compiling TypeScript..." -ForegroundColor Yellow
try {
    npm run compile-tsc
    if ($LASTEXITCODE -ne 0) {
        throw "Compilation failed with exit code $LASTEXITCODE"
    }
    Write-Host "Compilation successful!" -ForegroundColor Green
} catch {
    Write-Host "Compilation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Checking vsce..." -ForegroundColor Yellow
try {
    $vsceVersion = vsce --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "vsce not found, installing..." -ForegroundColor Yellow
        npm install -g @vscode/vsce
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install vsce"
        }
    }
    Write-Host "vsce available: $vsceVersion" -ForegroundColor Green
} catch {
    Write-Host "vsce check failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 3: Creating package..." -ForegroundColor Yellow
try {
    vsce package
    if ($LASTEXITCODE -ne 0) {
        throw "Package creation failed"
    }
    Write-Host "Package created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Package creation failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nAll steps completed successfully!" -ForegroundColor Green
Read-Host "Press Enter to continue"
