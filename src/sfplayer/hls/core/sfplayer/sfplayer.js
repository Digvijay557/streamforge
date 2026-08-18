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
getQuality(qualtiy){
    return this.qualities.find(q => q.index === qualtiy);
}

setQuality(quality) {
    const index = this.qualities.findIndex(q => q.index === quality);
    if (index !== -1) {
        this.currentQualityIndex = index;
    }
    
    this.playQuality(index);
}
getAvailableQualities(){
    return this.qualities.map(q => q.index);
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