/*
 * MagicMirror²
 * Node Helper: MMM-Buttons
 *
 * By Joseph Bethge
 * MIT Licensed.
 *
 */

const {spawn, execSync} = require("child_process");
const Log = require("logger");
const NodeHelper = require("node_helper");
const fs = require("fs");

module.exports = NodeHelper.create({
    // Subclass start method.
    start () {
        Log.log(`Starting node helper for: ${this.name}`);

        this.loaded = false;
        this.monitors = [];
        this.gpioAvailable = this.checkGpioAvailable();
    },

    checkGpioAvailable () {
        // Check if we're on Linux
        if (process.platform !== "linux") {
            Log.warn("Not running on Linux - GPIO functionality disabled");
            return false;
        }

        // Check if gpiomon is installed (command -v is a POSIX shell built-in, works without `which`)
        try {
            execSync("command -v gpiomon", {stdio: "ignore"});
            this.gpiodVersion = this.getGpiodVersion();
            return true;
        } catch {
            Log.error("gpiod tools not found!");
            Log.error("Install with: sudo apt install gpiod");
            return false;
        }
    },

    getGpiodVersion () {
        try {
            const output = execSync("gpiomon --version", {encoding: "utf8"});
            const match = output.match(/v(?<major>\d+)\./u);
            if (match) {
                const version = parseInt(match.groups.major, 10);
                Log.log(`Detected libgpiod v${version}.x`);
                return version;
            }
        } catch {
            // ignore
        }
        Log.log("Could not detect libgpiod version, assuming v2");
        return 2;
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

        /*
         * Determine if this is a press or release based on edge and activeLow setting
         * activeLow (default): button connects to GND when pressed -> falling edge = press
         * activeHigh: button connects to VCC when pressed -> rising edge = press
         */
        const isPress = activeLow
            ? edge === "falling"
            : edge === "rising";

        if (isPress) {
            button.pressed = now;
            Log.debug(`Button ${index} (${button.name}) pressed`);
            this.sendSocketNotification("BUTTON_DOWN", {index});
        } else if (button.pressed !== null) {
            const duration = now - button.pressed;
            button.pressed = null;

            Log.debug(`Button ${index} (${button.name}) released after ${duration}ms`);
            this.sendSocketNotification("BUTTON_UP", {
                index,
                duration
            });
        }
    },

    getGpioChip () {
        /*
         * Detect the correct gpiochip for the platform
         * RPi5 uses gpiochip4 for GPIO header, older RPis use gpiochip0
         */
        let model = "";
        try {
            model = fs.readFileSync("/proc/device-tree/model", {encoding: "utf8"});
        } catch {
            // Fallback to gpiochip0
        }

        if (model.startsWith("Raspberry Pi 5")) {
            Log.log("RPi5 detected, using gpiochip4");
            return "gpiochip4";
        }

        return "gpiochip0";
    },

    parseGpiomonOutput (data, index, pin) {
        /*
         * libgpiod 2.x output format: "<timestamp> <edge> <line>"
         * e.g., "1702483200.123456789 rising 24"
         */
        const lines = data.toString().trim().split("\n");
        for (const line of lines) {
            Log.debug(`gpiomon output for pin ${pin}: ${line}`);
            // Handle both libgpiod v2 ("rising"/"falling") and v1 ("RISING EDGE"/"FALLING EDGE") output formats
            const lowerLine = line.toLowerCase();
            let edge = null;
            if (lowerLine.includes("rising")) {
                edge = "rising";
            } else if (lowerLine.includes("falling")) {
                edge = "falling";
            }
            if (edge) {
                Log.debug(`GPIO event on pin ${pin}: ${edge}`);
                this.handleGpioEvent(index, edge);
            }
        }
    },

    initializeButton (index) {
        const button = this.buttons[index];
        const chip = this.gpioChip;
        const pin = parseInt(button.pin, 10);
        const debounce = `${this.config.bounceTimeout}ms`;
        const activeLow = button.activeLow !== false;

        const bias = activeLow
            ? "pull-up"
            : "pull-down";

        const isV2 = this.gpiodVersion >= 2;
        if (isV2) {
            // libgpiod 2.x: supports -c <chip>, -b <bias>, -p <debounce-period>
            Log.log(`Starting gpiomon for pin ${pin} on ${chip} (bias: ${bias}, debounce: ${debounce})`);
        } else {
            // libgpiod 1.x: chip is positional, no hardware debounce support
            Log.warn("libgpiod v1.x - hardware debouncing not supported");
            Log.log(`Starting gpiomon for pin ${pin} on ${chip} (bias: ${bias})`);
        }
        const args = isV2
            ? ["-c", chip, "-b", bias, "-p", debounce, String(pin)]
            : ["-B", bias, chip, String(pin)];

        const monitor = spawn("gpiomon", args);

        monitor.stdout.on("data", (data) => this.parseGpiomonOutput(data, index, pin));

        monitor.stderr.on("data", (data) => {
            Log.error(`gpiomon error for pin ${pin}: ${data.toString()}`);
        });

        monitor.on("close", (code) => {
            if (code !== null && code !== 0) {
                Log.error(`gpiomon for pin ${pin} exited with code ${code}`);
            }
        });

        monitor.on("error", (err) => {
            Log.error(`Failed to start gpiomon for pin ${pin}: ${err.message}`);
            Log.error("Make sure gpiod is installed: sudo apt install gpiod");
        });

        this.monitors.push({pin, process: monitor});
    },

    initializeButtons () {
        if (this.loaded) {
            return;
        }

        if (!this.gpioAvailable) {
            Log.warn("Skipping button initialization - GPIO not available");
            return;
        }

        this.buttons = this.config.buttons;
        this.gpioChip = this.getGpioChip();

        this.buttons.forEach((button, index) => {
            Log.log(`Initialize button ${button.name} on PIN ${button.pin}`);
            button.pressed = null;
            this.initializeButton(index);
        });

        this.loaded = true;
    }
});
