export class SegmentLoader {
  constructor(network, mediaEngine) {
    this.network = network;
    this.mediaEngine = mediaEngine;

    this.playlist = null;
    this.currentSegment = 0;
    this.loading = false;
  }

  setPlaylist(playlist) {
    this.playlist = playlist;
    this.currentSegment = 0;
  }

  async loadNext() {
    if (!this.playlist) return false;
    if (this.loading) return false;
    if (this.currentSegment >= this.playlist.segments.length) return false;

    this.loading = true;
    const segment = this.playlist.segments[this.currentSegment];

    console.log(`⬇️ Downloading segment ${this.currentSegment}:`, segment.uri);

    try {
      const response = await this.network.request(segment.uri);
      const bytes = await response.arrayBuffer();
      await this.mediaEngine.append(bytes);
      this.currentSegment++;
      return true;
    } catch (err) {
      console.error(`❌ Failed to load segment ${this.currentSegment}`, err);
      return false;
    } finally {
      this.loading = false;
    }
  }

  // NEW — jump the pointer for a seek. Does not load anything itself.
  seekTo(index) {
    if (!this.playlist) return;
    const clamped = Math.max(0, Math.min(index, this.playlist.segments.length - 1));
    this.currentSegment = clamped;
  }

  getLastLoadedSegment() {
    const index = this.currentSegment - 1;
    return index >= 0 ? this.playlist.segments[index] : null;
  }

  isFinished() {
    return !this.playlist || this.currentSegment >= this.playlist.segments.length;
  }
}