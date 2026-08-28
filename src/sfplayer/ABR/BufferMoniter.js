export default class BufferMonitor {
    static getBufferAheadSeconds(video) {
        const bufferedRangeCount = video.buffered.length;
        const currentTime = video.currentTime;

        for (let i = 0; i < bufferedRangeCount; i++) {
            const bufferedStart = video.buffered.start(i);
            const bufferedEnd = video.buffered.end(i);

            if (currentTime <= bufferedEnd && currentTime >= bufferedStart) {
                return bufferedEnd - currentTime;
            }
        }
        return 0;
    }
}