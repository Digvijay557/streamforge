import { parsePlaylist } from "../../parser/Parser.js";
import Network from "../../network/Network.js";
import { Streamforge } from "../streamforge.js";
import { MediaEngine } from "../../media/mediaengine.js"
import { SegmentLoader } from "../../media/medialoader.js"
import renderStyles from '../css/renderStyles.js'
import renderHTML from '../HTML/renderHTML.js'
import cacheElements from "../cacheElements/cacheElements.js";
import bindEvents from "../bindEvents/bindEvents.js";
import { insertQualities, safePlay,updateGeneration, updateBuffer, updateProgress,updateVolumeUI } from "../controlFunctions/controlFunctions.js";
import { SFPlayerError, SFPlayerErrorHandler } from "../Errorhandling/SFPlayerError.js";

class SFPlayer extends HTMLElement {

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
        this.MASTER_PLAYLIST_TIMEOUT = 5 * 60 * 1000;
        this.errorHandler = new SFPlayerErrorHandler(this);

        this.protocol = null;         
        this.manifest = null;        
        this.currentTimeline = [];
    }
    emit(event, detail = {}) {
        this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
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


    async #request(url, context, timeoutMs) {
    if (!url) {
        throw this.errorHandler.handleFatalError( new SFPlayerError(
            `Missing URL while requesting ${context}`,
            "NO_SOURCE"
        ));
    }

    let response, controller;

    try {
        if (this.currentController) {
            this.network.abort(this.currentController);
        }

       
        
        ({ response, controller } = await this.network.request(url, timeoutMs));

        this.currentController = controller;
    } catch (err) {
        throw this.errorHandler.handleFatalError( new SFPlayerError(
            `Network request failed while requesting ${context}: ${err.message}`,
            "NETWORK_FAILURE",
            err
        ));
    }

    if (response && !response.ok) {
        throw this.errorHandler.handleFatalError( new SFPlayerError(
            `Server returned an error (${response.status}) while requesting ${context}`,
            "HTTP_ERROR"
        ));
    }

    return response;
}

    #parsePlaylistSafe(text, context) {
        try {
            return parsePlaylist(text);
        } catch (err) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to parse ${context}: ${err.message}`,
                "PARSE_FAILURE",
                err
            ));
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

        video.src = url;
    });
}
 #playNative(url){
    this.video.src = url;
    safePlay(this)
 }

    async load() {
        this.network.abortAll()
        
        // ==========================================================
        // Get Video Source
        // ==========================================================
        
        const video = this.getAttribute("video");
        
        
        if (!video) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                "No 'video' attribute set on <sf-player>",
                "NO_SOURCE"
            ));
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
let change;
    if(nativeHLS){
        this.emit("backendchange", {backend: "Native"})
        change = `${video}-native` 
    }else{
        change = video;
        this.emit("backendchange", {backend: "Streamforge"})
    }
    this.progressSource = this.network.progress(video, (progress) => {
        console.log("🔥 progress callback:", progress);
        console.log("ahaaaaaa");
        
            this.generationprogress = progress;
             console.log("🔥 progressGeneration:", this.progressGeneration);
    console.log("🔥 Gprogess:", this.Gprogess);
            updateGeneration(this);
});
    
        const Responce = await this.#request(change, "master playlist", this.MASTER_PLAYLIST_TIMEOUT);
        const contentType = Responce.headers.get("Content-Type")
        switch (contentType) {
    case "application/vnd.streamforge.manifest+json": {
        // Bug fix: was previously undefined-referencing `response`/`this.parsed`
        // and passing a quality *object* into playSF instead of its `.id` —
        // both are the reason SF playback never actually started.
        this.protocol = "sf";
        const manifest = await Responce.json();
        this.qualities = manifest.qualities.map((q, i) => ({
            index: i,
            quality: q.id,
            
        }));
        
        insertQualities(this);
        this.manifest = manifest;
        return this.playQuality(0, false);
    }
    
    case "application/vnd.apple.mpegurl": {
        // Bug fix: was `response`/`this.parsed` (both undefined — ReferenceError)
        // and never saved `this.masterPlaylist`, which playHLS() requires.
        this.protocol = "hls";
        const nativeHLS = await this.#detectNativeHLS(
    `${Streamforge.endpoint}/streamforge/stream/${video}/master.m3u8`
);
        const playlist = await Responce.text();
        const parsed = this.#parsePlaylistSafe(playlist, "master playlist");
        this.masterPlaylist = parsed;
        this.qualities = parsed.qualities.map((q, i) => ({
        index: i,
        quality: q
        }));
        insertQualities(this);
         if(nativeHLS){
        return this.#playNative(`${Streamforge.endpoint}/streamforge/stream/${video}/master.m3u8`)
    }else{
        return this.playQuality(0, false);
        }
    }
    default:
        console.error("Unsupported:", contentType);
    throw this.errorHandler.handleFatalError( new Error("Unsupported protocol"));
    }
    
}

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
                throw this.errorHandler.handleFatalError( new SFPlayerError(
                    `Failed to initialize media engine: ${err.message}`,
                    "MEDIA_INIT_FAILURE",
                    err
                ));
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
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to append init segment: ${err.message}`,
                "INIT_SEGMENT_FAILURE",
                err
            ));
        }

        this.currentController = null;
        
        // ==========================================================
        // ⑤ Set up / reuse Segment Loader — never recreate it on a
        //    quality switch, just hand it the new quality
        // ==========================================================
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

            this.segmentLoader.seekToSegment(this.segmentLoader.currentSegment);
        } catch (err) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to initialize segment loader: ${err.message}`,
                "SEGMENT_LOADER_INIT_FAILURE",
                err
            ));
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

            let firstLoaded;
            try {
                firstLoaded = await this.segmentLoader.loadNext();
            } catch (err) {
                throw this.errorHandler.handleFatalError( new SFPlayerError(
                    `Failed to load first segment: ${err.message}`,
                    "SEGMENT_LOAD_FAILURE",
                    err
                ));
            }

            if (firstLoaded) {
                this.loadedDuration += firstSegmentDuration;
            } else {
                throw this.errorHandler.handleFatalError( new SFPlayerError(
                    "First segment failed to load",
                    "SEGMENT_LOAD_FAILURE"
                ));
            }

            safePlay(this);
            this.emit("qualitychange", this.qualities.find(q => q.quality === quality));
        }
        
    if (!isLoaded) {
    this.emit("ready", {
        duration: totalDuration,
        qualities: this.qualities,
        protocol: this.protocol
    });
}
        this.isSwitchingQuality = false;
    }
    
    async playHLS(varientIndex, loaded){ 
        
        this.isSwitchingQuality = true;
        this.network.abortAll()
        
         const variant = this.masterPlaylist.variants?.[varientIndex];

        if (!variant || !variant.uri) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                "Master playlist has no playable variants",
                "NO_VARIANTS"
            ));
        }

        //console.log("② Requesting variant playlist");
        
        const variantResponse = await this.#request(variant.uri, "variant playlist");
        const variantText = await variantResponse.text();
        const variantPlaylist = this.#parsePlaylistSafe(variantText, "variant playlist");
        
        if (!variantPlaylist.segments || variantPlaylist.segments.length === 0) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                "Variant playlist has no segments",
                "NO_SEGMENTS"
            ));
        }
        
        this.variantPlaylist = variantPlaylist;
        this.protocol = "hls";

        this.currentTimeline = variantPlaylist.segments;
        
        
        let totalDuration;
      
        
        
        // ==========================================================
        // Initialize Media Engine
        // ==========================================================
        
        if (!this.media) {
            try {
                if(!loaded)this.media = new MediaEngine(this.video);
                await this.media.ready();
            } catch (err) {
                this.media = null;
                throw this.errorHandler.handleFatalError( new SFPlayerError(
                    `Failed to initialize media engine: ${err.message}`,
                    "MEDIA_INIT_FAILURE",
                    err
                ));
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
        } 
        
        // ==========================================================
        // Request & Append Init Segment
        // ==========================================================
        
        //console.log("③ Requesting init segment");
        
        if (!variantPlaylist.initSegment) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                "Variant playlist has no init segment",
                "NO_INIT_SEGMENT"
            ));
        }
        
        const initResponse = await this.#request(variantPlaylist.initSegment, "init segment");

        let initBytes;
        try {
            initBytes = await initResponse.arrayBuffer();
            await this.media.append(initBytes);
        } catch (err) {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to append init segment: ${err.message}`,
                "INIT_SEGMENT_FAILURE",
                err
            ));
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
    throw this.errorHandler.handleFatalError( new SFPlayerError(
        `Failed to initialize segment loader: ${err.message}`,
        "SEGMENT_LOADER_INIT_FAILURE",
        err
    ));
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
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to load first segment: ${err.message}`,
                "SEGMENT_LOAD_FAILURE",
                 err
            ));
        }
        
        if (firstLoaded) {
            this.loadedDuration += firstSegmentDuration;
        } else {
            throw this.errorHandler.handleFatalError( new SFPlayerError(
                "First segment failed to load",
                "SEGMENT_LOAD_FAILURE"
            ));
        }
        
        // ==========================================================
        // Start Playback
        // ==========================================================
        
        //console.log("⑥ Starting playback");
        
        safePlay(this);
        this.emit("qualitychange", this.qualities[varientIndex]);
    }
        
    // ==========================================================
    // Wire Up timeupdate → loadNext()
    // ==========================================================
if(!loaded){
    this.emit("ready", {
        duration: totalDuration,
        qualities: this.qualities,
        protocol: this.protocol
    });
}
    this.isSwitchingQuality = false;
    }


getQuality(qualtiy){
    return this.qualities.find(q => q.index === qualtiy);
}

setQuality(quality) {
    const index = this.qualities.findIndex(q => q.index === quality);
    if (index !== -1) {
        this.currentQualityIndex = index;
    }
    // Bug fix: was a bare `playQuality(index)` call — playQuality only
    // exists as a method on this class, so this threw ReferenceError
    // every time setQuality() was used (e.g. from an external caller).
    this.playQuality(index);
}
getAvailableQualities(){
    return this.qualities.map(q => q.index);
}

    async playQuality(index,status) {

        if (this.protocol === "hls") {

            await this.playHLS(index, status);
            

        } else {

            const quality = this.manifest.qualities[index].id;

            await this.playSF(
                this.manifest,
                quality,
                status
            );

        }

}
    
    async #onTimeUpdate() {
        if (this.isSwitchingQuality) return;
        if (!this.segmentLoader) return;
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
console.log("bufferAhead: " + this.bufferedAhead);

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
          
                this.emit("timeupdate",{
                    currentTime: this.video.currentTime,
                    buffered: this.video.buffered,
                  })}
            } catch (err) {
 
                this.errorHandler.handleFatalError(
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
            updateBuffer(this);
            updateProgress(this)

        }); 
    }

    render() {
        this.root.innerHTML = `
            ${renderStyles()}
            ${renderHTML()}
            `;
            
            
            cacheElements.call(this);
            
            this.#initializeAttributes();
            bindEvents.call(this, this.errorHandler);
    }



    #initializeAttributes() {
        this.#initializeSource();
        updateVolumeUI(this);
    }

    #initializeSource() {
        const video = this.getAttribute("video");

        if (!video) {
            console.warn("⚠️ <sf-player> mounted without a 'video' attribute — load() will fail until one is set.");
        }
    }



}
customElements.define("sf-player", SFPlayer);