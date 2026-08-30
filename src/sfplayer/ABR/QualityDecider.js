import BufferMonitor from './BufferMoniter.js';

export default class QualityDecider {
    constructor(qualityLadder) {
        this.currentQualityIndex = 0;
        this.lastSwitchTime = 0;
        this.qualityArray = qualityLadder;
        this.BufferMonitor = new BufferMonitor();
    }

   decideNextQuality(video, bandwidthEstimate) {
    const bufferAhead = BufferMonitor.getBufferAheadSeconds(video);
    const sustainableIndex = this.#findSustainableTier(bandwidthEstimate);

    // Zone 1: emergency — ignores cooldown, always jumps to sustainable tier
    if (bufferAhead < 10) {
        if (sustainableIndex < this.currentQualityIndex) {
            this.currentQualityIndex = sustainableIndex;
            this.lastSwitchTime = performance.now();
        }
        return this.#result();
    }

    const now = performance.now();
    const inCooldown = now - this.lastSwitchTime < 5000;
    if (inCooldown) return this.#result();

    // Zone 2: upgrade — buffer healthy, bandwidth supports jumping up
    if (bufferAhead > 20 && sustainableIndex > this.currentQualityIndex) {
        this.currentQualityIndex = sustainableIndex;
        this.lastSwitchTime = performance.now();
        return this.#result();
    }

    // Zone 3: proactive downgrade — bandwidth can no longer sustain current tier
    if (sustainableIndex < this.currentQualityIndex) {
        this.currentQualityIndex = sustainableIndex;
        this.lastSwitchTime = performance.now();
    }

    return this.#result();
}

#findSustainableTier(bandwidthEstimate) {
    if (bandwidthEstimate === null) return 0;
    for (let i = this.qualityArray.length - 1; i >= 0; i--) {
        if (bandwidthEstimate >= this.qualityArray[i].bitrate * 1.3) {
            return i;
        }
    }
    return 0;
}

#result() {
    return {
        index: this.currentQualityIndex,
        quality: this.qualityArray[this.currentQualityIndex].quality
    };
}

    setManualQuality(index) {
        this.currentQualityIndex = index;
        this.lastSwitchTime = performance.now();
    }
}