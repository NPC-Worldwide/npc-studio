#!/bin/bash
# Build and install npc-studio on macOS

set -e  # Exit on any error

APP_NAME="npc-studio"
PROJECT_DIR="$HOME/npcww/npc-studio"
cd "$PROJECT_DIR"

echo "==== Creating optimized Python bundle ===="
cat > requirements.txt << EOF
flask
flask_cors
flask_sse
redis
pyyaml
pillow
npcpy==1.0.31
EOF

pyinstaller --onefile  \
    --clean \
    --distpath pyinstaller_dist \
    --noupx \
    --hidden-import=npcpy \
    --hidden-import=litellm \
    --hidden-import=ollama \
    --hidden-import=flask \
    --hidden-import=flask_cors \
    --hidden-import=flask_sse \
    --hidden-import=redis \
    --hidden-import=pyyaml \
    --hidden-import=pillow \
    --hidden-import=anthropic \
    --hidden-import=openai \
    --hidden-import=google-genai \
    --hidden-import=tiktoken_ext.openai_public \
    --hidden-import=tiktoken_ext \
    --hidden-import=chromadb \
    --hidden-import=pydantic \
    --exclude-module=scipy \
    --exclude-module=tensorflow \
    --exclude-module=torch \
    --exclude-module=sklearn \
    --exclude-module=notebook \
    --exclude-module=ipython \
    --exclude-module=jupyter \
    --exclude-module=nbconvert \
    --exclude-module=cv2 \
    --exclude-module=PIL.ImageTk \
    --exclude-module=PIL.ImageQt \
    --exclude-module=docx \
    --exclude-module=pptx \
    --exclude-module=cuda \
    --exclude-module=cudnn \
    --exclude-module=cudart \
    --exclude-module=cublas \
    --exclude-module=cupy \
    --exclude-module=logfire \
    --exclude-module=numba.cuda \
    --exclude-module=torch.cuda \
    --exclude-module=nltk \
    --exclude-module=tensorflow.python.framework.cuda_util \
    --collect-data=litellm \
    --collect-data=npcpy\
    npc_studio_serve.py

# Prepare resources for Electron app
mkdir -p ./dist/resources/backend
cp requirements.txt ./dist/resources/

echo "==== Building npc-studio ===="
npm run build:vite

mkdir -p resources/backend
cp pyinstaller_dist/npc_studio_serve resources/backend/npc_studio_serve
chmod +x resources/backend/npc_studio_serve

npm run electron:build

echo "==== Found .dmg package in dist-electron directory ===="

APP_PATH="/Applications/$APP_NAME.app"
if [ -d "$APP_PATH" ]; then
    echo "Found existing installation at $APP_PATH. Removing it."
    rm -rf "$APP_PATH"
    echo "Old version removed."
else
    echo "$APP_NAME is not currently installed in /Applications."
fi

DMG_FILE=$(find ./dist-electron -name "*.dmg" -type f -print0 | xargs -0 ls -t | head -n 1)

if [ -n "$DMG_FILE" ]; then
    echo "==== Installing new npc-studio package: $DMG_FILE ===="
    echo "Mounting DMG..."
    MOUNT_OUTPUT=$(hdiutil attach "$DMG_FILE" -nobrowse)
    VOLUME_PATH=$(echo "$MOUNT_OUTPUT" | grep "/Volumes/" | awk 'BEGIN {FS="\t"}; {print $3}')
    APP_BUNDLE_PATH=$(find "$VOLUME_PATH" -name "*.app" -maxdepth 1 -print -quit)
    if [ -d "$APP_BUNDLE_PATH" ]; then
        echo "Found App Bundle at $APP_BUNDLE_PATH"
        echo "Copying to /Applications..."
        ditto "$APP_BUNDLE_PATH" "$APP_PATH"
        echo "Unmounting DMG..."
        hdiutil detach "$VOLUME_PATH"
        echo "$APP_NAME installed successfully in /Applications."
    else
        echo "Error: Could not find .app bundle inside the DMG."
        hdiutil detach "$VOLUME_PATH"
        exit 1
    fi
else
    echo "Error: No .dmg file found in dist-electron directory."
    exit 1
fi

echo "==== Installing Python dependencies ===="
pip3 install -r requirements.txt

echo "==== Installation complete ===="
echo "You can now run '$APP_NAME' from your Applications folder or Launchpad."
echo "To run from the terminal, use: open /Applications/$APP_NAME.app"