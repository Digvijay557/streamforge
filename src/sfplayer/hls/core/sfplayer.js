import { parsePlaylist } from "../parser/Parser.js";
import Network from "../network/Network.js";
import { Streamforge } from "./streamforge.js";
import { MediaEngine } from "../media/mediaengine.js"
import { SegmentLoader } from "../loader/medialoader.js"

class SFPlayer extends HTMLElement {

    // ==========================================================
    // Lifecycle
    // ==========================================================

    constructor() {
        super();
        this.controlsTimeout = null;
        this.loaded = false;
        this.network = new Network();
        this.init();
    }

    async load() {

        // ==========================================================
        // Get Video Source
        // ==========================================================

        const video = this.getAttribute("video");//gets what inside <sf-player video = "demo.mp4" />

        // ==========================================================
        // Request Master Playlist
        // ==========================================================

        console.log("① Requesting master playlist");

        const masterResponse =
            await this.network.request(video);//runs backend(ffmpeg, hls generation) and return master.m3u8 as responce  

        const masterPlaylist =
            parsePlaylist(await masterResponse.text());//parses string into a json 
//             export class MasterPlaylist {
//     constructor() {
//         this.version = null;
//         this.variants = [];
//     }
// }

        console.log(masterPlaylist);

        // ==========================================================
        // Request Variant Playlist
        // ==========================================================

        console.log("② Requesting variant playlist");

        const variant =
            masterPlaylist.variants[0];//selects the first quality 

        const variantResponse =
            await this.network.request(variant.uri); // fetches index.m3u8

        const variantPlaylist =
            parsePlaylist(await variantResponse.text());

        this.variantPlaylist = variantPlaylist;

        console.log(variantPlaylist);

        // ==========================================================
        // Initialize Media Engine
        // ==========================================================

        if (!this.media) {
            this.media = new MediaEngine(this.video);//develops a new kitchen to cook the binary data into a video
            await this.media.ready();
        }

        // ==========================================================
        // Set Total Duration on MediaSource
        // ==========================================================
        // MediaSource does not infer duration from appended segments —
        // it must be told explicitly, or video.duration stays NaN forever
        // and any seek math (percent * duration) will crash.

        const totalDuration = variantPlaylist.segments.reduce(
            (sum, seg) => sum + seg.duration, 0
        );//gets total duration

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

        const initResponse =
            await this.network.request(
                variantPlaylist.initSegment
            );//request first element from backend 

        const initBytes =
            await initResponse.arrayBuffer();

        await this.media.append(initBytes);

        // ==========================================================
        // Set Up Segment Loader
        // ==========================================================

        console.log("④ Setting up Segment Loader");

        this.segmentLoader =
            new SegmentLoader(
                this.network,
                this.media
            );//creates a segment loader with network and media of this video

        this.segmentLoader.setPlaylist(variantPlaylist);

        // ==========================================================
        // Load First Segment
        // ==========================================================

        console.log("⑤ Loading first segment");

        this.loadedDuration = 0;

        const firstSegmentDuration =
            variantPlaylist.segments[0].duration;

        const firstLoaded =
            await this.segmentLoader.loadNext();

        if (firstLoaded) {
            this.loadedDuration += firstSegmentDuration;
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

            const loaded = await this.segmentLoader.loadNext();

            if (loaded) {
                this.loadedDuration += nextSegment.duration;
            }

        };

        this.video.addEventListener("timeupdate", this._onTimeUpdate);

    }

    init() {
        this.attachShadow({ mode: "open" });
        this.root = this.shadowRoot;

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
        </style>
    `;
    }

    #renderHTML() {
        return `
            <div class="sf-player">

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
        }
    }

    // ==========================================================
    // Event Binding
    // ==========================================================

    #bindEvents() {

        this.playBtn.addEventListener("click", async () => {

            if (!this.loaded) {
                try {
                    await this.load();
                    this.loaded = true;
                } catch (error) {
                    console.error(error);
                    return;
                }
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

        document.addEventListener("keydown", (event) => {
            this.#handleKeyboard(event);
        });

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
        const playPromise = this.video.play();

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(err => {
                if (err.name !== "AbortError") {
                    console.error("Playback error:", err);
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

        const percent = duration ? (current / duration) * 100 : 0;
        this.progressPlayed.style.width = `${percent}%`;

        this.time.textContent =
            `${this.#formatTime(current)} / ${this.#formatTime(duration)}`;
    }

    #findSegmentIndexForTime(time) {
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
            }
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

        const percent = Math.max(0, Math.min(x / rect.width, 1));
        const targetTime = percent * this.video.duration;

        await this.#performSeek(targetTime);
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
        if (!document.fullscreenElement) {
            this.requestFullscreen();
        } else {
            document.exitFullscreen();
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
                this.#performSeek(this.video.currentTime - 5);
                break;

            case "ArrowRight":
                this.#performSeek(this.video.currentTime + 5);
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