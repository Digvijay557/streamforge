const fs = require("fs");
const path = require("path");


function getSegmentDurations(m3u8FilePath) {
    return fs.readFileSync(m3u8FilePath, 'utf8')
        .split('\n')
        .filter(line => line.startsWith('#EXTINF:'))
        .map(line => parseFloat(line.split(':')[1]));
}

    const QUALITY_INFO = {
    1080: { width: 1920, height: 1080, bandwidth: 5000000 },
    720:  { width: 1280, height: 720,  bandwidth: 2800000 },
    480:  { width: 854,  height: 480,  bandwidth: 1400000 },
    360:  { width: 640,  height: 360,  bandwidth: 800000 },
    240:  { width: 426,  height: 240,  bandwidth: 400000 },
    144:  { width: 256,  height: 144,  bandwidth: 200000 }
};


function generateManifest(videoName,qualities,duration) {
    if (!qualities.length) {
    throw new Error("No qualities provided.");
}
    const segmentDurations = getSegmentDurations(path.join(".streamforge", videoName, qualities[0].toString(), "index.m3u8"));
    const MAX_SEGMENTS = 2000;

if (segmentDurations.length > MAX_SEGMENTS) {
    return false;
}
    const manifest = {
        version:1,
        type: "vod",
        init: "init.mp4",

        video :{
            name:videoName,
            duration,
        },
        qualities: [],
        segments: segmentDurations
    }


    for (const quality of qualities) {
        const info = QUALITY_INFO[quality];
        if(!info){
            throw new Error(`Unsupported quality: ${quality}`);
        }
        manifest.qualities.push({
            id: quality,
            ...info
        });
    }

        fs.writeFileSync(
        path.join(".streamforge", videoName, "manifest.sf"),
        JSON.stringify(manifest, null, 2)
    );
    return true;

}

module.exports = {
    generateManifest
};