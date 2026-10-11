# Brightness DDC Control

GNOME extension to control **hardware brightness** of your monitors via DDC/CI.

The extension reads and writes the monitor's brightness through `ddcutil`, and
exposes one slider per detected monitor in GNOME Quick Settings.

## Features

- Hardware brightness control via DDC/CI
- One slider per monitor in the Quick Settings panel
- Display name shown for each monitor
- Menu with presets (0%, 25%, 50%, 75%, 100%)
- Full-width sliders
- Automatic monitor detection

## Compatibility

| Environment | Declared support |
|---|-----------|
| GNOME Shell | 45, 46, 47 |
| Wayland | Yes |
| X11 | Yes |

GNOME Shell 45, 46 and 47 are the versions listed in
[`extension/metadata.json`](extension/metadata.json). Wayland and X11 support
depends on monitor DDC/CI access through `ddcutil`. These declarations are not a
fresh compatibility test on every listed environment.

The installer rejects versions below GNOME 45, but does not impose an upper
version limit. Successful execution of that check does not establish support
for a newer GNOME release.

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

Read [`install.sh`](install.sh) before running it. It performs system changes
and requests administrator privileges:

- Checks GNOME Shell and installs `ddcutil` and `i2c-tools` when `ddcutil` is absent.
- Creates the `i2c` group if needed and adds the current user to it.
- Adds an I2C udev rule when absent, then reloads and triggers udev.
- Loads `i2c-dev` and adds a module startup configuration when absent.
- Copies the extension into the user's GNOME extension directory and attempts
  to enable it. Activation errors are suppressed by the script, so verify
  activation in GNOME after installation.

Then log out and log back in.

## Uninstallation

```bash
./uninstall.sh
```

This disables and removes the extension files. It does not remove packages,
I2C group membership, the udev rule or the module startup configuration.

## Check compatibility

To verify your monitors support DDC/CI:

```bash
ddcutil detect
```

Detection confirms that `ddcutil` can discover the monitor. Actual brightness
control still requires testing the monitor's brightness VCP feature.

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

Use the [ddcutil I2C permissions documentation](https://www.ddcutil.com/i2c_permissions/)
to distinguish permission and device-access problems before changing system
configuration. GPU-specific behavior needs to be checked on the actual setup.

## Project status

This repository contains the extension and its installation scripts. The
portfolio documentation pass did not install the extension or run a GNOME
hardware compatibility test. Newer GNOME versions are not validated by this
update.

## License

GPL-3.0 - See [LICENSE](LICENSE)
