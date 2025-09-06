@echo off
setlocal enabledelayedexpansion

echo Current directory: %CD%


REM 1. Activate virtual environment
call "%USERPROFILE%\npcww\.venv\Scripts\activate.bat"
if %errorlevel% neq 0 (
    echo ==== Failed to activate virtual environment ====
    exit /b 1
)
REM Ensure PyInstaller is installed in the venv
"%USERPROFILE%\npcww\.venv\Scripts\python.exe" -m pip install pyinstaller

REM 2. Check for EXE and build if missing
if not exist "pyinstaller_dist\npc_studio_serve.exe" (
    echo ==== npc_studio_serve.exe not found, running PyInstaller ====
"%USERPROFILE%\npcww\.venv\Scripts\python.exe" -m PyInstaller --onefile ^
  --clean ^
  --distpath pyinstaller_dist ^
  --noupx ^
  --hidden-import=npcpy ^
  --hidden-import=npcsh ^
  --hidden-import=flask ^
  --hidden-import=flask_cors ^
  --hidden-import=flask_sse ^
  --hidden-import=redis ^
  --hidden-import=pyyaml ^
  --hidden-import=pillow ^
  --hidden-import=nltk ^
  --hidden-import=litellm ^
  --hidden-import=anthropic ^
  --hidden-import=openai ^
  --hidden-import=google-genai ^
  --hidden-import=tiktoken_ext.openai_public ^
  --hidden-import=tiktoken_ext ^
  --hidden-import=sentence_transformers ^
  --hidden-import=chromadb ^
  --collect-data=litellm ^
  --collect-data=npcpy
  --collect-data=npcsh
  npc_studio_serve.py

    if %errorlevel% neq 0 (
        echo ==== PyInstaller failed! ====
        exit /b 1
    )
) else (
    echo ==== npc_studio_serve.exe already exists, skipping PyInstaller ====
)

REM 3. Show result
echo ==== After PyInstaller ====
dir pyinstaller_dist

:: 3. Build frontend
call npm run build:vite
if %errorlevel% neq 0 (
    echo ==== Frontend build failed ====
    exit /b 1
)

:: 4. Create resources/backend folder
echo ==== Creating resources\backend ====
mkdir resources 2>nul
mkdir resources\backend 2>nul
if not exist "resources\backend" (
    echo ==== ERROR: Could not create resources\backend ====
    exit /b 1
)
dir resources
dir resources\backend

:: 5. Copy backend EXE
echo ==== Copying backend EXE ====
if not exist "pyinstaller_dist\npc_studio_serve.exe" (
    echo ==== ERROR: pyinstaller_dist\npc_studio_serve.exe does not exist ====
    exit /b 1
)
copy /Y pyinstaller_dist\npc_studio_serve.exe resources\backend\npc_studio_serve.exe
if not exist "resources\backend\npc_studio_serve.exe" (
    echo ==== ERROR: Copy failed: npc_studio_serve.exe not found in resources\backend ====
    exit /b 1
)
dir resources\backend

:: 6. Package with electron-builder
call npm run electron:build
if %errorlevel% neq 0 (
    echo ==== npm build failed ====
    exit /b 1
)

echo ==== Build script completed successfully ====