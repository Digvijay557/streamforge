import { parsePlaylist } from "../parser/Parser.js";
import Network from "../network/Network.js";
import { Streamforge } from "./streamforge.js";
import { MediaEngine } from "../media/mediaengine.js"
import { SegmentLoader } from "../loader/medialoader.js"

// ==========================================================
// Structured error type — mirrors the error-class pattern
// used in generateHLS.js so failures are inspectable by
// code (err.code) instead of just by message string.
// ==========================================================
class SFPlayerError extends Error {
    constructor(message, code, cause) {
        super(message);
        this.name = "SFPlayerError";
        this.code = code || "UNKNOWN";
        if (cause) this.cause = cause;
    }
}

class SFPlayer extends HTMLElement {

    // ==========================================================
    // Lifecycle
    // ==========================================================

    constructor() {
        super();
        this.controlsTimeout = null;
        this.loaded = false;
        this.network = new Network();
        this.attachShadow({ mode: "open" });
        this.root = this.shadowRoot;
        
    }

    disconnectedCallback() {
        // Prevent keydown listener leak — every mounted <sf-player>
        // was previously stacking a global document listener that
        // never got cleaned up.
        if (this._onKeydown) {
            document.removeEventListener("keydown", this._onKeydown);
        }
        clearTimeout(this.controlsTimeout);

        if (this.video && this._onTimeUpdate) {
            this.video.removeEventListener("timeupdate", this._onTimeUpdate);
        }
    }


    connectedCallback() {
        this.init();
    }

    // ==========================================================
    // Network helper — wraps this.network.request() so every
    // caller gets consistent error handling instead of letting
    // raw fetch/Network errors bubble up unformatted.
    // ==========================================================

    async #request(url, context) {
        if (!url) {
            throw new SFPlayerError(
                `Missing URL while requesting ${context}`,
                "NO_SOURCE"
            );
        }

        let response;
        try {
            response = await this.network.request(url);
        } catch (err) {
            throw new SFPlayerError(
                `Network request failed while requesting ${context}: ${err.message}`,
                "NETWORK_FAILURE",
                err
            );
        }

        if (response && response.ok === false) {
            throw new SFPlayerError(
                `Server returned an error (${response.status || "unknown status"}) while requesting ${context}`,
                "HTTP_ERROR"
            );
        }

