import BandwidthEstimator from "../../ABR/bandwidthEstimator.js";
import QualityDecider from "../../ABR/QualityDecider.js";
import BufferMonitor from "../../ABR/BufferMoniter.js"
export class SegmentLoader {
    constructor(
        network,
        mediaEngine,
        onSegmentRequest,
        protocol,
        SOURCE,
        quality,
        video,          // ← NEW: needed for buffer checks
        qualityLadder   // ← NEW: array of {quality, bitrate}, only used for "sf"
    ) {
        this.network = network;
        this.mediaEngine = mediaEngine;
        this.onSegmentRequest = onSegmentRequest;

        this.protocol = protocol;
        this.playlist = SOURCE;

        this.currentSegment = 0;
        this.MAX_RETRIES = 5;
        this.loading = false;
        this.quality = quality;

        this.video = video;

        // ABR only wired for "sf" protocol — HLS variant switching works
        // differently (index-based, not a `quality` string) and isn't
        // covered by this ABR engine yet.
        if (this.protocol === "sf" && qualityLadder) {
            this.bandwidthEstimator = new BandwidthEstimator();
            this.qualityDecider = new QualityDecider(qualityLadder);
            this.BufferMonitor = new BufferMonitor()
        }
    }

    getSegmentURL(index) {
        if (this.protocol === "hls") {
            return this.playlist.segments[index].uri;
        }
        return `/streamforge/stream/${this.playlist.video.name}/${this.quality}/segment_${
            index.toString().padStart(3, "0")
        }.m4s`;
    }

    get segmentCount() {
        return this.playlist?.segments?.length ?? this.playlist?.segmentCount ?? 0;
    }

    setPlaylist(playlist) {
        this.playlist = playlist;
        this.seekToSegment(this.currentSegment);
    }

    seekToSegment(segment = 0) {
        const target = Number.isFinite(segment) ? Math.floor(segment) : 0;
        this.currentSegment = this.segmentCount === 0
            ? 0
            : Math.max(0, Math.min(target, this.segmentCount - 1));
    }

async loadNext() {
    let lastError;

    if (this.loading) return false;
    if (this.currentSegment >= this.segmentCount) return false;

    this.loading = true;

    try {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                // ── ABR: decide quality BEFORE building the URL ──────────
                if (this.qualityDecider && this.video) {
                    const bandwidthEstimate = this.bandwidthEstimator.getBandwidthEstimate();
                    const decision = this.qualityDecider.decideNextQuality(this.video, bandwidthEstimate);


                    
                     console.log(
        "bandwidth estimate:", bandwidthEstimate,
        "buffer ahead:", BufferMonitor.getBufferAheadSeconds(this.video),
        "reason:", decision.quality
    );
                    if (decision.quality !== this.quality) {
                        // Quality tier changed — each tier has its own init
                        // segment (different codec params/SPS-PPS), so we
                        // must fetch + append the new one before appending
                        // any segment from the new tier, or decode breaks.
                        const initUrl = `/streamforge/stream/${this.playlist.video.name}/${decision.quality}/init.mp4`;
                        const { response: initResponse } = await this.network.request(initUrl);
                        const initBytes = await initResponse.arrayBuffer();
                        await this.mediaEngine.append(initBytes);
                    }

                    this.quality = decision.quality;
                }
                // ──────────────────────────────────────────────────────────

                let index = this.currentSegment;
                const url = this.getSegmentURL(index);

                this.onSegmentRequest?.(index);

                // ── ABR: time the segment fetch ──────────────────────────
                const startTime = performance.now();
                const { response } = await this.network.request(url);
                const bytes = await response.arrayBuffer();
                const durationMs = performance.now() - startTime;
                console.log("DuratoinM: " + durationMs);
                

                if (this.bandwidthEstimator) {
                    this.bandwidthEstimator.recordSegmentDownload(bytes.byteLength, durationMs);
                }
                // ──────────────────────────────────────────────────────────
                
                await this.mediaEngine.append(bytes);

                this.currentSegment++;

                return true;
            } catch (err) {
                lastError = err;
                if (attempt === this.MAX_RETRIES) {
                    throw err;
                }
            }
        }
    } finally {
        this.loading = false;
    }

    throw lastError;
}

    seekTo(index) {
        this.currentSegment = Math.max(0, Math.min(index, this.segmentCount - 1));
    }

    getLastLoadedSegment() {
        return this.currentSegment - 1;
    }

    isFinished() {
        return this.currentSegment >= this.segmentCount;
    }
}