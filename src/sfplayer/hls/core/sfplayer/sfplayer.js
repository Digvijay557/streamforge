import { parsePlaylist } from "../../parser/Parser.js";
import Network from "../../network/Network.js";
import { Streamforge } from "../streamforge.js";
import { MediaEngine } from "../../media/mediaengine.js"
import { SegmentLoader } from "../../media/medialoader.js"
import {checkBrowserSupport} from '../../network/checkBrowserSupport.js'
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
        this.internalSeek = false;
        this.currentController = null;
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
        this.masterPlaylist ={};
        this.qualities = []
        this.playbackSpeed = 1;
        this.isBuffering = false;
        // Master playlist may still be generating server-side (tracked via
        // the progress SSE) — give it much more room than the Network
        // default (5s) used for ordinary playlist/segment fetches.
        this.MASTER_PLAYLIST_TIMEOUT = 5 * 60 * 1000;

        // ==========================================================
        // ① Unified playback state — shared between HLS and
        //    StreamForge so #onTimeUpdate / #findSegmentIndexForTime /
        //    #performSeek don't need protocol-specific branches
        // ==========================================================
        this.protocol = null;          // "hls" | "sf"
        this.manifest = null;          // SF manifest, kept for quality switches
        this.currentTimeline = [];     // [{ duration }, ...] for both protocols

    }


    disconnectedCallback() {
        this.network.abortAll();
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

    async #request(url, context, timeoutMs) {
    if (!url) {
        throw new SFPlayerError(
            `Missing URL while requesting ${context}`,
            "NO_SOURCE"
        );
    }

    let response, controller;

    try {
        if (this.currentController) {
            this.network.abort(this.currentController);
        }

       
        
        ({ response, controller } = await this.network.request(url, timeoutMs));

        this.currentController = controller;
    } catch (err) {
        throw new SFPlayerError(
            `Network request failed while requesting ${context}: ${err.message}`,
            "NETWORK_FAILURE",
            err
        );
    }

    if (response && !response.ok) {
        throw new SFPlayerError(
            `Server returned an error (${response.status}) while requesting ${context}`,
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
  #detectNativeHLS(url, timeout = 5000) {
    return new Promise((resolve) => {
        const video = document.createElement("video");

        let finished = false;

        const cleanup = (supported) => {
            if (finished) return;
            finished = true;

            clearTimeout(timer);

            video.pause();
            video.removeAttribute("src");
            video.load();

            video.onloadedmetadata = null;
            video.onerror = null;
            video.oncanplay = null;
            resolve(supported);
        };

        const timer = setTimeout(() => {
            cleanup(false);
        }, timeout);

        video.oncanplay = () => {
            cleanup(true);
        };

        video.onerror = () => {
            cleanup(false);
        };
        console.log(url);
        
        video.src = url;
    });
}
 #playNative(url){
    console.log("PLAYING MOTHER FUCKING NATIVE");
    
    this.video.src = url;
    this.#safePlay()
 }

    async load() {
        this.network.abortAll()
        
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

        //console.log("① Requesting master playlist");
        if (this.progressSource) {
    this.progressSource.close();
    //console.log("PROCESS GENERATION CLOSED");
    
}

const nativeHLS = await this.#detectNativeHLS(
    `${Streamforge.endpoint}/streamforge/test/master.m3u8`)
console.log("oh yeah " + nativeHLS);
let change;
    if(nativeHLS){
        console.log("hmm");
        
       change = `${video}-native` 
    }else{
        change = video;
    }
    console.log("hi:" + change);
    this.progressSource = this.network.progress(video, (progress) => {
            this.generationprogress = progress;
            this.#updateGeneration();
});
    
        const Responce = await this.#request(change, "master playlist", this.MASTER_PLAYLIST_TIMEOUT);
        const contentType = Responce.headers.get("Content-Type")
        console.log(contentType);
        
        console.log("LOAD START");
console.log("Content-Type:", contentType);
console.trace();
        switch (contentType) {
    case "application/vnd.streamforge.manifest+json": {
        console.log("Entered SF case");
        // Bug fix: was previously undefined-referencing `response`/`this.parsed`
        // and passing a quality *object* into playSF instead of its `.id` —
        // both are the reason SF playback never actually started.
        this.protocol = "sf";
        const manifest = await Responce.json();
        this.qualities = manifest.qualities.map((q, i) => ({
            index: i,
            quality: q.id,
            
        }));
        console.log(manifest.qualities.at(-1).id);
        
        this.insertQualities()
        return this.playSF(manifest, manifest.qualities.at(-1).id, false);
    }
    
    case "application/vnd.apple.mpegurl": {
        console.log("Entered HLS case");
        // Bug fix: was `response`/`this.parsed` (both undefined — ReferenceError)
        // and never saved `this.masterPlaylist`, which playHLS() requires.
        this.protocol = "hls";
        const nativeHLS = await this.#detectNativeHLS(
    `${Streamforge.endpoint}/streamforge/stream/${video}/master.m3u8`
    
);
console.log(nativeHLS);
   
        const playlist = await Responce.text();
        const parsed = this.#parsePlaylistSafe(playlist, "master playlist");
        this.masterPlaylist = parsed;
        this.qualities = parsed.qualities.map((q, i) => ({
        index: i,
        quality: q
        }));
        this.insertQualities()
         if(nativeHLS){
        console.log(nativeHLS);
        return this.#playNative(`${Streamforge.endpoint}/streamforge/stream/${video}/master.m3u8`)
    }else{
        return this.playHLS(0, false);
        }
    }
    default:
        console.error("Unsupported:", contentType);
    throw new Error("Unsupported protocol");
    }
    
}

