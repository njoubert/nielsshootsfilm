#!/usr/bin/env bash
# Deploy the backend admin server as a launchd daemon on macOS
# This script installs the service and manages it via launchctl

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Deployment paths
DEPLOY_DIR="$HOME/webserver/sites/nielsshootsfilm.com/dynamic"
LOG_DIR="$HOME/webserver/logs"
DATA_DIR="$HOME/webserver/sites/nielsshootsfilm.com/public/data"
UPLOAD_DIR="$HOME/webserver/sites/nielsshootsfilm.com/public/uploads"

# Service configuration
SERVICE_NAME="com.nielsshootsfilm.admin"
PLIST_DEST="/Library/LaunchDaemons/$SERVICE_NAME.plist"
NEWSYSLOG_CONF="/etc/newsyslog.d/$SERVICE_NAME.conf"

# Default: enable KeepAlive (will be prompted during install)
ENABLE_KEEPALIVE="true"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [install|uninstall|start|stop|restart|status|logs]"
    echo ""
    echo "Commands:"
    echo "  install   - Build, deploy binary and env, and install launchd service"
    echo "  uninstall - Stop and remove launchd service (keeps binary and data)"
    echo "  start     - Start the service"
    echo "  stop      - Stop the service"
    echo "  restart   - Restart the service"
    echo "  status    - Check service status"
    echo "  logs      - Tail the service logs"
    exit 1
}

check_service_loaded() {
    sudo launchctl list | grep -q "$SERVICE_NAME"
}

