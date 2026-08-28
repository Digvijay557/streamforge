javascript
export default class BandwidthEstimator {
    constructor() {
        this.slowEstimate = null;
        this.fastEstimate = null;    
    }

    recordSegmentDownload(bytes, durationMs) {
    const seconds = durationMs / 1000;
    const bits = bytes * 8;
    const bps = bits / seconds;

    if (this.fastEstimate === null) {
        this.fastEstimate = bps;
    } else {
        this.fastEstimate = (0.5) * bps + (.5) * this.fastEstimate;
    }
    if (this.slowEstimate === null) {
        this.slowEstimate = bps;
    } else {
        this.slowEstimate = (0.15) * bps + (1 - 0.15) * this.slowEstimate;
    }
}

    getBandwidthEstimate() {
    if (this.slowEstimate != null && this.fastEstimate != null) {
        return Math.min(this.fastEstimate, this.slowEstimate);
    }
    return null;
}
}
