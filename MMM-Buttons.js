/*
 * MagicMirror²
 * Module: MMM-Buttons
 *
 * By Joseph Bethge
 * MIT Licensed.
 */

Module.register("MMM-Buttons", {

    // Default module config.
    defaults: {
        buttons: [],
        minShortPressTime: 0,
        maxShortPressTime: 1000,
        minLongPressTime: 3000,
        bounceTimeout: 300,
        debugLimit: 5
    },

    // Define start sequence.
    start () {
        Log.info(`Starting module: ${this.name}`);

        this.sendConfig();

        const buttonCount = this.config.buttons.length;
        this.intervals = Array(buttonCount).fill(null);
        this.alerts = Array(buttonCount).fill(false);
        this.eventLog = [];
    },

    // Override dom generator.
    getDom () {
        const wrapper = document.createElement("div");

        if (this.data.position && this.eventLog.length) {
            const title = document.createElement("div");
            title.innerText = "MMM-Buttons debug";
            title.style.fontWeight = "bold";
            title.style.marginBottom = "4px";

            const list = document.createElement("ul");
            list.style.margin = "0";
            list.style.paddingLeft = "16px";
            list.style.fontSize = "12px";

            this.eventLog.forEach((entry) => {
                const li = document.createElement("li");
                let text = `${entry.time} – ${entry.name || "Button"} (${entry.index}) ${entry.type}`;
                if (Number.isFinite(entry.duration)) {
                    text += ` (${entry.duration}ms)`;
                }
                if (entry.pressType) {
                    text += ` → ${entry.pressType} press`;
                }
                if (entry.actions && entry.actions.length > 0) {
                    text += `: ${entry.actions.join(", ")}`;
                }
                li.innerText = text;
                list.appendChild(li);
            });

            wrapper.appendChild(title);
            wrapper.appendChild(list);
        }

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

    handleAlertOnRelease (index) {
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
    },

    processButtonPress (index, duration) {
        const {shortPress, longPress} = this.config.buttons[index];
        const max = this.config.maxShortPressTime;

        if (shortPress && this.config.minShortPressTime <= duration && duration <= max) {
            this.sendAction(shortPress);
            return {pressType: "short", actions: this.getActionNames(shortPress)};
        }

        if (longPress && this.config.minLongPressTime <= duration) {
            this.sendAction(longPress);
            return {pressType: "long", actions: this.getActionNames(longPress)};
        }

        return {pressType: null, actions: []};
    },

    buttonUp (index, duration) {
        this.handleAlertOnRelease(index);
        const {pressType, actions} = this.processButtonPress(index, duration);
        this.logEvent({type: "up", index, duration, pressType, actions});
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

    getActionNames (description) {
        const names = [];
        for (const action of description) {
            if (action?.notification) {
                let name = action.notification;
                // Add payload action if available for more detail
                if (action.payload?.action) {
                    name += `(${action.payload.action})`;
                }
                names.push(name);
            }
        }
        return names;
    },

    logEvent (event) {
        if (!this.data.position) {
            return;
        }

        const button = this.config.buttons[event.index] || {};
        const time = new Date().toLocaleTimeString();

        this.eventLog.push({
            type: event.type,
            index: event.index,
            name: button.name,
            duration: event.duration,
            pressType: event.pressType,
            actions: event.actions,
            time
        });

        if (this.eventLog.length > this.config.debugLimit) {
            this.eventLog.shift();
        }

        this.updateDom();
    },

    buttonDown (index) {
        const longPressConfig = this.config.buttons[index].longPress?.[0];
        if (longPressConfig?.title) {
            this.intervals[index] = setTimeout(() => {
                this.startAlert(index);
            }, this.config.maxShortPressTime);
        }
    },

    showAlert (index) {
        const longPressConfig = this.config.buttons[index].longPress?.[0];
        // display the message
        this.sendNotification("SHOW_ALERT", {
            title: longPressConfig.title,
            message: longPressConfig.message,
            imageFA: longPressConfig.imageFA
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
            this.logEvent({type: "down", index: payload.index});
        }
    }
});
