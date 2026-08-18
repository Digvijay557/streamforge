/**
 * Structured error type for SFPlayer failures.
 */

import playNative from "../playbackEngine/playNative.js";
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
        this.nativeFallbackAttempted = false;   // prevent infinite fallback loops
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

        // ── Native fallback ──────────────────────────────────────────
        // Only attempt this once per load, and only for errors that mean
        // the MSE pipeline itself is broken (not e.g. a seek failure).
        const FALLBACK_CODES = new Set([
            "MEDIA_INIT_FAILURE",
            "SEGMENT_LOAD_FAILURE",
            "INIT_SEGMENT_FAILURE",
            "PARSE_FAILURE",
            "SEGMENT_LOADER_INIT_FAILURE",
            "NETWORK_FAILURE",
        ]);

        if (!this.nativeFallbackAttempted && FALLBACK_CODES.has(sfError.code)) {
            this.nativeFallbackAttempted = true;
            console.warn("[SFPlayer] MSE engine failed, falling back to native playback");

            try {
                const video = this.player.getAttribute("video");
                const fallbackQuality =
                    this.player.qualities?.[0]?.quality ?? this.player.qualities?.[0]?.index ?? 0;

                playNative(this.player, video, fallbackQuality);
              
                
                this.player.protocol = "native";

                // Don't show the error banner — fallback succeeded (or is attempting to)
                this.player.emit("fallback", { reason: sfError.code });
                return sfError;
            } catch (fallbackErr) {
                console.error("[SFPlayer] Native fallback also failed:", fallbackErr);
                // fall through to normal error display below
            }
        }
        // ─────────────────────────────────────────────────────────────

        this.showError(sfError.message);

        this.player.emit("error", {
            sferrcode: sfError.code,
            message: sfError.message,
            cause: sfError.cause
        });

        return sfError;
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