// ==========================================================
// StreamForge playback — mirrors playHLS()'s shape so both
// protocols can share #onTimeUpdate / #findSegmentIndexForTime
    // / #performSeek via this.currentTimeline.
    // ==========================================================
    async playSF(manifest, quality, isLoaded) {

        this.isSwitchingQuality = true;
        this.network.abortAll();

        // ==========================================================
        // ① Save manifest/protocol/quality — playQuality() and the
        //    unified timeline helpers need these on later calls
        // ==========================================================
        this.manifest = manifest;
        this.protocol = "sf";
        this.quality = quality;
        
        // ==========================================================
        // ② Unified timeline (see constructor) — replaces the
        //    HLS-only this.variantPlaylist.segments dependency
        // ==========================================================
        this.currentTimeline = manifest.segments.map(duration => ({ duration }));
        
        const totalDuration = this.currentTimeline.reduce(
            (sum, seg) => sum + seg.duration, 0
        );

        // ==========================================================
        // ③ Initialize Media Engine
        // ==========================================================
        if (!this.media) {
            try {
                if (!isLoaded) this.media = new MediaEngine(this.video);
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
        
        if (typeof this.media.setDuration === "function") {
            await this.media.setDuration(totalDuration);
        }

        // ==========================================================
        // ④ Request & append init segment — every quality has its
        //    own init segment, so this runs on quality switches too
        // ==========================================================
        const initResponse = await this.#request(
            `/streamforge/stream/${manifest.video.name}/${quality}/init.mp4`,
            "init segment"
        );

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

        this.currentController = null;
        
        // ==========================================================
        // ⑤ Set up / reuse Segment Loader — never recreate it on a
        //    quality switch, just hand it the new quality
        // ==========================================================
        console.log("quality" + quality);
        
        try {
            if (!this.segmentLoader) {
                this.segmentLoader = new SegmentLoader(
                    this.network,
                    this.media,
                    (index) => {
                        this.requestedSegmentIndex = index;
                    },
                    "sf",
                    manifest,
                    quality
                );
            } else {
                this.segmentLoader.quality = quality;
            }

            console.log(this.segmentLoader.currentSegment);
            
            console.log("seeknng to current");
            
            this.segmentLoader.seekToSegment(this.segmentLoader.currentSegment);
        } catch (err) {
            throw new SFPlayerError(
                `Failed to initialize segment loader: ${err.message}`,
                "SEGMENT_LOADER_INIT_FAILURE",
                err
            );
        }

        // ==========================================================
        // ⑥ Load first segment — only on initial playback, never on
        //    a quality switch. currentSegment is untouched, so the
        //    next #onTimeUpdate() tick's loadNext() will re-request
        //    that same index, now at the new quality — no extra code.
        // ==========================================================
        if (!isLoaded) {

            this.loadedDuration = 0;

            const firstSegmentDuration = this.currentTimeline[0].duration;
            console.log("loading first elleement");
            

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

            this.#safePlay();
        }
        
        this.dispatchEvent(new CustomEvent("sf-ready", {
            detail: { duration: totalDuration }
        }));
        this.isSwitchingQuality = false;
    }

    // #streamNative(){
    //     this.#safePlay()
    // }
    
    async playHLS(varientIndex, loaded){ 
        const v = document.createElement("video");
        
        console.log(v.canPlayType("application/vnd.apple.mpegurl"));
console.log(v.canPlayType("application/x-mpegURL"));
const nativeHLS = checkBrowserSupport();
console.log(nativeHLS);

if(this.isNative){
    this.#playNative();
}

// if(nativeHLS.supported == true){
        //     this.#streamNative();
        // } else{

            
            this.isSwitchingQuality = true;
        this.network.abortAll()
        
         const variant = this.masterPlaylist.variants?.[varientIndex];

        if (!variant || !variant.uri) {
            throw new SFPlayerError(
                "Master playlist has no playable variants",
                "NO_VARIANTS"
            );
        }

        //console.log("② Requesting variant playlist");
        
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
        this.protocol = "hls";
        
        // Unified timeline (see constructor) — replaces per-protocol
        // reads of this.variantPlaylist.segments everywhere else.
        this.currentTimeline = variantPlaylist.segments;
        
        //console.log(variantPlaylist);
        let totalDuration;
        //console.log(loaded);
        
        
        // ==========================================================
        // Initialize Media Engine
        // ==========================================================
        
        if (!this.media) {
            try {
                if(!loaded)this.media = new MediaEngine(this.video);
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

         totalDuration = variantPlaylist.segments.reduce(
            (sum, seg) => sum + seg.duration, 0
        );
        
        if (typeof this.media.setDuration === "function") {
            await this.media.setDuration(totalDuration);
        } else {
            // console.warn(
            //     "⚠️ MediaEngine has no setDuration() — add one, or video.duration will stay NaN and seeking will break."
            // );
        }
        
        // ==========================================================
        // Request & Append Init Segment
        // ==========================================================
        
        //console.log("③ Requesting init segment");
        
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
        // Set Up Segment Loader — reuse on quality switch, only hand
        // it the new source (this.segmentLoader.setPlaylist() removed:
        // "source" now covers both an HLS playlist and an SF manifest)
        // ==========================================================
        
        //console.log("④ Setting up Segment Loader");
       try {
    if (!this.segmentLoader) {
        this.segmentLoader = new SegmentLoader(
    this.network,
    this.media,
    (index) => {
        this.requestedSegmentIndex = index;
    },
    "hls",
    variantPlaylist
);  
    } else {
        this.segmentLoader.source = variantPlaylist;
    }

    this.segmentLoader.seekToSegment(this.segmentLoader.currentSegment);

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
        
        if(!loaded){
        
        //console.log("⑤ Loading first segment");
        
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
        
        //console.log("⑥ Starting playback");
        
        this.#safePlay();
    }
        
    // ==========================================================
    // Wire Up timeupdate → loadNext()
    // ==========================================================

        this.dispatchEvent(new CustomEvent("sf-ready", {
            detail: { duration: totalDuration }
        }));
        this.isSwitchingQuality = false;
    }

    // ==========================================================
    // Unified quality switch — dispatches to whichever protocol is
    // active. Both playHLS()/playSF() already know not to reload the
    // first segment or restart the media engine when `loaded` is true.
    // ==========================================================
// }
    async playQuality(index) {

        if (this.protocol === "hls") {

            await this.playHLS(index, true);

        } else {

            const quality = this.manifest.qualities[index].id;

            await this.playSF(
                this.manifest,
                quality,
                true
            );

        }

    }
    
    async #onTimeUpdate() {
        if (this.isSwitchingQuality) return;
        this.video.playbackRate = this.playbackSpeed;
        this.PREFECT_BUFFER = 30; // seconds of lead time before loading next segment
        
        let bufferEnd = this.video.currentTime;

for (let i = 0; i < this.video.buffered.length; i++) {
    const start = this.video.buffered.start(i);
    const end = this.video.buffered.end(i);

    if (
        this.video.currentTime >= start &&
        this.video.currentTime <= end
    ) {
        bufferEnd = end;
        break;
    }
}

        this.bufferedAhead = bufferEnd - this.video.currentTime;
            // //console.log({
            //     currentTime: this.video.currentTime,
            //     bufferedAhead: this.bufferedAhead,
            //     bufferTotal: this.video.buffered.length > 0 ? this.video.buffered.end(0) : 0
            // });
            if (this.segmentLoader.loading) return;

           

            if (this.bufferedAhead > this.PREFECT_BUFFER) return;

            const nextIndex = this.segmentLoader.currentSegment;
            const nextSegment = this.currentTimeline[nextIndex];

            if (!nextSegment) return; // playlist ended, nothing left to load

            try {
                const loaded = await this.segmentLoader.loadNext();

                if (loaded) {
                    this.loadedDuration += nextSegment.duration;
                } else {
                    // Loader returned false without throwing — treat as a
                    // recoverable miss, don't kill playback, just log and
                    // let the next timeupdate tick retry.
                    //console.warn(`⚠️ Segment ${nextIndex} failed to load, will retry`);
                }
            } catch (err) {
                // This previously would have been an unhandled promise
                // rejection inside an event listener — the video would
                // just silently stall with nothing in the //console tying
                // it back to a cause.
                //console.error(`❌ Error loading segment ${nextIndex}:`, err);
                this.#handleFatalError(
                    new SFPlayerError(
                        `Playback stalled: failed to load segment ${nextIndex}`,
                        "SEGMENT_LOAD_FAILURE",
                        err
                    )
                );
            }

        };

    init() {
        

        this.render();
        this.video.addEventListener("timeupdate", () => {
            this.#onTimeUpdate();
            this.#updateBuffer();
            this.#updateProgress()

        }); 
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
            //console.log(this.video);
    }

  #renderStyles() {
    return `
    <style>
      :host {
        --sf-accent: #FBBF24;
        --sf-accent-dim: #FBBF2433;
        --sf-accent-glow: #FBBF2455;
        --sf-bg: #0a0a0a;
        --sf-radius: 16px;
        --sf-transition: .2s cubic-bezier(.4,0,.2,1);

        display: block;
        width: 100%;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      * { box-sizing: border-box; }

      .sf-player {
        position: relative;
        width: 100%;
        background: radial-gradient(120% 120% at 50% 0%, #161616 0%, #0a0a0a 70%);
        border-radius: var(--sf-radius);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow:
          0 12px 40px rgba(0,0,0,.5),
          0 0 0 1px rgba(255,255,255,.06);
           aspect-ratio: 16 / 9;
      }

      video {
        display: block;
        width: 100%;
        height: 100%;
        background: #000;
        z-index: 1;
      }

      /* ---------- Controls bar ---------- */

      .sf-controls {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2;

        display: flex;
        flex-direction: column;

        background: linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.4) 65%, transparent);
        color: white;

        opacity: 1;
        transition: opacity .25s ease;
      }

      .sf-controls.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .sf-controls-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px 16px;
      }

      .sf-controls-left,
      .sf-controls-right {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      /* ---------- Progress bar ---------- */

      .sf-progress {
        position: relative;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0);
        cursor: pointer;
        transition: height var(--sf-transition);
        transition: width 1s ease-in;
      }

      .sf-progress:hover { height: 7px; background: rgba(255, 255, 255, 0.45) }

      .sf-progress-buffer {
        position: absolute;
        top: 0; left: 0; height: 100%;
        width: 0%;
        background: rgba(255, 255, 255, 0.7);
        z-index: 1;
        transition: width 1s ease-in;
        border-radius:5px;
      }

.sf-progress-generation {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 0%;

    background: #7C3AED;
    border-radius: 5px;

    z-index: 1;

    opacity: 1;

    transition:
        width 250ms linear,
        opacity 250ms ease;
}

.sf-progress-generation.hidden {
    opacity: 0;
}

      .sf-progress-played {
        position: absolute;
        top: 0; left: 0; height: 100%;
        width: 0%;
        background: var(--sf-accent);
        box-shadow: 0 0 8px var(--sf-accent-glow);
        z-index: 2;
      }

      .sf-progress-thumb {
        position: absolute;
        top: 50%; left: 0%;
        width: 13px; height: 13px;
        border-radius: 50%;
        background: var(--sf-accent);
        box-shadow: 0 0 0 5px var(--sf-accent-dim), 0 0 10px var(--sf-accent-glow);
        transform: translate(-50%, -50%) scale(0);
        transition: transform var(--sf-transition);
        z-index: 3;
        pointer-events: none;
      }

      .sf-progress:hover .sf-progress-thumb {
        transform: translate(-50%, -50%) scale(1);
      }

      /* ---------- Buttons ---------- */

      button {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px;
        border-radius: 8px;
        opacity: .9;
        transition: opacity var(--sf-transition), background var(--sf-transition), transform var(--sf-transition);
      }

      button:hover:not(:disabled) {
        opacity: 1;
        background: rgba(255,255,255,.1);
        transform: scale(1.08);
      }

      button:active:not(:disabled) { transform: scale(.92); }

      button:focus-visible {
        outline: 2px solid var(--sf-accent);
        outline-offset: 2px;
      }

      button:disabled { opacity: .4; cursor: not-allowed; }

      .sf-time {
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        opacity: .85;
        letter-spacing: .2px;
      }

      /* ---------- Volume ---------- */

      .sf-volume {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sf-volume-slider {
        width: 80px;
        height: 4px;
        background: rgba(255,255,255,.2);
        border-radius: 999px;
        cursor: pointer;
        overflow: hidden;
      }

      .sf-volume-level {
        width: 100%;
        height: 100%;
        background: var(--sf-accent);
        box-shadow: 0 0 6px var(--sf-accent-glow);
        border-radius: 999px;
      }

      /* ---------- Error banner ---------- */

      .sf-error {
        position: absolute;
        top: 0; left: 0; right: 0;
        z-index: 5;

        padding: 10px 14px;
        background: rgba(185, 28, 28, .85);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        color: white;
        font-size: 13px;
        line-height: 1.4;
        border-bottom: 1px solid rgba(255,255,255,.15);
      }

      .sf-error.hidden { display: none; }

      /* ---------- Settings menu (the pop) ---------- */

      .settings {
        position: absolute;
        bottom: 60px;
        right: 12px;
        z-index: 4;

        width: 200px;
        background: rgba(24, 24, 24, 0);
    

        display: flex;
        // flex-direction: column;
        gap:10px;

        opacity: 0;
        visibility: hidden;
        transform: translateY(8px) scale(.97);
        transform-origin: bottom right;
        transition: opacity .2s ease, transform .2s cubic-bezier(.34,1.56,.64,1), visibility .2s ease;
      }
        
        .speedMenu{
        background: rgba(24, 24, 24, 0);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 10px;
        box-shadow:
          0 16px 40px rgba(0,0,0,.55),
          0 0 0 1px rgba(255,255,255,.04) inset;
        }

      .settings.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
      }

      .settings-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .08em;
        color: rgba(255,255,255,.45);
        padding: 4px 8px 8px;
      }

   .qualities {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(24, 24, 24, 0);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 10px;
        box-shadow:
          0 16px 40px rgba(0,0,0,.55),
          0 0 0 1px rgba(255,255,255,.04) inset;

    opacity: 0;
    visibility: hidden;
    pointer-events: none;

   transform: translateY(8px) scale(.97);
transform-origin: left;

transition:
    opacity .2s ease,
    transform .2s cubic-bezier(.34,1.56,.64,1),
    visibility .2s ease;
}



      .quality {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 13px;
        color: rgba(255,255,255,.8);
        transition: background var(--sf-transition), color var(--sf-transition);
      }
        .speed{
        display: flex;
    flex-direction: column;
    gap: 2px;

    opacity: 0;
    visibility: hidden;
    pointer-events: none;

    transition: opacity .2s ease;
        }
   
    

      .quality:hover {
        background: rgba(255,255,255,.08);
        color: white;
      }

      .quality.active {
        color: var(--sf-accent);
        background: var(--sf-accent-dim);
        font-weight: 600;
      }

      .quality.active::after {
        content: "●";
        font-size: 8px;
        color: var(--sf-accent);
        text-shadow: 0 0 6px var(--sf-accent-glow);
      }
    .sf-quality-btn{
            cursor:pointer
        }
.sub-controlsM {
    display: none;
}

.sub-controlsM.show {
    display: flex;
    flex-direction: column;
    gap: 2px;
    

    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}
    .controls{
    background: rgba(24, 24, 24, 0);
        backdrop-filter: blur(16px) saturate(160%);
        -webkit-backdrop-filter: blur(16px) saturate(160%);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 12px;
        padding: 10px;
        box-shadow:
          0 16px 40px rgba(0,0,0,.55),
          0 0 0 1px rgba(255,255,255,.04) inset;}

    .sf-buffer{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999; /* sit above everything */
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 160px;
    padding: 12px 18px;
    gap: 8px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    font-weight: 600;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.02) inset;
    backdrop-filter: blur(6px) saturate(140%);
    -webkit-backdrop-filter: blur(6px) saturate(140%);
    pointer-events: none; /* don't block clicks when visible indicator only */
    }
    .sf-retry{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999; /* sit above everything */
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 160px;
    padding: 12px 18px;
    gap: 8px;
    background: rgba(0,0,0,0.7);
    color: #fff;
    font-weight: 600;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.02) inset;
    backdrop-filter: blur(6px) saturate(140%);
    -webkit-backdrop-filter: blur(6px) saturate(140%);
    cursor:pointer;
    }
    .sf-retry:hover{
    border: 1px solid white;
    }

    .sf-retry.hidden {
        pointer-events: auto;
        opacity: 0;
        visibility: hidden;
    }
    .sf-buffer.hidden {
        pointer-events: auto;
        opacity: 0;
        visibility: hidden;
    }
    .sf-G-progress {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: calc(100% - 24px);
        min-width: 140px;
        padding: 8px 12px;
        background: rgba(0,0,0,0.72);
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.3;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 999px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        backdrop-filter: blur(8px) saturate(140%);
        -webkit-backdrop-filter: blur(8px) saturate(140%);
        pointer-events: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .sf-G-progress.hidden {
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
    }

   
    </style>
    `;
}

   #renderHTML() {
        return `
            <div class="sf-player">

    <div class="sf-error hidden"></div>

    <video></video>

    <div class="sf-buffer hidden">
        Loading...
    </div>
    <div class="sf-G-progress hidden">
        
    </div>



    <div class="sf-retry hidden">
        Retry
    </div>

    <div class="sf-controls">

        <div class="sf-progress">
            <div class="sf-progress-generation"></div>
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
                <div class="sf-settings-wrap">
                    <button class="sf-settings-btn">⚙</button>

                    <div class="settings">
                        <div class="controls">
                            <button class="sf-quality-btn c" data-rmenu = "qualities">♾️ Quality</button>
                            <button class="sf-speed-btn c" data-rmenu = "speedMenu">🚅 Speed</button>
                            // <button class="sf-pip-btn c" data-rmenu = "pipmenu">🥕 Pic-in-Pic (PiP)</button>
                        </div>
                        <div class="sub-controls">
                            <div class="qualities sub-controlsM">
                                <div class="quality"></div>
                            </div>
                            <div class="speedMenu sub-controlsM" >
                                <div class="speedx" data-speed = "2">2x</div>
                                <div class="speedx" data-speed = "1.75">1.75x</div>
                                <div class="speedx" data-speed = "1.5">1.5x</div>
                                <div class="speedx" data-speed = "1.25">1.25x</div>
                                <div class="speedx" data-speed = "1">1x</div>
                                <div class="speedx" data-speed = "0.75">0.75x</div>
                                <div class="speedx" data-speed = "0.5">0.5x</div>
                                <div class="speedx" data-speed = "0.25">0.25x</div>
                            </div>
                        </div>
                    </div>
                
                </div>

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
        this.progressGeneration = this.root.querySelector(".sf-progress-generation");
        this.progressThumb = this.root.querySelector(".sf-progress-thumb");

        this.controlsBottom = this.root.querySelector(".sf-controls-bottom");
        this.controlsButtons = this.root.querySelectorAll(".c");
        this.Gprogess = this.root.querySelector(".sf-G-progress");
        this.controlsLeft = this.root.querySelector(".sf-controls-left");
        this.controlsRight = this.root.querySelector(".sf-controls-right");
        this.retryy = this.root.querySelector(".sf-retry");
        // Bug fix: #showBuffer()/#hideBuffer() referenced this.bufferLoding,
        // which was never cached — first "waiting" event would throw.
        this.bufferLoding = this.root.querySelector(".sf-buffer");
        this.playBtn = this.root.querySelector(".sf-play-btn");
        this.time = this.root.querySelector(".sf-time");
        this.speedMenu = this.root.querySelector(".speed")
        this.volumeBtn = this.root.querySelector(".sf-volume-btn");
        this.settingsBtn = this.root.querySelector(".sf-settings-btn");
        this.settingsmenu = this.root.querySelector(".settings");
        this.subControlMenus = this.root.querySelectorAll(".sub-controlsM");
        this.qualitybtn = this.root.querySelector(".sf-quality-btn");
        this.qualitiescont = this.root.querySelector(".qualities");
        this.quality = this.root.querySelector(".quality");
        this.fullscreenBtn = this.root.querySelector(".sf-fullscreen-btn");
        
        this.volume = this.root.querySelector(".sf-volume");
        /** @type {HTMLDivElement} */
        this.volumeSlider = this.root.querySelector(".sf-volume-slider");
        this.volumeLevel = this.root.querySelector(".sf-volume-level");
        this.Gprogess = this.root.querySelector(".sf-G-progress");
        this.speeds = this.root.querySelectorAll(".speedx")
        this.pip = this.root.querySelector('.sf-pip-btn');
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
            //console.warn("⚠️ <sf-player> mounted without a 'video' attribute — load() will fail until one is set.");
        }
    }

    // ==========================================================
    // Error UI
    // ==========================================================

    #handleFatalError(error) {
        const sfError = error instanceof SFPlayerError
            ? error
            : new SFPlayerError(error?.message || "Unknown player error", "UNKNOWN", error);

        //console.error(`[SFPlayer] ${sfError.code}: ${sfError.message}`, sfError.cause || "");

        this.#showError(sfError.message);

        this.dispatchEvent(new CustomEvent("sf-error", {
            detail: { code: sfError.code, message: sfError.message, cause: sfError.cause }
        }));
    }

    #showError(message) {
        
        if (!this.errorBanner) return;
        this.errorBanner.textContent = message;
        this.errorBanner.classList.remove("hidden");
        this.retryy.classList.remove("hidden");
    }
    async #retry(){
        this.#clearError();

            this.segmentLoader = null;
            this.media = null;

            if (this.progressSource) {
                this.progressSource.close();
                this.progressSource = null;
            }


     try {
        this.playBtn.disabled = true;
        this.retryy.disabled = true;
                    await this.load();
                    this.loaded = true;
                } catch (error) {
                    //console.error(error);
                    this.#handleFatalError(error);
                    return;
                } finally {
                    this.playBtn.disabled = false;
                    this.retryy.disabled = false;
                }
    }
    
    #clearError() {
        if (!this.errorBanner) return;
        this.errorBanner.textContent = "";
        this.errorBanner.classList.add("hidden");
        this.retryy.classList.add("hidden");
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
                    //console.error(error);
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
        this.controlsButtons.forEach(controlBtn => {
    controlBtn.addEventListener("click", () => {
        //console.log("clicked");
        
            const menu = this.root.querySelector(
            `.${controlBtn.dataset.rmenu}`
        );

        const isOpen = menu.classList.contains("show");

        this.subControlMenus.forEach(m => {
            m.classList.remove("show");
        });

        if (!isOpen) {
            menu.classList.add("show");
        }
    });
       })
       

        this.video.addEventListener("play", () => {
            this.playBtn.textContent = "⏸";
            this.#resetControlsTimer();
            this.#hideBuffer();
        });
        this.video.addEventListener("playing", () => {
            this.isBuffering = false;
            this.#hideBuffer();
            this.Gprogess.classList.add("hidden")
        });
        this.video.addEventListener("waiting", () => {
            this.isBuffering = true;
            this.#showBuffer();
        });

        this.video.addEventListener("pause", () => {
            this.playBtn.textContent = "▶";
            this.#showControls();
            this.#hideBuffer();
        });

        

       this.retryy.addEventListener("click", async () => {
            this.#retry();
});
        

        this.video.addEventListener("loadedmetadata", () => {
            this.#updateProgress();
        });


        this.video.addEventListener("loadedmetadata", () => {
            const ratio = `${this.video.videoWidth} / ${this.video.videoHeight}`;

                this.player.style.setProperty(
                "aspect-ratio",
                ratio,
                "important"
            );
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
       
        this.speeds.forEach(speed => {
    speed.addEventListener("click", () => {
        this.playbackSpeed = Number(speed.dataset.speed);
        this.video.playbackRate = this.playbackSpeed;
    });
});
        this.progress.addEventListener("click", (event) => {
            this.#seek(event);
            this.#updateBuffer()
            //console.log(this.playbackSpeed);
            //console.log(this.video.playbackRate);
        });

        this.fullscreenBtn.addEventListener("click", () => {
            this.#toggleFullscreen();
        });

        this.player.addEventListener("mousemove", () => {
            this.#resetControlsTimer();
        });

        this.quality.addEventListener("click",()=>{
            alert("uwu");
           
        })
        this.pip.addEventListener("click", () => this.#picinpic());
        this.settingsBtn.addEventListener("click", () => {
             this.subControlMenus.forEach(menu => {
        menu.classList.remove("show");
    });
            this.settingsmenu.classList.toggle("show")
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
    // unhandled promise rejection into the //console.
    #safePlay() {
        let playPromise;

        try {
            this.video.playbackRate = this.playbackSpeed;
    
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
                    //console.error("Playback error:", err);
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
        this.progressThumb.style.left = `${percent}%`;

        this.time.textContent =
            `${this.#formatTime(current)} / ${this.#formatTime(duration)}`;
    }
#updateBuffer() {
    const duration = this.video.duration;
    //console.log("Current segment:", this.segmentLoader.currentSegment);

    if (!Number.isFinite(duration) || duration <= 0) {
        this.progressBuffer.style.width = "0%";
        return;
    }

    let bufferEnd = 0;

    for (let i = 0; i < this.video.buffered.length; i++) {
        const start = this.video.buffered.start(i);
        const end = this.video.buffered.end(i);

        if (
            this.video.currentTime >= start &&
            this.video.currentTime <= end
        ) {
            bufferEnd = end;
            break;
        }
    }

    const percent = (bufferEnd / duration) * 100;

    this.progressBuffer.style.width = `${percent}%`;

    // Debug buffer state.
    // console.log({
    //     currentTime: this.video.currentTime,
    //     bufferEnd,
    //     percent,
    //     ranges: this.video.buffered.length
    // });
}

