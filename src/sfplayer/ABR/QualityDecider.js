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
        if (bufferAhead < 10) {
            if (this.currentQualityIndex > 0) {
                this.currentQualityIndex -= 1;
                this.lastSwitchTime = performance.now();
            }
            return {
                index: this.currentQualityIndex,
                quality: this.qualityArray[this.currentQualityIndex].quality
            };
        }

        const now = performance.now();
        const inCooldown = now - this.lastSwitchTime < 5000;

        // Zone 2: upgrade — buffer healthy AND bandwidth comfortably supports next tier
        if (bufferAhead > 20 && !inCooldown) {
            if (
                this.currentQualityIndex < this.qualityArray.length - 1 &&
                bandwidthEstimate >= this.qualityArray[this.currentQualityIndex + 1].bitrate * 1.3
            ) {
                this.currentQualityIndex += 1;
                this.lastSwitchTime = performance.now();
                return {
                    index: this.currentQualityIndex,
                    quality: this.qualityArray[this.currentQualityIndex].quality
                };
            }
        }

        // Zone 3: proactive downgrade — buffer not critical, but bandwidth can no
        // longer sustain current tier (with a 0.9x margin, mirrors upgrade's 1.3x)
        if (
            !inCooldown &&
            bandwidthEstimate < this.qualityArray[this.currentQualityIndex].bitrate * 0.9
        ) {
            if (this.currentQualityIndex > 0) {
                this.currentQualityIndex -= 1;
                this.lastSwitchTime = performance.now();
            }
        }

        // Zone 4 (implicit): hold — nothing above triggered
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