install_service() {
    echo "🚀 Installing nielsshootsfilm admin backend service..."
    echo ""
    echo -e "${YELLOW}⚠️  WARNING: This script must be run ON the production server (not remotely).${NC}"
    echo "This will:"
    echo "  - Build and deploy the binary to $DEPLOY_DIR"
    echo "  - Create/update env file at $DEPLOY_DIR/env"
    echo "  - Install and start a launchd service"
    echo "  - Store logs at $LOG_DIR"
    echo ""
    read -p "Proceed? (y/n) [y]: " -r
    echo ""
    if [[ -n $REPLY && ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi

    # Ask about KeepAlive
    echo ""
    echo "KeepAlive Configuration:"
    echo "  If enabled, macOS will automatically restart the service if it exits or crashes."
    echo "  This ensures high availability but means you must use 'sudo launchctl unload' to fully stop it."
    echo ""
    read -p "Enable KeepAlive? (y/n) [y]: " -r
    echo ""
    if [[ -n $REPLY && ! $REPLY =~ ^[Yy]$ ]]; then
        ENABLE_KEEPALIVE="false"
        echo "KeepAlive disabled - service will not auto-restart"
    else
        ENABLE_KEEPALIVE="true"
        echo "KeepAlive enabled - service will auto-restart on exit/crash"
    fi

    # Create directories
    echo "📁 Creating deployment directories..."
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$UPLOAD_DIR"

    # Build the backend
    echo ""
    echo "🏗️  Building backend..."
    cd "$PROJECT_ROOT"
    "$PROJECT_ROOT/backend/scripts/build.sh"

    # Copy binary
    echo ""
    echo "📦 Deploying binary..."
    cp "$PROJECT_ROOT/build-bin/backend/admin" "$DEPLOY_DIR/admin"
    chmod +x "$DEPLOY_DIR/admin"

    # Create/update env file
    echo ""
    if [ -f "$DEPLOY_DIR/env" ]; then
        echo -e "${YELLOW}⚠️  env file already exists at $DEPLOY_DIR/env${NC}"
        echo "Please review and update it manually if needed."
    else
        echo "📝 Creating env file..."
        cp "$PROJECT_ROOT/env.example" "$DEPLOY_DIR/env"
        echo -e "${GREEN}✓ Created env file at $DEPLOY_DIR/env${NC}"
        echo -e "${YELLOW}⚠️  You must configure admin credentials in $DATA_DIR/admin_config.json${NC}"
    fi

    # Install launchd plist
    echo ""
    echo "⚙️  Installing launchd daemon (requires sudo)..."

    # Generate the plist file dynamically
    sudo tee "$PLIST_DEST" > /dev/null <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<!-- Service identification -->
	<key>Label</key>
	<string>$SERVICE_NAME</string>

	<!-- Program to run -->
	<key>ProgramArguments</key>
	<array>
		<string>$DEPLOY_DIR/admin</string>
		<string>--env-file</string>
		<string>$DEPLOY_DIR/env</string>
	</array>

	<!-- Working directory -->
	<key>WorkingDirectory</key>
	<string>$DEPLOY_DIR</string>

	<!-- Run as user (not root) -->
	<key>UserName</key>
	<string>$(whoami)</string>
	<key>GroupName</key>
	<string>staff</string>

	<!-- Auto-start on boot (before login) -->
	<key>RunAtLoad</key>
	<true/>
EOF

    # Add KeepAlive configuration conditionally
    if [ "$ENABLE_KEEPALIVE" = "true" ]; then
        sudo tee -a "$PLIST_DEST" > /dev/null <<EOF

	<!-- Keep alive - restart if crashes or exits -->
	<key>KeepAlive</key>
	<dict>
		<key>SuccessfulExit</key>
		<false/>
		<key>Crashed</key>
		<true/>
	</dict>

	<!-- Restart throttle (wait 10 seconds before restart) -->
	<key>ThrottleInterval</key>
	<integer>10</integer>
EOF
    fi

    # Continue with rest of plist
    sudo tee -a "$PLIST_DEST" > /dev/null <<EOF

	<!-- Logging -->
	<key>StandardOutPath</key>
	<string>$LOG_DIR/nielsshootsfilm-admin.log</string>
	<key>StandardErrorPath</key>
	<string>$LOG_DIR/nielsshootsfilm-admin.error.log</string>

	<!-- Environment variables -->
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key>
		<string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
	</dict>

	<!-- Process type -->
	<key>ProcessType</key>
	<string>Background</string>

	<!-- Soft resource limits -->
	<key>SoftResourceLimits</key>
	<dict>
		<key>NumberOfFiles</key>
		<integer>4096</integer>
	</dict>
</dict>
</plist>
EOF

    echo "Generated daemon plist at $PLIST_DEST"

    # Set correct permissions
    sudo chown root:wheel "$PLIST_DEST"
    sudo chmod 644 "$PLIST_DEST"

    # Configure log rotation
    echo ""
    echo "⚙️  Configuring log rotation..."
    sudo tee "$NEWSYSLOG_CONF" > /dev/null <<EOF
# newsyslog configuration for nielsshootsfilm admin backend
# Format: logfilename [owner:group] mode count size when flags [/pid_file] [sig_num]
#
# Rotate logs daily, keep 30 days of logs, compress old logs
# Size limit: rotate if log exceeds 10MB
$LOG_DIR/nielsshootsfilm-admin.log      $(whoami):staff  644  30   10240  *     GZ
$LOG_DIR/nielsshootsfilm-admin.error.log $(whoami):staff  644  30   10240  *     GZ
EOF

    sudo chown root:wheel "$NEWSYSLOG_CONF"
    sudo chmod 644 "$NEWSYSLOG_CONF"
    echo "✓ Log rotation configured (daily, keep 30 days, 10MB max per file)"

    # Load the service
    if check_service_loaded; then
        echo "Service already loaded, reloading..."
        sudo launchctl unload "$PLIST_DEST" 2>/dev/null || true
    fi
    sudo launchctl load "$PLIST_DEST"

    echo ""
    echo -e "${GREEN}✅ Installation complete!${NC}"
    echo ""
    echo "Service details:"
    echo "  Name:       $SERVICE_NAME"
    echo "  Binary:     $DEPLOY_DIR/admin"
    echo "  Env file:   $DEPLOY_DIR/env"
    echo "  Logs:       $LOG_DIR/nielsshootsfilm-admin.log"
    echo "  Errors:     $LOG_DIR/nielsshootsfilm-admin.error.log"
    echo "  Rotation:   Daily, keeps 30 days, rotates at 10MB"
    echo "  KeepAlive:  $ENABLE_KEEPALIVE"
    echo ""
    echo "Management commands:"
    echo "  Status:   $0 status"
    echo "  Logs:     $0 logs"
    echo "  Restart:  $0 restart"
    echo ""
}

uninstall_service() {
    echo "🗑️  Uninstalling nielsshootsfilm admin backend daemon..."

    if check_service_loaded; then
        echo "Stopping service..."
        sudo launchctl unload "$PLIST_DEST"
    fi

    if [ -f "$PLIST_DEST" ]; then
        echo "Removing plist..."
        sudo rm "$PLIST_DEST"
    fi

    if [ -f "$NEWSYSLOG_CONF" ]; then
        echo "Removing log rotation config..."
        sudo rm "$NEWSYSLOG_CONF"
    fi

    echo ""
    echo -e "${GREEN}✅ Service uninstalled${NC}"
    echo ""
    echo "Note: Binary, data, and logs are preserved at:"
    echo "  Binary:   $DEPLOY_DIR/admin"
    echo "  Data:     $DATA_DIR"
    echo "  Logs:     $LOG_DIR"
    echo ""
    echo "To remove these manually, run:"
    echo "  rm -rf $DEPLOY_DIR"
    echo ""
}

start_service() {
    echo "▶️  Starting service..."
    if check_service_loaded; then
        echo -e "${YELLOW}Service already loaded and running${NC}"
        show_status
    else
        echo "Loading service..."
        sudo launchctl load "$PLIST_DEST"
        sleep 2
        show_status
    fi
}

stop_service() {
    echo "⏹️  Stopping service..."
    if check_service_loaded; then
        sudo launchctl unload "$PLIST_DEST"
        sleep 1
        echo -e "${GREEN}✓ Service stopped (unloaded)${NC}"
    else
        echo -e "${YELLOW}Service not loaded${NC}"
    fi
}

restart_service() {
    echo "🔄 Restarting service..."
    if check_service_loaded; then
        stop_service
        echo ""
        start_service
    else
        echo -e "${RED}Error: Service not installed. Run '$0 install' first.${NC}"
        exit 1
    fi
}

show_status() {
    echo "📊 Service status:"
    echo ""

    if check_service_loaded; then
        echo -e "${GREEN}✓ Service is loaded${NC}"
        echo ""
        sudo launchctl list | grep "$SERVICE_NAME" || true
        echo ""

        # Check if process is actually running
        PID=$(sudo launchctl list | grep "$SERVICE_NAME" | awk '{print $1}')
        if [ "$PID" != "-" ] && [ -n "$PID" ]; then
            echo -e "${GREEN}✓ Process running (PID: $PID)${NC}"

            # Test if port is listening
            if lsof -i :6180 -sTCP:LISTEN -t >/dev/null 2>&1; then
                echo -e "${GREEN}✓ Listening on port 6180${NC}"
            else
                echo -e "${YELLOW}⚠️  Not listening on port 6180${NC}"
            fi
        else
            echo -e "${RED}✗ Process not running${NC}"
            echo ""
            echo "Recent errors:"
            tail -n 20 "$LOG_DIR/nielsshootsfilm-admin.error.log" 2>/dev/null || echo "No error log found"
        fi
    else
        echo -e "${RED}✗ Service not loaded${NC}"
        echo "Run '$0 install' to install the service"
    fi
    echo ""
}

show_logs() {
    echo "📜 Tailing logs (Ctrl+C to exit)..."
    echo ""

    if [ -f "$LOG_DIR/nielsshootsfilm-admin.log" ]; then
        tail -f "$LOG_DIR/nielsshootsfilm-admin.log"
    else
        echo -e "${YELLOW}No logs found at $LOG_DIR/nielsshootsfilm-admin.log${NC}"
    fi
}

# Main command dispatcher
COMMAND="${1:-}"

case "$COMMAND" in
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        usage
        ;;
esac
