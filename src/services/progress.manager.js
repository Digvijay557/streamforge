const listeners = new Map();

function emitProgress(videoPath, progress) {
    const videoListeners = listeners.get(videoPath);

    if (!videoListeners) return;

    for (const listener of videoListeners) {
        listener(progress);
    }
}

function onProgress(videoPath, listener) {
    if (!listeners.has(videoPath)) {
        listeners.set(videoPath, new Set());
    }

    listeners.get(videoPath).add(listener);
}

function offProgress(videoPath, listener) {
    const videoListeners = listeners.get(videoPath);

    if (!videoListeners) return;

    videoListeners.delete(listener);

    if (videoListeners.size === 0) {
        listeners.delete(videoPath);
    }
}

module.exports = {
    emitProgress,
    onProgress,
    offProgress
};