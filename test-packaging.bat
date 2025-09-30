@echo off
echo Testing packaging process...

echo.
echo Step 1: Compiling TypeScript...
call npm run compile-tsc
if %errorlevel% neq 0 (
    echo Compilation failed!
    exit /b 1
)
echo Compilation successful!

echo.
echo Step 2: Checking vsce...
call vsce --version
if %errorlevel% neq 0 (
    echo vsce not found, installing...
    call npm install -g @vscode/vsce
    if %errorlevel% neq 0 (
        echo Failed to install vsce!
        exit /b 1
    )
)
echo vsce available!

echo.
echo Step 3: Creating package...
call vsce package
if %errorlevel% neq 0 (
    echo Package creation failed!
    exit /b 1
)
echo Package created successfully!

echo.
echo All steps completed successfully!
pause
