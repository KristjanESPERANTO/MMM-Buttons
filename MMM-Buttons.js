/*
 * MagicMirror²
 * Module: Buttons
 *
 * By Joseph Bethge
 * MIT Licensed.
 */

Module.register("MMM-Buttons", {

    // Default module config.
    defaults: {
        buttons: [
            {
                pin: 24,
                activeLow: false,
                name: "Button",
                shortPress: [
                    {
                        title: "",
                        message: "",
                        imageFA: "",
                        notification: "",
                        payload: ""
                    }
                ],
                longPress: [
                    {
                        title: "",
                        message: "",
                        imageFA: "",
                        notification: "",
                        payload: ""
                    }
                ]
            }
        ],
        minShortPressTime: 0,
        maxShortPressTime: 500,
        minLongPressTime: 3000,
        bounceTimeout: 300
    },

    // Define start sequence.
    start () {
        Log.info(`Starting module: ${this.name}`);

        this.sendConfig();

        const buttonCount = this.config.buttons.length;
        this.intervals = Array(buttonCount).fill(null);
        this.alerts = Array(buttonCount).fill(false);
    },

    // Override dom generator.
    getDom () {
        const wrapper = document.createElement("div");

        return wrapper;
    },

    /*
     * sendConfig()
     * initialize backend
     */
    sendConfig () {
        this.sendSocketNotification("BUTTON_CONFIG", {
            config: this.config
        });
    },

    buttonUp (index, duration) {
        if (this.alerts[index]) {
            // alert already shown, clear interval to update it and hide it
            if (this.intervals[index] !== null) {
                clearInterval(this.intervals[index]);
            }
            this.alerts[index] = false;
            this.sendNotification("HIDE_ALERT");
        } else if (this.intervals[index] !== null) {
            // no alert shown, clear time out for showing it
            clearTimeout(this.intervals[index]);
        }
        this.intervals[index] = null;

        let min = this.config.minShortPressTime;
        const max = this.config.maxShortPressTime;
        const {shortPress} = this.config.buttons[index];
        const {longPress} = this.config.buttons[index];

        if (shortPress && min <= duration && duration <= max) {
            this.sendAction(shortPress);
        }

        min = this.config.minLongPressTime;
        if (longPress && min <= duration) {
            this.sendAction(longPress);
        }
    },

    sendAction (description) {
        for (const action of description) {
            if (action?.notification) {
                this.sendNotification(action.notification, action.payload);
            } else {
                Log.debug(`${this.name}: No frontend notification configured for this action (this is OK if handled by node_helper)`);
            }
        }
    },

    buttonDown (index) {
        if (this.config.buttons[index].longPress?.title) {
            this.intervals[index] = setTimeout(() => {
                this.startAlert(index);
            }, this.config.maxShortPressTime);
        }
    },

    showAlert (index) {
    // display the message
        this.sendNotification("SHOW_ALERT", {
            title: this.config.buttons[index].longPress.title,
            message: this.config.buttons[index].longPress.message,
            imageFA: this.config.buttons[index].longPress.imageFA
        });
    },

    startAlert (index) {
        this.alerts[index] = true;
        this.showAlert(index);
    },

    // Override socket notification handler.
    socketNotificationReceived (notification, payload) {
        if (notification === "BUTTON_UP") {
            this.buttonUp(payload.index, payload.duration);
        }
        if (notification === "BUTTON_DOWN") {
            this.buttonDown(payload.index);
        }
    }
});
