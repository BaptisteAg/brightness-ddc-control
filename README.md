# Brightness DDC Control

GNOME extension to control **hardware brightness** of your monitors via DDC/CI.

Unlike software solutions that apply a dark filter, this extension directly changes your monitor's brightness as if you were using the physical buttons.

## Features

- Hardware brightness control via DDC/CI
- One slider per monitor in the Quick Settings panel
- Display name shown for each monitor
- Menu with presets (0%, 25%, 50%, 75%, 100%)
- Full-width sliders
- Automatic monitor detection

## Compatibility

| | Supported |
|---|-----------|
| GNOME Shell | 45, 46, 47 |
| Wayland | Yes |
| X11 | Yes |

DDC/CI communicates directly with monitors via I2C at the hardware level, making it compatible with both Wayland and X11.

## Requirements

- GNOME 45, 46, or 47
- DDC/CI compatible monitors (most modern displays)
- Linux kernel with i2c-dev module

## Installation

```bash
git clone https://github.com/BaptisteAg/brightness-ddc-control.git
cd brightness-ddc-control
./install.sh
```

The install script will automatically:
- Check GNOME Shell version
- Install `ddcutil` and `i2c-tools`
- Configure i2c permissions
- Install and enable the extension

Then log out and log back in.

## Uninstallation

```bash
./uninstall.sh
```

## Check compatibility

To verify your monitors support DDC/CI:

```bash
ddcutil detect
```

If your monitors appear, they are compatible.

## Troubleshooting

### "No monitor detected"

1. Check that you are in the `i2c` group:
   ```bash
   groups | grep i2c
   ```

2. If not, add yourself to the group:
   ```bash
   sudo usermod -aG i2c $USER
   ```
   Then log out and log back in.

3. Check that the i2c-dev module is loaded:
   ```bash
   sudo modprobe i2c-dev
   ```

### Brightness doesn't change

Some monitors have DDC/CI disabled by default. Check your monitor's OSD menu (settings > DDC/CI or similar).

### NVIDIA GPU issues

If you're using an NVIDIA GPU, you may need to add this kernel parameter:

```bash
sudo nano /etc/default/grub
# Add i2c_nvidia_gpu to GRUB_CMDLINE_LINUX_DEFAULT
sudo update-grub
```

## License

GPL-3.0 - See [LICENSE](LICENSE)