#showBuffer() {
    if (!this.bufferLoding.classList.contains("hidden")) {
        return;
    }
    this.bufferLoding.classList.remove("hidden");
}

#hideBuffer() {
    if (!this.bufferLoding.classList.contains("hidden")) {
        this.bufferLoding.classList.add("hidden");
    }
}

#updateGeneration() {
    if (!this.generationprogress) return;

    const percent = this.generationprogress.percent;
    this.Gprogess.classList.remove("hidden");

    this.progressGeneration.classList.remove("hidden");
    this.progressGeneration.style.width = `${percent}%`;
    this.Gprogess.innerHTML = `${this.generationprogress.stage} \n ${this.generationprogress.quality?this.generationprogress.quality:0}p`;


    if (percent >= 100) {
        setTimeout(() => {
            this.progressGeneration.classList.add("hidden");
            // Bug fix: was `this.Gprocess` (typo) — threw once generation
            // hit 100%, since that property never existed.
            this.Gprogess.classList.add("hidden");
            this.progressGeneration.style.width = "0%";

            if (this.progressSource) {
                this.progressSource.close();
                this.progressSource = null;
                
                
                //console.log("PROCESS GENERATION CLOSED");
            }
        }, 500);
    }
}

    #findSegmentIndexForTime(time) {
        if (!this.currentTimeline || !this.currentTimeline.length) {
            return 0;
        }

        let elapsed = 0;
        const segments = this.currentTimeline;

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
            //console.warn("⚠️ Seek ignored — duration not available yet");
            return;
        }

        if (!isFinite(targetTime)) {
            //console.warn("⚠️ Seek ignored — invalid target time");
            return;
        }

        // Clamp into valid range
        targetTime = Math.max(0, Math.min(targetTime, duration));

        // Case 1: already buffered — instant seek, no network
        if (this.#isBuffered(targetTime)) {
            this.internalSeek = true;
            this.video.currentTime = targetTime;
            return;
        }

        // Case 2: not buffered — need to load the segment that covers it
        if (!this.segmentLoader || this.segmentLoader.loading) {
            //console.log("⏳ Loader busy or not ready, ignoring seek for now");
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
                    total += this.currentTimeline[i]?.duration || 0;
                }
                this.loadedDuration = total;
                this.internalSeek = true;
                this.video.currentTime = targetTime;
            } else {
                //console.error("❌ Seek failed — could not load target segment");
                this.#handleFatalError(
                    new SFPlayerError("Seek failed — could not load target segment", "SEEK_FAILURE")
                );
            }
        } catch (err) {

            //console.error("❌ Seek error:", err);
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
            //console.warn("⚠️ Seek ignored — progress bar has zero width");
            return;
        }

        if (!isFinite(this.video.duration) || this.video.duration <= 0) {
            //console.warn("⚠️ Seek ignored — duration not available yet");
            return;
        }

        const percent = Math.max(0, Math.min(x / rect.width, 1));

        const targetTime = percent * this.video.duration;
