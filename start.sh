#!/bin/bash
# start.sh

# Start Flask server in background
npm run dev &

# Wait for Flask server to start
sleep 5



npc serve -p 5337 -c "localhost:6337" &
FLASK_PID=$!

# Start Electron app
npm start
# When Electron exits, kill Flask server
#kill $FLASK_PID
