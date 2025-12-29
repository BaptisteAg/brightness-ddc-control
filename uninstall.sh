#!/bin/bash
set -e

echo "=== Brightness DDC Control - Uninstallation ==="
echo ""

EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/brightness-ddc@custom"

# Disable extension
echo "Disabling extension..."
gnome-extensions disable brightness-ddc@custom 2>/dev/null || true

# Remove files
if [ -d "$EXTENSION_DIR" ]; then
    echo "Removing files..."
    rm -rf "$EXTENSION_DIR"
    echo "Extension removed"
else
    echo "Extension was not installed."
fi

echo ""
echo "=== Uninstallation complete ==="
echo ""
echo "Note: ddcutil and the i2c group were not removed."
echo "To remove them manually if needed:"
echo "  sudo apt remove ddcutil"
echo "  sudo gpasswd -d \$USER i2c"
echo ""
