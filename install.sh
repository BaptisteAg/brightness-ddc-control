#!/bin/bash
set -e

echo "=== Brightness DDC Control - Installation ==="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check GNOME Shell
if ! command -v gnome-shell &> /dev/null; then
    echo -e "${RED}GNOME Shell is not installed.${NC}"
    echo "This extension requires GNOME Shell 45, 46, or 47."
    exit 1
fi

GNOME_VERSION=$(gnome-shell --version | grep -oP '\d+' | head -1)
if [[ "$GNOME_VERSION" -lt 45 ]]; then
    echo -e "${RED}GNOME Shell $GNOME_VERSION is not supported.${NC}"
    echo "This extension requires GNOME Shell 45, 46, or 47."
    exit 1
fi

echo -e "${GREEN}GNOME Shell $GNOME_VERSION detected${NC}"

# Check and install ddcutil
echo "Checking dependencies..."

if ! command -v ddcutil &> /dev/null; then
    echo -e "${YELLOW}ddcutil is not installed.${NC}"
    echo "Installing ddcutil..."
    if command -v apt &> /dev/null; then
        sudo apt install -y ddcutil i2c-tools
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y ddcutil i2c-tools
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm ddcutil i2c-tools
    elif command -v zypper &> /dev/null; then
        sudo zypper install -y ddcutil i2c-tools
    else
        echo -e "${RED}Unable to install ddcutil automatically.${NC}"
        echo "Please install ddcutil and i2c-tools manually, then run this script again."
        exit 1
    fi
fi

echo -e "${GREEN}ddcutil installed${NC}"

# Create i2c group if it doesn't exist
if ! getent group i2c > /dev/null 2>&1; then
    echo -e "${YELLOW}Creating i2c group...${NC}"
    sudo groupadd i2c
fi

# Add udev rule for i2c devices
if [ ! -f /etc/udev/rules.d/45-ddcutil-i2c.rules ]; then
    echo "Adding udev rule for i2c devices..."
    echo 'KERNEL=="i2c-[0-9]*", GROUP="i2c", MODE="0660"' | sudo tee /etc/udev/rules.d/45-ddcutil-i2c.rules > /dev/null
    sudo udevadm control --reload-rules
    sudo udevadm trigger
fi

# Add user to i2c group
if ! groups | grep -q i2c; then
    echo -e "${YELLOW}Adding user to i2c group...${NC}"
    sudo usermod -aG i2c "$USER"
    echo -e "${YELLOW}You will need to log out and log back in for the group to take effect.${NC}"
fi

# Load i2c-dev module
if ! lsmod | grep -q i2c_dev; then
    echo "Loading i2c-dev module..."
    sudo modprobe i2c-dev
fi

# Add i2c-dev to startup
if [ ! -f /etc/modules-load.d/i2c-dev.conf ]; then
    echo "Configuring i2c-dev to load at boot..."
    echo "i2c-dev" | sudo tee /etc/modules-load.d/i2c-dev.conf > /dev/null
fi

echo -e "${GREEN}i2c configuration OK${NC}"

# Install extension
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/brightness-ddc@custom"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Installing GNOME extension..."
mkdir -p "$EXTENSION_DIR"
cp "$SCRIPT_DIR/extension/metadata.json" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/extension/extension.js" "$EXTENSION_DIR/"

echo -e "${GREEN}Extension installed${NC}"

# Enable extension
echo "Enabling extension..."
gnome-extensions enable brightness-ddc@custom 2>/dev/null || true

echo ""
echo -e "${GREEN}=== Installation complete ===${NC}"
echo ""
echo "To finalize the installation:"
echo "  1. Log out and log back in"
echo "  2. The extension will appear in the Quick Settings panel"
echo ""
echo "To verify your monitors are detected:"
echo "  ddcutil detect"
echo ""
