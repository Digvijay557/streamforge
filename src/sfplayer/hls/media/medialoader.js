export class SegmentLoader {
    constructor(
    network,
    mediaEngine,
    onSegmentRequest,
    protocol,
    SOURCE,
    quality
) {
    this.network = network;
    this.mediaEngine = mediaEngine;
    this.onSegmentRequest = onSegmentRequest;

    this.protocol = protocol;
    this.playlist = SOURCE; 

    this.currentSegment = 0;
    this.MAX_RETRIES = 5;
    this.loading = false;
    this.quality = quality
}

getSegmentURL(index) {
    console.log("index" + index);
    
    if (this.protocol === "hls") {
        console.log("hls uwu");
        
        return this.playlist.segments[index].uri;
    }
    console.log("sf uwu");
    
    return `/streamforge/stream/${this.playlist.video.name}/${this.quality}/segment_${
        index.toString().padStart(3, "0")
    }.m4s`;
}

    get segmentCount() {
        return this.playlist?.segments?.length ?? this.playlist?.segmentCount ?? 0;
    }

    seekToSegment(segment = 0) {
        const target = Number.isFinite(segment) ? Math.floor(segment) : 0;
        this.currentSegment = this.segmentCount === 0
            ? 0
            : Math.max(0, Math.min(target, this.segmentCount - 1));
    }

    async loadNext() {
        console.log(this.quality);
        
        let lastError;

        if (this.loading) return false;
        if (this.currentSegment >= this.segmentCount) return false;

        this.loading = true;

        try {
            for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
                try {
                    let index = this.currentSegment;
                    console.log(this.currentSegment);
                    
                    console.log(index);
                    
                    const url = this.getSegmentURL(index);

                    this.onSegmentRequest?.(index);

                    const { response } = await this.network.request(url);
                    const bytes = await response.arrayBuffer();

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
        this.currentSegment = Math.max(
            0,
            Math.min(index, this.segmentCount - 1)
        );
    }

    getLastLoadedSegment() {
        return this.currentSegment - 1;
    }

    isFinished() {
        return this.currentSegment >= this.segmentCount;
    }
}