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
            Log.warn(`${this.name}: Not running on Linux - GPIO functionality disabled`);
            return false;
        }

        // Check if gpiomon is installed
        try {
            execSync("which gpiomon", {stdio: "ignore"});
            return true;
        } catch {
            Log.error(`${this.name}: gpiod tools not found!`);
            Log.error(`${this.name}: Install with: sudo apt install gpiod`);
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
            Log.debug(`${this.name}: Button ${index} (${button.name}) pressed`);
            this.sendSocketNotification("BUTTON_DOWN", {index});
        } else if (button.pressed !== null) {
            const duration = now - button.pressed;
            button.pressed = null;

            Log.debug(`${this.name}: Button ${index} (${button.name}) released after ${duration}ms`);
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
            Log.log(`${this.name}: RPi5 detected, using gpiochip4`);
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
            Log.debug(`${this.name}: gpiomon output for pin ${pin}: ${line}`);
            let edge = null;
            if (line.includes("rising")) {
                edge = "rising";
            } else if (line.includes("falling")) {
                edge = "falling";
            }
            if (edge) {
                Log.debug(`${this.name}: GPIO event on pin ${pin}: ${edge}`);
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

        // gpiomon args for libgpiod 2.x with hardware debouncing and bias
        const bias = activeLow
            ? "pull-up"
            : "pull-down";
        const args = ["-c", chip, "-b", bias, "-p", debounce, String(pin)];

        Log.log(`${this.name}: Starting gpiomon for pin ${pin} on ${chip} (bias: ${bias}, debounce: ${debounce})`);

        const monitor = spawn("gpiomon", args);

        monitor.stdout.on("data", (data) => this.parseGpiomonOutput(data, index, pin));

        monitor.stderr.on("data", (data) => {
            Log.error(`${this.name}: gpiomon error for pin ${pin}: ${data.toString()}`);
        });

        monitor.on("close", (code) => {
            if (code !== null && code !== 0) {
                Log.error(`${this.name}: gpiomon for pin ${pin} exited with code ${code}`);
            }
        });

        monitor.on("error", (err) => {
            Log.error(`${this.name}: Failed to start gpiomon for pin ${pin}: ${err.message}`);
            Log.error(`${this.name}: Make sure gpiod is installed: sudo apt install gpiod`);
        });

        this.monitors.push({pin, process: monitor});
    },

    initializeButtons () {
        if (this.loaded) {
            return;
        }

        if (!this.gpioAvailable) {
            Log.warn(`${this.name}: Skipping button initialization - GPIO not available`);
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
