#!/bin/bash
# Build and install npc-studio

set -e  # Exit on any error

echo "==== Creating optimized Python bundle ===="
# Create a requirements.txt file for dependencies to be installed system-wide
cat > requirements.txt << EOF
flask
flask_cors
flask_sse
redis
pyyaml
pillow
npcpy
EOF

# Use PyInstaller with optimization flags to reduce size
# Note: All --exclude-module flags must be part of a single command

pyinstaller --onefile  \
    --clean \
    --distpath pyinstaller_dist \
    --noupx \
    --hidden-import=npcpy \
    --hidden-import=litellm\
    --hidden-import=ollama \
    --hidden-import=flask \
    --hidden-import=flask_cors \
    --hidden-import=flask_sse \
    --hidden-import=redis \
    --hidden-import=pyyaml \
    --hidden-import=pillow \
    --hidden-import=nltk \
    --hidden-import=anthropic \
    --hidden-import=openai \
    --hidden-import=google-genai \
    --hidden-import=tiktoken_ext.openai_public \
    --hidden-import=tiktoken_ext \
    --hidden-import=chromadb \
    --hidden-import=pydantic \
    --hidden-import=tiktoken_ext.openai_public \
    --hidden-import=tiktoken_ext \
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
    --exclude-module=logfire\
    --exclude-module=numba.cuda \
    --exclude-module=torch.cuda \
    --exclude-module=tensorflow.python.framework.cuda_util \
    --collect-data=litellm \
    --collect-data=npcpy \
    npc_studio_serve.py

# Copy PyInstaller output to resources directory

### uncomment above if you make changes to the backend
### most of the time tho you just need to run the electron build
### because the backend is just npc server.



echo "==== Building npc-studio ===="

# Create directory structure for our resources
# mkdir -p ./dist/resources/backend - Moved above to ensure directory exists before copy
mkdir -p ./dist/resources

# Copy requirements file
cp requirements.txt ./dist/resources/

# Build the electron app (electron-builder will handle dependencies)
npm run build:vite

mkdir -p ./dist/resources/backend
cp ./pyinstaller_dist/npc_studio_serve ./dist/resources/backend/
chmod +x ./dist/resources/backend/npc_studio_serve

npm run electron:build


echo "==== Found .deb package in dist-electron directory ===="

echo "==== Uninstalling existing npc-studio ===="
# Try to uninstall if it exists, but don't fail if it doesn't
sudo dpkg -r npc-studio || echo "npc-studio not previously installed"

# Find the newest .deb file
DEB_FILE=$(find ./dist-electron -name "*.deb" -type f -print -quit)

if [ -n "$DEB_FILE" ]; then
    echo "==== Installing new npc-studio package: $DEB_FILE ===="
    sudo dpkg -i "$DEB_FILE"
    
    # Fix any potential dependency issues
    if [ $? -ne 0 ]; then
        echo "==== Fixing dependencies ===="
        sudo apt-get install -f -y
    fi
else
    echo "Error: No .deb file found in dist-electron directory"
    exit 1
fi

echo "==== Installing Python dependencies ===="
pip install -r requirements.txt

echo "==== Creating desktop icon ===="
# Create a desktop entry file
DESKTOP_FILE="$HOME/.local/share/applications/npc-studio.desktop"

# Ensure the directory exists
mkdir -p "$HOME/.local/share/applications"

# Create the desktop entry file
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=NPC Studio
Comment=NPC Studio - LLM chatbot interface
Exec=/usr/bin/npc-studio
Icon=$(realpath ./assets/icon.png)
Terminal=false
Type=Application
Categories=Development;Utility;
StartupNotify=true
EOF

# Make the desktop file executable
chmod +x "$DESKTOP_FILE"

# Update desktop database to recognize the new application
update-desktop-database "$HOME/.local/share/applications" || echo "Could not update desktop database, icon might not appear immediately"

echo "==== Desktop icon created ===="
echo "==== Installation complete ===="
echo "You can now run 'npc-studio' to start the application"
