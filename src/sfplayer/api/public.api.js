export function applyPublicApi(SFPlayer) {

    const player = SFPlayer.prototype;

    // ===========================
    // Playback
    // ===========================

    player.play = function () {
        return this.video.play();
    };

    player.pause = function () {
        return this.video.pause();
    };

    player.toggle = function () {
        return this.video.paused
            ? this.video.play()
            : this.video.pause();
    };

    // ===========================
    // Seeking
    // ===========================

    player.seek = function (time) {
        // performSeek CANNOT be private (#)
        return this.performSeek(time);
    };

    player.forward = function (seconds = 10) {
        return this.performSeek(
            this.video.currentTime + seconds
        );
    };

    player.backward = function (seconds = 10) {
        return this.performSeek(
            this.video.currentTime - seconds
        );
    };

    // ===========================
    // Time
    // ===========================

    player.getCurrentTime = function () {
        return this.video.currentTime;
    };

    player.getDuration = function () {
        return this.video.duration;
    };

    player.getBuffered = function () {

        if (!this.video.buffered.length)
            return 0;

        return this.video.buffered.end(
            this.video.buffered.length - 1
        );

    };

    // ===========================
    // Volume
    // ===========================

    player.setVolume = function (volume) {

        this.video.volume = Math.max(
            0,
            Math.min(1, volume)
        );

    };

    player.getVolume = function () {
        return this.video.volume;
    };

    player.mute = function () {
        this.video.muted = true;
    };

    player.unmute = function () {
        this.video.muted = false;
    };

    player.toggleMute = function () {
        this.video.muted = !this.video.muted;
    };

    player.isMuted = function () {
        return this.video.muted;
    };

    // ===========================
    // Playback Rate
    // ===========================

    player.setPlaybackRate = function (rate) {
        this.video.playbackRate = rate;
    };

    player.getPlaybackRate = function () {
        return this.video.playbackRate;
    };

    // ===========================
    // Quality
    // ===========================

    player.getQuality = function () {
        return this.currentQuality;
    };

    player.setQuality = function (quality) {
        return this.playQuality(quality);
    };

    player.getAvailableQualities = function () {
        return [...this.manifest.qualities];
    };

    // ===========================
    // Fullscreen
    // ===========================

    player.enterFullscreen = async function () {

        if (document.fullscreenElement === this)
            return;

        try {
            await this.requestFullscreen();
        } catch (err) {
            console.warn(err);
        }

    };

    player.exitFullscreen = async function () {

        if (document.fullscreenElement !== this)
            return;

        try {
            await document.exitFullscreen();
        } catch (err) {
            console.warn(err);
        }

    };

    player.toggleFullscreen = async function () {

        if (document.fullscreenElement === this)
            return this.exitFullscreen();

        return this.enterFullscreen();

    };

    player.isFullscreen = function () {
        return document.fullscreenElement === this;
    };

    // ===========================
    // Destroy
    // ===========================

    player.destroy = function () {

        this.pause();

        this.video.removeAttribute("src");
        this.video.load();

        this.remove();

    };

}