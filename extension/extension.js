import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const BrightnessSlider = GObject.registerClass(
class BrightnessSlider extends QuickSettings.QuickSlider {
    _init(displayNum, displayName, connector) {
        super._init({
            iconName: 'display-brightness-symbolic',
        });

        this._displayNum = displayNum;
        this._displayName = displayName;
        this._connector = connector;
        this._brightness = 50;
        this._pendingUpdate = null;

        let sliderBin = this.slider.get_parent();
        let box = new St.BoxLayout({
            vertical: true,
            x_expand: true,
        });

        this._label = new St.Label({
            text: displayName,
            style_class: 'brightness-label',
            style: 'font-size: 11px; color: #aaa; margin-bottom: 4px; margin-left: 8px;',
            x_expand: true,
        });
        box.add_child(this._label);

        if (sliderBin) {
            sliderBin.remove_child(this.slider);
            box.add_child(this.slider);
            sliderBin.add_child(box);
        }

        this.menuEnabled = true;
        this.menu.setHeader('display-brightness-symbolic', displayName);

        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('0%'));
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('25%'));
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('50%'));
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('75%'));
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem('100%'));

        let values = [0, 25, 50, 75, 100];
        let menuItems = this.menu.box.get_children();
        for (let i = 1; i < menuItems.length; i++) {
            let value = values[i - 1];
            menuItems[i].connect('activate', () => {
                this._setSliderValue(value);
            });
        }

        this.slider.accessible_name = displayName;
        this.slider.connect('notify::value', () => this._onSliderChanged());

        this._loadBrightness();
    }

    _setSliderValue(percent) {
        this.slider.value = percent / 100;
    }

    _loadBrightness() {
        try {
            let proc = Gio.Subprocess.new(
                ['ddcutil', 'getvcp', '10', '--display', this._displayNum.toString(), '--brief'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout,] = proc.communicate_utf8_finish(res);
                    let parts = stdout.trim().split(/\s+/);
                    if (parts.length >= 4) {
                        let current = parseInt(parts[3]);
                        let max = parseInt(parts[4]) || 100;
                        this._brightness = current;
                        this.slider.value = current / max;
                    }
                } catch (e) {
                    log(`Brightness DDC: Error reading brightness: ${e}`);
                }
            });
        } catch (e) {
            log(`Brightness DDC: Error spawning ddcutil: ${e}`);
        }
    }

    _onSliderChanged() {
        let value = Math.round(this.slider.value * 100);

        if (this._pendingUpdate) {
            GLib.source_remove(this._pendingUpdate);
        }

        this._pendingUpdate = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            this._setBrightness(value);
            this._pendingUpdate = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _setBrightness(value) {
        try {
            Gio.Subprocess.new(
                ['ddcutil', 'setvcp', '10', value.toString(), '--display', this._displayNum.toString()],
                Gio.SubprocessFlags.NONE
            );
        } catch (e) {
            log(`Brightness DDC: Error setting brightness: ${e}`);
        }
    }

    destroy() {
        if (this._pendingUpdate) {
            GLib.source_remove(this._pendingUpdate);
            this._pendingUpdate = null;
        }
        super.destroy();
    }
});

const BrightnessIndicator = GObject.registerClass(
class BrightnessIndicator extends QuickSettings.SystemIndicator {
    _init(monitors, quickSettings) {
        super._init();

        this._sliders = [];
        this._quickSettings = quickSettings;

        for (let monitor of monitors) {
            let slider = new BrightnessSlider(
                monitor.displayNum,
                monitor.name,
                monitor.connector
            );
            this._sliders.push(slider);
            this.quickSettingsItems.push(slider);
        }
    }

    addToQuickSettings() {
        for (let slider of this._sliders) {
            this._quickSettings.menu.addItem(slider, 2);
        }
    }

    destroy() {
        for (let slider of this._sliders) {
            slider.destroy();
        }
        this._sliders = [];
        super.destroy();
    }
});

export default class BrightnessDDCExtension extends Extension {
    enable() {
        this._indicator = null;
        this._detectMonitors();
    }

    _detectMonitors() {
        try {
            let proc = Gio.Subprocess.new(
                ['ddcutil', 'detect'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );

            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout,] = proc.communicate_utf8_finish(res);
                    let monitors = this._parseMonitors(stdout);

                    if (monitors.length > 0) {
                        let quickSettings = Main.panel.statusArea.quickSettings;
                        this._indicator = new BrightnessIndicator(monitors, quickSettings);
                        this._indicator.addToQuickSettings();
                    }
                } catch (e) {
                    log(`Brightness DDC: Error detecting monitors: ${e}`);
                }
            });
        } catch (e) {
            log(`Brightness DDC: Error spawning ddcutil: ${e}`);
        }
    }

    _parseMonitors(output) {
        let monitors = [];
        let lines = output.split('\n');

        let currentDisplay = null;
        let currentConnector = null;
        let currentModel = null;
        let currentMfg = null;

        for (let line of lines) {
            if (line.startsWith('Display ')) {
                if (currentDisplay !== null && currentModel) {
                    let name = currentMfg ? `${currentMfg} ${currentModel}` : currentModel;
                    monitors.push({
                        displayNum: currentDisplay,
                        name: name,
                        connector: currentConnector
                    });
                }
                let match = line.match(/Display\s+(\d+)/);
                if (match) {
                    currentDisplay = parseInt(match[1]);
                    currentConnector = null;
                    currentModel = null;
                    currentMfg = null;
                }
            } else if (line.includes('DRM connector:')) {
                currentConnector = line.split(':').pop().trim();
            } else if (line.includes('Model:')) {
                currentModel = line.split(':').pop().trim();
            } else if (line.includes('Mfg id:')) {
                let mfgPart = line.split(':').pop().trim();
                currentMfg = mfgPart.split(' - ')[0].trim();
            }
        }

        if (currentDisplay !== null && currentModel) {
            let name = currentMfg ? `${currentMfg} ${currentModel}` : currentModel;
            monitors.push({
                displayNum: currentDisplay,
                name: name,
                connector: currentConnector
            });
        }

        return monitors;
    }

    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
}