const targetIndex = this.#findSegmentIndexForTime(targetTime);

if (targetIndex !== this.requestedSegmentIndex) {
    this.network.abort(this.currentController);
}

        try {
            await this.#performSeek(targetTime);
        } catch (err) {
            // Safety net — #performSeek handles its own errors internally,
            // this only fires on something truly unexpected.
            //console.error("Unexpected seek error:", err);
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
            //console.warn("⚠️ Volume change ignored — slider has zero width");
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
                        //console.warn("⚠️ Could not enter fullscreen:", err.message);
                    });
                }
            } else {
                const exit = document.exitFullscreen();
                if (exit && typeof exit.catch === "function") {
                    exit.catch(err => {
                        //console.warn("⚠️ Could not exit fullscreen:", err.message);
                    });
                }
            }
        } catch (err) {
            // requestFullscreen/exitFullscreen can throw synchronously
            // (e.g. SecurityError if not triggered by a user gesture).
            //console.warn("⚠️ Fullscreen toggle failed:", err.message);
        }
    }
     // ==========================================================
    // Pic-in pic
    // ==========================================================
    async #picinpic(){
        if(!document.pictureInPictureEnabled){
            //console.warn("Picture-in-Picture is not supported.");
            return;
        }
        if (!document.pictureInPictureEnabled) {
                this.pipButton.disabled = true;
            }

        try{
            if(document.pictureInPictureElement){
                await document.exitPictureInPicture();
            }else{
                await this.video.requestPictureInPicture();
            }
        }catch{
            //console.error("Failed to toggle Picture-in-Picture:", err);
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

    insertQualities() {
        //console.log(this.qualitiescont);
        //console.log(this.qualities);
        this.qualitiescont.innerHTML = this.qualities
            .map(chunk => `<div class="quality" data-index="${chunk.index}">${chunk.quality}p</div>`)
            .join("");

        const qualities = this.root.querySelectorAll(".quality");
    qualities.forEach(q => {
    q.addEventListener("click", () => {
        this.playQuality(Number(q.dataset.index));
        
        //console.log("uwu");
            });
})
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
                    //console.error("Unexpected seek error:", err);
                });
                break;

            case "ArrowRight":
                this.#performSeek(this.video.currentTime + 5).catch(err => {
                    //console.error("Unexpected seek error:", err);
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