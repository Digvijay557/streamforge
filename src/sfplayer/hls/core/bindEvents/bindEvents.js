import { SFPlayerError } from "../Errorhandling/SFPlayerError.js";
import {
    togglePlay,
    seek,
    setVolume,
    toggleFullscreen,
    picinpic,
    handleKeyboard,
    resetControlsTimer,
    showControls,
    hideControls,
    updateProgress,
    updateBuffer,
    hideBuffer,
    showBuffer,
    toggleMute
} from '../controlFunctions/controlFunctions.js';

// ==========================================================
// NOTE ON CALLING CONVENTION
// ==========================================================
// controlFunctions.js exports plain functions that take the
// player instance as an explicit first argument, e.g.
// togglePlay(player). This file is invoked as
// bindEvents.call(playerInstance, errorHandler) from
// sfplayer.js's render(), so `this` here IS the player — every
// control function below must be called as fn(this, ...args),
// NOT fn.call(this, ...args) (which — since these functions
// read their state off an explicit `player` param, not off
// their own `this` — silently passed `player` as `undefined`
// and threw on the first property access).
export default function bindEvents(errorHandler) {
    // -------------------------------------------------------------
    // Play/Pause Control
    // -------------------------------------------------------------
    this.playBtn?.addEventListener("click", async () => {
        if (!this.loaded) {
            this.playBtn.disabled = true;
            errorHandler.clearError();

            try {
                await this.load();
                this.loaded = true;
            } catch (error) {
                // load() already reports fatal errors via errorHandler
                // before throwing — only report here if this is something
                // that never went through that path.
                if (!(error instanceof SFPlayerError)) {
                    errorHandler.handleFatalError(error);
                }
                return;
            } finally {
                this.playBtn.disabled = false;
            }

            // load() handles starting playback via #safePlay().
            return;
        }

        togglePlay(this);
    });

    // -------------------------------------------------------------
    // Control Bar & Menu Toggles
    // -------------------------------------------------------------
    this.controlsButtons?.forEach(controlBtn => {
        controlBtn.addEventListener("click", () => {
            const menu = this.root.querySelector(`.${controlBtn.dataset.rmenu}`);
            if (!menu) return;

            const isOpen = menu.classList.contains("show");

            this.subControlMenus?.forEach(m => m.classList.remove("show"));

            if (!isOpen) {
                menu.classList.add("show");
            }
        });
    });

    this.settingsBtn?.addEventListener("click", () => {
        this.subControlMenus?.forEach(menu => menu.classList.remove("show"));
        this.settingsmenu?.classList.toggle("show");
    });

    // -------------------------------------------------------------
    // Video State Events
    // -------------------------------------------------------------
    this.video.addEventListener("play", () => {
        this.playBtn.textContent = "⏸";
        resetControlsTimer(this);
        hideBuffer(this);
        this.emit("play");
    });

    this.video.addEventListener("playing", () => {
        this.isBuffering = false;
        hideBuffer(this);
        this.Gprogess?.classList.add("hidden");
        this.emit("buffered");
    });

    this.video.addEventListener("waiting", () => {
        this.isBuffering = true;
        showBuffer(this);
        this.emit("buffering");
    });

    this.video.addEventListener("pause", () => {
        this.playBtn.textContent = "▶";
        showControls(this);
        hideBuffer(this);
        this.emit("pause");
    });

    this.video.addEventListener("ended", () => {
        this.emit("ended");
    });

    this.video.addEventListener("error", () => {
        const mediaError = this.video.error;
        if (!mediaError) return;

        errorHandler.handleFatalError(
            new SFPlayerError(
                `Video element error${mediaError.message ? `: ${mediaError.message}` : ""} (code ${mediaError.code})`,
                "MEDIA_ELEMENT_ERROR",
                mediaError
            )
        );
    });

    // Combined Metadata & Dimension Listener
    this.video.addEventListener("loadedmetadata", () => {
        updateProgress(this);

        if (this.video.videoWidth && this.video.videoHeight) {
            const ratio = `${this.video.videoWidth} / ${this.video.videoHeight}`;
            this.player.style.setProperty("aspect-ratio", ratio, "important");
        }
    });

    // Real-Time Playback Progress Updates
    this.video.addEventListener("timeupdate", () => {
        updateProgress(this);
    });

    // Dynamic Network Buffer Updates
    this.video.addEventListener("progress", () => {
        updateBuffer(this);
    });

    // -------------------------------------------------------------
    // Seeking, Volume, Speed & Interaction Controls
    // -------------------------------------------------------------
    this.progress?.addEventListener("click", (event) => {
        seek(this, event);
        updateBuffer(this);
    });

    this.volumeBtn?.addEventListener("click", () => {
        toggleMute(this);
    });

    this.volumeSlider?.addEventListener("click", (e) => {
        setVolume(this, e);
    });

    this.video.addEventListener("volumechange", () => {
        this.emit("volumechange", {
            volume: this.video.volume,
            muted: this.video.muted
        });
    });

    this.speeds?.forEach(speed => {
        speed.addEventListener("click", () => {
            this.playbackSpeed = Number(speed.dataset.speed);
            this.video.playbackRate = this.playbackSpeed;
            this.emit("speedchange", {
                speed: this.playbackSpeed
            });
        });
    });

    this.fullscreenBtn?.addEventListener("click", () => {
        toggleFullscreen(this);
    });

    this.pip?.addEventListener("click", () => picinpic(this));

    // Bug fix: was `retry.call(this)` — there is no `retry` export in
    // controlFunctions.js (ReferenceError), and the actual retry logic
    // already lives, fully implemented, on SFPlayerErrorHandler — it
    // just needed to be called.
    this.retryy?.addEventListener("click", async () => {
        await errorHandler.retry();
        this.emit("retry");
    });

    this.player?.addEventListener("mousemove", () => {
        resetControlsTimer(this);
    });

    this.root?.addEventListener("fullscreenchange", () => {
        // Bug fix: was `this.isFullscreen()`, a method that doesn't
        // exist anywhere on the class — threw every time the user
        // entered/exited fullscreen.
        this.emit("fullscreenchange", {
            fullscreen: Boolean(document.fullscreenElement)
        });
    });

    // -------------------------------------------------------------
    // Global Document Event Listeners
    // -------------------------------------------------------------
    this._onKeydown = (event) => handleKeyboard(this, event);
    document.addEventListener("keydown", this._onKeydown);
}
