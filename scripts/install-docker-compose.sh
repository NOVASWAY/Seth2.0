#!/bin/bash

echo "🐳 Installing Docker Compose..."

# Check if Docker Compose is already installed
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is already installed"
    docker-compose --version
    exit 0
fi

# Install Docker Compose
echo "📦 Installing Docker Compose..."

# Download the latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Create a symbolic link
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose installed successfully"
    docker-compose --version
else
    echo "❌ Failed to install Docker Compose"
    exit 1
fi
