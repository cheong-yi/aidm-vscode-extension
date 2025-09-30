@echo off
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies
    exit /b 1
)

echo Building with webpack...
call npx webpack
if %errorlevel% neq 0 (
    echo Build failed
    exit /b 1
)

echo Packaging extension...
call node package-extension.js
if %errorlevel% neq 0 (
    echo Packaging failed
    exit /b 1
)

echo All done!