        return response;
    }

    #parsePlaylistSafe(text, context) {
        try {
            return parsePlaylist(text);
        } catch (err) {
            throw new SFPlayerError(
                `Failed to parse ${context}: ${err.message}`,
                "PARSE_FAILURE",
                err
            );
        }
    }

    async load() {

        // ==========================================================
        // Get Video Source
        // ==========================================================

        const video = this.getAttribute("video");

        if (!video) {
            throw new SFPlayerError(
                "No 'video' attribute set on <sf-player>",
                "NO_SOURCE"
            );
        }

        // ==========================================================
        // Request Master Playlist
        // ==========================================================

        console.log("① Requesting master playlist");

        const masterResponse = await this.#request(video, "master playlist");
        const masterText = await masterResponse.text();
        const masterPlaylist = this.#parsePlaylistSafe(masterText, "master playlist");

        console.log(masterPlaylist);

        // ==========================================================
        // Request Variant Playlist
        // ==========================================================

        const variant = masterPlaylist.variants?.[0];

        if (!variant || !variant.uri) {
            throw new SFPlayerError(
                "Master playlist has no playable variants",
                "NO_VARIANTS"
            );
        }

        console.log("② Requesting variant playlist");

        const variantResponse = await this.#request(variant.uri, "variant playlist");
        const variantText = await variantResponse.text();
        const variantPlaylist = this.#parsePlaylistSafe(variantText, "variant playlist");

        if (!variantPlaylist.segments || variantPlaylist.segments.length === 0) {
            throw new SFPlayerError(
                "Variant playlist has no segments",
                "NO_SEGMENTS"
            );
        }

        this.variantPlaylist = variantPlaylist;

        console.log(variantPlaylist);

        // ==========================================================
        // Initialize Media Engine
        // ==========================================================

        if (!this.media) {
            try {
                this.media = new MediaEngine(this.video);
                await this.media.ready();
            } catch (err) {
                this.media = null;
                throw new SFPlayerError(
                    `Failed to initialize media engine: ${err.message}`,
                    "MEDIA_INIT_FAILURE",
                    err
                );
            }
        }

        // ==========================================================
        // Set Total Duration on MediaSource
        // ==========================================================

        const totalDuration = variantPlaylist.segments.reduce(
            (sum, seg) => sum + seg.duration, 0
        );

        if (typeof this.media.setDuration === "function") {
            this.media.setDuration(totalDuration);
        } else {
            console.warn(
                "⚠️ MediaEngine has no setDuration() — add one, or video.duration will stay NaN and seeking will break."
            );
        }

        // ==========================================================
        // Request & Append Init Segment
        // ==========================================================

        console.log("③ Requesting init segment");

        if (!variantPlaylist.initSegment) {
            throw new SFPlayerError(
                "Variant playlist has no init segment",
                "NO_INIT_SEGMENT"
            );
        }

        const initResponse = await this.#request(variantPlaylist.initSegment, "init segment");

        let initBytes;
        try {
            initBytes = await initResponse.arrayBuffer();
            await this.media.append(initBytes);
        } catch (err) {
            throw new SFPlayerError(
                `Failed to append init segment: ${err.message}`,
                "INIT_SEGMENT_FAILURE",
                err
            );
        }

        // ==========================================================
        // Set Up Segment Loader
        // ==========================================================

        console.log("④ Setting up Segment Loader");

        try {
            this.segmentLoader = new SegmentLoader(this.network, this.media);
            this.segmentLoader.setPlaylist(variantPlaylist);
        } catch (err) {
            throw new SFPlayerError(
                `Failed to initialize segment loader: ${err.message}`,
                "SEGMENT_LOADER_INIT_FAILURE",
                err
            );
        }

        // ==========================================================
        // Load First Segment
        // ==========================================================

        console.log("⑤ Loading first segment");

        this.loadedDuration = 0;

        const firstSegmentDuration = variantPlaylist.segments[0].duration;

        let firstLoaded;
        try {
            firstLoaded = await this.segmentLoader.loadNext();
        } catch (err) {
            throw new SFPlayerError(
                `Failed to load first segment: ${err.message}`,
                "SEGMENT_LOAD_FAILURE",
                err
            );
        }

        if (firstLoaded) {
            this.loadedDuration += firstSegmentDuration;
        } else {
            throw new SFPlayerError(
                "First segment failed to load",
                "SEGMENT_LOAD_FAILURE"
            );
        }

        // ==========================================================
        // Start Playback
        // ==========================================================

        console.log("⑥ Starting playback");

        this.#safePlay();

        // ==========================================================
        // Wire Up timeupdate → loadNext()
        // ==========================================================

        this.PREFETCH_THRESHOLD = 2; // seconds of lead time before loading next segment

        this._onTimeUpdate = async () => {

            if (this.segmentLoader.loading) return;

            const remaining =
                this.loadedDuration - this.video.currentTime;

            if (remaining > this.PREFETCH_THRESHOLD) return;

            const nextIndex = this.segmentLoader.currentSegment;
            const nextSegment = variantPlaylist.segments[nextIndex];

            if (!nextSegment) return; // playlist ended, nothing left to load

            try {
                const loaded = await this.segmentLoader.loadNext();

                if (loaded) {
                    this.loadedDuration += nextSegment.duration;
                } else {
                    // Loader returned false without throwing — treat as a
                    // recoverable miss, don't kill playback, just log and
                    // let the next timeupdate tick retry.
                    console.warn(`⚠️ Segment ${nextIndex} failed to load, will retry`);
                }
            } catch (err) {
                // This previously would have been an unhandled promise
                // rejection inside an event listener — the video would
                // just silently stall with nothing in the console tying
                // it back to a cause.
                console.error(`❌ Error loading segment ${nextIndex}:`, err);
                this.#handleFatalError(
                    new SFPlayerError(
                        `Playback stalled: failed to load segment ${nextIndex}`,
                        "SEGMENT_LOAD_FAILURE",
                        err
                    )
                );
            }

        };

        this.video.addEventListener("timeupdate", this._onTimeUpdate);

        this.dispatchEvent(new CustomEvent("sf-ready", {
            detail: { duration: totalDuration }
        }));
    }

    init() {
        

        this.render();
    }

    // ==========================================================
    // Render
    // ==========================================================

    render() {
        this.root.innerHTML = `
            ${this.#renderStyles()}
            ${this.#renderHTML()}
        `;

        this.#cacheElements();

        this.#initializeAttributes();
        this.#bindEvents();
    }

    #renderStyles() {
        return `
        <style>
            :host {
             --sf-accent: #FBBF24;

                display: block;
                width: 100%;
            }
            .sf-controls {
                opacity: 1;
                transition: opacity .25s ease;
        }       

            .sf-controls.hidden {
                opacity: 0;
                pointer-events: none;
        }
            .sf-player {
                position: relative;
                width: 100%;
                background: #0f0f0f;
                border-radius: 14px;
                overflow: hidden;
            }

            video {
                display: block;
                width: 100%;
                background: #000;
            }

            .sf-controls {
                position: absolute;
                left: 0;
                right: 0;
                bottom: 0;

                display: flex;
                flex-direction: column;

                background: linear-gradient(
                    transparent,
                    rgba(0,0,0,.5)
                );

                color: white;
            }

            .sf-progress {
                position: relative;
                width: 100%;
                height: 4px;
                background: rgba(255,255,255,.2);
                cursor: pointer;
            }

            .sf-progress-played {
                width: 0%;
                height: 100%;
                background: #FBBF24;
            }

            .sf-progress-thumb,
            .sf-progress-buffer{
                display:none;
            }

            .sf-controls-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;

                padding: 10px;
            }

            .sf-controls-left,
            .sf-controls-right {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            button {
                background: transparent;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 18px;
            }

            button:disabled {
                opacity: .5;
                cursor: not-allowed;
            }

            .sf-time{
                font-size:14px;
            }
                .sf-volume{
    display:flex;
    align-items:center;
    gap:8px;
}

.sf-volume-slider{
    width:80px;
    height:4px;

    background:rgba(255,255,255,.2);

    border-radius:999px;

    cursor:pointer;
}

.sf-volume-level{
    width:100%;
    height:100%;

    background:var(--sf-accent);

    border-radius:999px;
}

.sf-error {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;

    padding: 10px 14px;

    background: rgba(185, 28, 28, .92);
    color: white;
    font-size: 13px;
    line-height: 1.4;

    z-index: 5;
}

.sf-error.hidden {
    display: none;
}
        </style>
    `;
    }

    #renderHTML() {
        return `
            <div class="sf-player">

    <div class="sf-error hidden"></div>

    <video></video>

    <div class="sf-controls">

        <div class="sf-progress">
            <div class="sf-progress-buffer"></div>
            <div class="sf-progress-played"></div>
            <div class="sf-progress-thumb"></div>
        </div>

        <div class="sf-controls-bottom">

            <div class="sf-controls-left">

                <button class="sf-play-btn">
                    ▶
                </button>

                <span class="sf-time">
                    00:00 / 00:00
                </span>

            </div>

            <div class="sf-controls-right">

                <div class="sf-volume">

    <button class="sf-volume-btn">
        🔊
    </button>

    <div class="sf-volume-slider">

        <div class="sf-volume-level"></div>

    </div>

</div>

                <button class="sf-settings-btn">
                    ⚙
                </button>

                <button class="sf-fullscreen-btn">
                    ⛶
                </button>

            </div>

        </div>

    </div>

</div>
        `;
    }

    #cacheElements() {
        this.player = this.root.querySelector(".sf-player");
        this.video = this.root.querySelector("video");

        this.controls = this.root.querySelector(".sf-controls");
        this.errorBanner = this.root.querySelector(".sf-error");

        this.progress = this.root.querySelector(".sf-progress");
        this.progressPlayed = this.root.querySelector(".sf-progress-played");
        this.progressBuffer = this.root.querySelector(".sf-progress-buffer");
        this.progressThumb = this.root.querySelector(".sf-progress-thumb");

        this.controlsBottom = this.root.querySelector(".sf-controls-bottom");

        this.controlsLeft = this.root.querySelector(".sf-controls-left");
        this.controlsRight = this.root.querySelector(".sf-controls-right");

        this.playBtn = this.root.querySelector(".sf-play-btn");
        this.time = this.root.querySelector(".sf-time");

        this.volumeBtn = this.root.querySelector(".sf-volume-btn");
        this.settingsBtn = this.root.querySelector(".sf-settings-btn");
        this.fullscreenBtn = this.root.querySelector(".sf-fullscreen-btn");

        this.volume = this.root.querySelector(".sf-volume");

        this.volumeSlider = this.root.querySelector(".sf-volume-slider");
        this.volumeLevel = this.root.querySelector(".sf-volume-level");
    }

    #initializeAttributes() {
        this.#initializeSource();
        this.#updateVolumeUI();
    }

    #initializeSource() {
        const video = this.getAttribute("video");

        if (video) {
            this.video.src = video;
        } else {
            console.warn("⚠️ <sf-player> mounted without a 'video' attribute — load() will fail until one is set.");
        }
    }

    // ==========================================================
    // Error UI
    // ==========================================================

    #handleFatalError(error) {
        const sfError = error instanceof SFPlayerError
            ? error
            : new SFPlayerError(error?.message || "Unknown player error", "UNKNOWN", error);

        console.error(`[SFPlayer] ${sfError.code}: ${sfError.message}`, sfError.cause || "");

        this.#showError(sfError.message);

        this.dispatchEvent(new CustomEvent("sf-error", {
            detail: { code: sfError.code, message: sfError.message, cause: sfError.cause }
        }));
    }

    #showError(message) {
        if (!this.errorBanner) return;
        this.errorBanner.textContent = message;
        this.errorBanner.classList.remove("hidden");
    }

    #clearError() {
        if (!this.errorBanner) return;
        this.errorBanner.textContent = "";
        this.errorBanner.classList.add("hidden");
    }

    // ==========================================================
    // Event Binding
    // ==========================================================

    #bindEvents() {

        this.playBtn.addEventListener("click", async () => {

            if (!this.loaded) {

                this.playBtn.disabled = true;
                this.#clearError();

                try {
                    await this.load();
                    this.loaded = true;
                } catch (error) {
                    console.error(error);
                    this.#handleFatalError(error);
                    return;
                } finally {
                    this.playBtn.disabled = false;
                }

                // load() already starts playback via #safePlay(). Falling
                // through to #togglePlay() here would immediately pause
                // the video that was just started — that was a real bug
                // in the previous version.
                return;
            }

            this.#togglePlay();

        });

        this.video.addEventListener("play", () => {
            this.playBtn.textContent = "⏸";
            this.#resetControlsTimer();
        });

        this.video.addEventListener("pause", () => {
            this.playBtn.textContent = "▶";
            this.#showControls();
        });

        this.video.addEventListener("timeupdate", () => {
            this.#updateProgress();
        });

        this.video.addEventListener("loadedmetadata", () => {
            this.#updateProgress();
        });

        this.video.addEventListener("error", () => {
            const mediaError = this.video.error;
            
        });

        this.volumeBtn.addEventListener("click", () => {
            this.#toggleMute();
        });

        this.volumeSlider.addEventListener("click", (e) => {
            this.#setVolume(e);
        });

        this.progress.addEventListener("click", (event) => {
            this.#seek(event);
        });

        this.fullscreenBtn.addEventListener("click", () => {
            this.#toggleFullscreen();
        });

        this.player.addEventListener("mousemove", () => {
            this.#resetControlsTimer();
        });

        // Store the bound reference so it can be removed in
        // disconnectedCallback() — previously this leaked one
        // global document listener per mounted <sf-player>.
        this._onKeydown = (event) => this.#handleKeyboard(event);
        document.addEventListener("keydown", this._onKeydown);

    }

    // ==========================================================
    // Playback
    // ==========================================================

    #togglePlay() {
        if (this.video.paused) {
            this.#safePlay();
        } else {
            this.video.pause();
        }
    }

    // Wraps video.play() so a race with pause() doesn't throw an
    // unhandled promise rejection into the console.
    #safePlay() {
        let playPromise;

        try {
            playPromise = this.video.play();
        } catch (err) {
            // play() can throw synchronously (e.g. no supported source).
            this.#handleFatalError(
                new SFPlayerError(`Playback failed to start: ${err.message}`, "PLAYBACK_FAILURE", err)
            );
            return;
        }

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(err => {
                if (err.name !== "AbortError") {
                    console.error("Playback error:", err);
                    this.#handleFatalError(
                        new SFPlayerError(`Playback failed: ${err.message}`, "PLAYBACK_FAILURE", err)
                    );
                }
            });
        }
    }

    // ==========================================================
    // Progress / Time
    // ==========================================================

    #updateProgress() {
        const current = this.video.currentTime;
        const duration = this.video.duration;

        const percent = (Number.isFinite(duration) && duration > 0)
            ? (current / duration) * 100
            : 0;

        this.progressPlayed.style.width = `${percent}%`;

        this.time.textContent =
            `${this.#formatTime(current)} / ${this.#formatTime(duration)}`;
    }

    #findSegmentIndexForTime(time) {
        if (!this.variantPlaylist || !this.variantPlaylist.segments?.length) {
            return 0;
        }

        let elapsed = 0;
        const segments = this.variantPlaylist.segments;

        for (let i = 0; i < segments.length; i++) {
            elapsed += segments[i].duration;
            if (time < elapsed) return i;
        }
        return segments.length - 1;
    }

    // Check if a time is already inside a buffered range
    #isBuffered(time) {
        const buffered = this.video.buffered;
        for (let i = 0; i < buffered.length; i++) {
            if (time >= buffered.start(i) && time <= buffered.end(i)) {
                return true;
            }
        }
        return false;
    }

    // Shared seek path used by both click-seek and keyboard seek.
    // Handles: invalid targets, buffered fast-path, unbuffered load path.
    async #performSeek(targetTime) {
        const duration = this.video.duration;

        if (!isFinite(duration) || duration <= 0) {
            console.warn("⚠️ Seek ignored — duration not available yet");
            return;
        }

        if (!isFinite(targetTime)) {
            console.warn("⚠️ Seek ignored — invalid target time");
            return;
        }

        // Clamp into valid range
        targetTime = Math.max(0, Math.min(targetTime, duration));

        // Case 1: already buffered — instant seek, no network
        if (this.#isBuffered(targetTime)) {
            this.video.currentTime = targetTime;
            return;
        }

        // Case 2: not buffered — need to load the segment that covers it
        if (!this.segmentLoader || this.segmentLoader.loading) {
            console.log("⏳ Loader busy or not ready, ignoring seek for now");
            return;
        }

        this.#setSeekingUI(true);

        try {
            const targetIndex = this.#findSegmentIndexForTime(targetTime);

            this.segmentLoader.seekTo(targetIndex);

            const loaded = await this.segmentLoader.loadNext();

            if (loaded) {
                // Recompute loadedDuration up through the newly loaded segment
                let total = 0;
                for (let i = 0; i < this.segmentLoader.currentSegment; i++) {
                    total += this.variantPlaylist.segments[i]?.duration || 0;
                }
                this.loadedDuration = total;

                this.video.currentTime = targetTime;
            } else {
                console.error("❌ Seek failed — could not load target segment");
                this.#handleFatalError(
                    new SFPlayerError("Seek failed — could not load target segment", "SEEK_FAILURE")
                );
            }
        } catch (err) {
            // Previously uncaught — a network blip mid-seek would throw
            // out of an async event handler with no user-visible signal.
            console.error("❌ Seek error:", err);
            this.#handleFatalError(
                new SFPlayerError(`Seek failed: ${err.message}`, "SEEK_FAILURE", err)
            );
        } finally {
            this.#setSeekingUI(false);
        }
    }

    async #seek(event) {
        const rect = this.progress.getBoundingClientRect();
        const x = event.clientX - rect.left;

        if (rect.width === 0) {
            console.warn("⚠️ Seek ignored — progress bar has zero width");
            return;
        }

        if (!isFinite(this.video.duration) || this.video.duration <= 0) {
            console.warn("⚠️ Seek ignored — duration not available yet");
            return;
        }

        const percent = Math.max(0, Math.min(x / rect.width, 1));
        const targetTime = percent * this.video.duration;

        try {
            await this.#performSeek(targetTime);
        } catch (err) {
            // Safety net — #performSeek handles its own errors internally,
            // this only fires on something truly unexpected.
            console.error("Unexpected seek error:", err);
        }
    }

    #setSeekingUI(isSeeking) {
        this.classList.toggle("sf-seeking", isSeeking);
    }

    #formatTime(seconds) {
        if (!Number.isFinite(seconds)) {
            return "00:00";
        }

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }

    // ==========================================================
    // Volume
    // ==========================================================

    #toggleMute() {
        this.video.muted = !this.video.muted;
        this.#updateVolumeUI();
    }

    #setVolume(e) {
        const rect = this.volumeSlider.getBoundingClientRect();

        if (rect.width === 0) {
            console.warn("⚠️ Volume change ignored — slider has zero width");
            return;
        }

        let percent = (e.clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));

        this.video.volume = percent;
        this.video.muted = false;

        this.#updateVolumeUI();
    }

    #updateVolumeUI() {
        const volume = this.video.muted ? 0 : this.video.volume;
        this.volumeLevel.style.width = `${volume * 100}%`;
    }

    // ==========================================================
    // Fullscreen
    // ==========================================================

    #toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                const req = this.requestFullscreen();
                if (req && typeof req.catch === "function") {
                    req.catch(err => {
                        console.warn("⚠️ Could not enter fullscreen:", err.message);
                    });
                }
            } else {
                const exit = document.exitFullscreen();
                if (exit && typeof exit.catch === "function") {
                    exit.catch(err => {
                        console.warn("⚠️ Could not exit fullscreen:", err.message);
                    });
                }
            }
        } catch (err) {
            // requestFullscreen/exitFullscreen can throw synchronously
            // (e.g. SecurityError if not triggered by a user gesture).
            console.warn("⚠️ Fullscreen toggle failed:", err.message);
        }
    }

    // ==========================================================
    // Controls Visibility
    // ==========================================================

    #showControls() {
        this.controls.classList.remove("hidden");
    }

    #hideControls() {
        if (!this.video.paused) {
            this.controls.classList.add("hidden");
        }
    }

    #resetControlsTimer() {
        clearTimeout(this.controlsTimeout);

        this.#showControls();

        this.controlsTimeout = setTimeout(() => {
            this.#hideControls();
        }, 2000);
    }

    // ==========================================================
    // Keyboard Controls
    // ==========================================================

    #handleKeyboard(event) {

        const tag = document.activeElement.tagName;

        if (tag === "INPUT" || tag === "TEXTAREA") {
            return;
        }

        switch (event.key) {

            case " ":
                event.preventDefault();
                this.#togglePlay();
                break;

            case "ArrowLeft":
                this.#performSeek(this.video.currentTime - 5).catch(err => {
                    console.error("Unexpected seek error:", err);
                });
                break;

            case "ArrowRight":
                this.#performSeek(this.video.currentTime + 5).catch(err => {
                    console.error("Unexpected seek error:", err);
                });
                break;

            case "ArrowUp":
                event.preventDefault();

                this.video.volume = Math.min(
                    this.video.volume + 0.1,
                    1
                );

                this.#updateVolumeUI();
                break;

            case "ArrowDown":
                event.preventDefault();

                this.video.volume = Math.max(
                    this.video.volume - 0.1,
                    0
                );

                this.#updateVolumeUI();
                break;

            case "m":
            case "M":
                this.#toggleMute();
                break;

            case "f":
            case "F":
                this.#toggleFullscreen();
                break;

        }

    }

}

customElements.define("sf-player", SFPlayer);