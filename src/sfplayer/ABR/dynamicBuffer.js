/**
 * Dynamic buffer target — combines quality tier + network stability.
 * Replaces the fixed PREFECT_BUFFER = 30 in sfplayer.js's #onTimeUpdate().
 */
export default function getDynamicBufferTarget(currentQualityIndex, qualityArrayLength, bandwidthEstimator) {
    const BASE_BUFFER = 20;

    const qualityRatio = currentQualityIndex / Math.max(1, qualityArrayLength - 1);
    const qualityBonus = qualityRatio * 10;

    let stabilityPenalty = 0;
    const fast = bandwidthEstimator.fastEstimate;
    const slow = bandwidthEstimator.slowEstimate;
    if (fast !== null && slow !== null && slow > 0) {
        const volatility = Math.abs(fast - slow) / slow;
        if (volatility > 0.1) {
            stabilityPenalty = Math.min((volatility - 0.1) * 8, 15);
        }
    }

    const target = BASE_BUFFER + qualityBonus + stabilityPenalty;
    console.log("Dynamic buffer baby : " + Math.min(target, 45));
    
    return Math.min(target, 45);
}