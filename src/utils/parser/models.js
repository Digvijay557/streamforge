// parser/models.js

class MasterPlaylist {
    constructor() {
        this.version = null;
        this.variants = [];
        
    }
}

class VariantPlaylist {
    constructor() {
        this.version = null;

        // NEW
        this.initSegment = null;

        this.segments = [];
        this.endlist = false;
    }
}

class VariantStream {
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

class Segment {
    constructor({
        duration = null,
        uri = null,
    } = {}) {
        this.duration = duration;
        this.uri = uri;
    }
}

module.exports = {
    MasterPlaylist,
    VariantPlaylist,
    VariantStream,
    Segment,
};