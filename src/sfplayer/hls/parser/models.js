// parser/models.js

export class MasterPlaylist {
    constructor() {
        this.version = null;
        this.variants = [];
    }
}

export class VariantPlaylist {
    constructor() {
        this.version = null;

        // NEW
        this.initSegment = null;

        this.segments = [];
        this.endlist = false;
    }
}

export class VariantStream {
    constructor({
        bandwidth = null,
        resolution = null,
        uri = null,
    } = {}) {
        this.bandwidth = bandwidth;
        this.resolution = resolution;
        this.uri = uri;
    }
}

export class Segment {
    constructor({
        duration = null,
        uri = null,
    } = {}) {
        this.duration = duration;
        this.uri = uri;
    }
}