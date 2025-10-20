#!/bin/bash
# Script to upgrade Docker Compose to V2 on the Digital Ocean server
# Run this once on your server: bash upgrade-docker-compose.sh

set -e

echo "🔧 Upgrading Docker Compose to V2..."

# Check current version
echo "📊 Current Docker Compose version:"
docker-compose version 2>&1 || true

# Get the latest version
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
echo "📥 Latest Docker Compose version: $COMPOSE_VERSION"

# Create plugin directory
mkdir -p ~/.docker/cli-plugins

# Download Docker Compose V2
echo "⬇️  Downloading Docker Compose V2..."
curl -SL "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" -o ~/.docker/cli-plugins/docker-compose

# Make it executable
chmod +x ~/.docker/cli-plugins/docker-compose

# Verify installation
echo ""
echo "✅ Docker Compose V2 installed successfully!"
echo "📊 New version:"
docker compose version

echo ""
echo "🎉 Upgrade complete!"
echo ""
echo "Note: You can now use 'docker compose' (with space) instead of 'docker-compose'"
echo "The old 'docker-compose' command will still work if you create a symlink:"
echo "  sudo ln -sf ~/.docker/cli-plugins/docker-compose /usr/local/bin/docker-compose"
