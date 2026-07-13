export class Streamforge {

    static config = {
        endpoint: window.location.origin
    };

    static init(config = {}) {

        if (typeof config !== "object" || config === null) {
            throw new TypeError("config must be an object.");
        }

        this.config = {
            ...this.config,
            ...config
        };
    }

    static get endpoint() {
        return this.config.endpoint;
    }
}