/* MagicMirror²
 * Node Helper: Buttons
 *
 * By Joseph Bethge
 * MIT Licensed.
 *
 * Refactored to use gpiod (gpiomon) instead of onoff for native-free GPIO access.
 */

const { spawn, execSync } = require("child_process");
const Log = require("logger");
const NodeHelper = require("node_helper");
const fs = require("fs");

module.exports = NodeHelper.create({
    // Subclass start method.
    start () {
        Log.log("Starting node helper for: " + this.name);

        this.loaded = false;
        this.monitors = [];
        this.gpioAvailable = this.checkGpioAvailable();
    },

    checkGpioAvailable () {
        // Check if we're on Linux
        if (process.platform !== "linux") {
            Log.warn(this.name + ": Not running on Linux - GPIO functionality disabled");
            return false;
        }

        // Check if gpiomon is installed
        try {
            execSync("which gpiomon", { stdio: "ignore" });
            return true;
        } catch {
            Log.error(this.name + ": gpiod tools not found!");
            Log.error(this.name + ": Install with: sudo apt install gpiod");
            return false;
        }
    },

    // Subclass socketNotificationReceived received.
    socketNotificationReceived (notification, payload) {
        if (notification === "BUTTON_CONFIG") {
            this.config = payload.config;
            this.initializeButtons();
        }
    },

    stop () {
        // Clean up gpiomon processes on shutdown
        for (const monitor of this.monitors) {
            if (monitor && monitor.process) {
                monitor.process.kill();
            }
        }
        this.monitors = [];
    },

    handleGpioEvent (index, edge) {
        const now = Date.now();
        const button = this.buttons[index];
        const activeLow = button.activeLow !== false;

        // Determine if this is a press or release based on edge and activeLow setting
        // activeLow (default): button connects to GND when pressed -> falling edge = press
        // activeHigh: button connects to VCC when pressed -> rising edge = press
        const isPress = activeLow
            ? edge === "falling"
            : edge === "rising";

        if (isPress) {
            if (button.downBounceTimeoutEnd > now) {
                // We're bouncing!
                return;
            }

            button.pressed = now;
            button.downBounceTimeoutEnd = now + this.config.bounceTimeout;
            this.sendSocketNotification("BUTTON_DOWN", { index: index });
        } else if (button.pressed !== undefined) {
            if (button.upBounceTimeoutEnd > now) {
                // We're bouncing!
                return;
            }

            const duration = now - button.pressed;
            button.pressed = undefined;
            button.upBounceTimeoutEnd = now + this.config.bounceTimeout;

            this.sendSocketNotification("BUTTON_UP", {
                index: index,
                duration: duration
            });
        }
    },

    getGpioChip () {
        // Detect the correct gpiochip for the platform
        // RPi5 uses gpiochip4 for GPIO header, older RPis use gpiochip0
        let model = "";
        try {
            model = fs.readFileSync("/proc/device-tree/model", { encoding: "utf8" });
        } catch (e) {
            // Fallback to gpiochip0
        }

        if (model.startsWith("Raspberry Pi 5")) {
            Log.log(this.name + ": RPi5 detected, using gpiochip4");
            return "gpiochip4";
        }

        return "gpiochip0";
    },

    initializeButton (index) {
        const self = this;
        const button = this.buttons[index];
        const chip = this.gpioChip;
        const pin = parseInt(button.pin);

        // Build gpiomon arguments for libgpiod 2.x
        // Format: gpiomon -c <chip> -e both <line>
        // -c = chip, -e = edges (both is default, so we can omit it)
        const args = [
            "-c", chip,
            String(pin)
        ];

        Log.log(self.name + ": Starting gpiomon for pin " + pin + " on " + chip);

        const monitor = spawn("gpiomon", args);

        monitor.stdout.on("data", (data) => {
            // libgpiod 2.x output format: "<timestamp> <edge> <line>"
            // e.g., "1702483200.123456789 rising 24"
            const lines = data.toString().trim().split("\n");
            for (const line of lines) {
                let edge = null;
                if (line.includes("rising")) {
                    edge = "rising";
                } else if (line.includes("falling")) {
                    edge = "falling";
                }
                if (edge) {
                    self.handleGpioEvent(index, edge);
                }
            }
        });

        monitor.stderr.on("data", (data) => {
            Log.error(self.name + ": gpiomon error for pin " + pin + ": " + data.toString());
        });

        monitor.on("close", (code) => {
            if (code !== null && code !== 0) {
                Log.error(self.name + ": gpiomon for pin " + pin + " exited with code " + code);
            }
        });

        monitor.on("error", (err) => {
            Log.error(self.name + ": Failed to start gpiomon for pin " + pin + ": " + err.message);
            Log.error(self.name + ": Make sure gpiod is installed: sudo apt install gpiod");
        });

        this.monitors.push({ pin: pin, process: monitor });
    },

    initializeButtons () {
        if (this.loaded) {
            return;
        }

        if (!this.gpioAvailable) {
            Log.warn(this.name + ": Skipping button initialization - GPIO not available");
            return;
        }

        this.buttons = this.config.buttons;
        this.gpioChip = this.getGpioChip();

        for (let i = 0; i < this.buttons.length; i++) {
            Log.log("Initialize button " + this.buttons[i].name + " on PIN " + this.buttons[i].pin);
            this.buttons[i].pressed = undefined;
            this.buttons[i].downBounceTimeoutEnd = 0;
            this.buttons[i].upBounceTimeoutEnd = 0;
            this.initializeButton(i);
        }

        this.loaded = true;
    }
});
