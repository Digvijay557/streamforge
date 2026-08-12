/**
 * Structured error type for SFPlayer failures.
 */
export class SFPlayerError extends Error {
    constructor(message, code = "UNKNOWN", cause = null) {
        super(message);
        this.name = "SFPlayerError";
        this.code = code;
        if (cause) this.cause = cause;
        this.internalSeek = false;
        this.currentController = null;
    }
}

/**
 * Reusable Error Handler manager for SFPlayer UI and Event dispatching.
 */
export class SFPlayerErrorHandler {
    /**
     * @param {HTMLElement} player - Reference to the SFPlayer web component instance
     */
    constructor(player) {
        this.player = player;
    }

    /**
     * Normalizes any error to SFPlayerError and triggers UI + events.
     * @param {Error|SFPlayerError|string} error 
     */
    handleFatalError(error) {
        const sfError = error instanceof SFPlayerError
            ? error
            : new SFPlayerError(error?.message || "Unknown player error", "UNKNOWN", error);

        console.error(`[SFPlayer] ${sfError.code}: ${sfError.message}`, sfError.cause || "");

        this.showError(sfError.message);

        this.player.emit("error", {
            sferrcode: sfError.code,
            message: sfError.message,
            cause: sfError.cause
        });

        return sfError;
    }

    /**
     * Displays the error message on the player UI elements.
     * @param {string} message 
     */
    showError(message) {
        if (!this.player.errorBanner) return;
        this.player.errorBanner.textContent = message;
        this.player.errorBanner.classList.remove("hidden");
        if (this.player.retryy) {
            this.player.retryy.classList.remove("hidden");
        }
    }

    /**
     * Clears error states and hides UI banners.
     */
    clearError() {
        if (!this.player.errorBanner) return;
        this.player.errorBanner.textContent = "";
        this.player.errorBanner.classList.add("hidden");
        if (this.player.retryy) {
            this.player.retryy.classList.add("hidden");
        }
    }

    /**
     * Handles retry execution.
     */
    async retry() {
        this.clearError();

        this.player.segmentLoader = null;
        this.player.media = null;

        if (this.player.progressSource) {
            this.player.progressSource.close();
            this.player.progressSource = null;
        }

        try {
            if (this.player.playBtn) this.player.playBtn.disabled = true;
            if (this.player.retryy) this.player.retryy.disabled = true;

            await this.player.load();
            this.player.loaded = true;
        } catch (error) {
            this.handleFatalError(error);
        } finally {
            if (this.player.playBtn) this.player.playBtn.disabled = false;
            if (this.player.retryy) this.player.retryy.disabled = false;
        }
    }
}