#!/bin/bash
# Start the frontend dev server in the background

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PID_FILE="$FRONTEND_DIR/server.pid"
LOG_FILE="$FRONTEND_DIR/server.log"

# Check if server is already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Frontend server is already running (PID: $PID)"
        echo "Use ./frontend/scripts/stop-frontend.sh to stop it first"
        exit 1
    else
        echo "Removing stale PID file"
        rm -f "$PID_FILE"
    fi
fi

echo "Starting frontend server..."
echo "  Port: 5173"
echo "  Log file: $LOG_FILE"

# Start the server in the background
cd "$FRONTEND_DIR"
nohup pnpm run dev > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Save the PID
echo "$SERVER_PID" > "$PID_FILE"

# Wait a moment and check if the server started successfully
sleep 2
if ps -p "$SERVER_PID" > /dev/null 2>&1; then
    echo "Frontend server started successfully (PID: $SERVER_PID)"
    echo "View logs: tail -f $LOG_FILE"
    echo "Stop server: ./frontend/scripts/stop-frontend.sh"
    echo "Access at: http://localhost:5173"
else
    echo "Error: Server failed to start. Check logs:"
    cat "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi
