const fs = require("fs");
const path = require("path");

function createMasterPlaylist(videoName, qualities) {

    let content = "#EXTM3U\n\n";

    const bandwidthMap = {
        1080: 5000000,
        720: 2800000,
        480: 1400000,
        360: 800000,
        240: 400000,
        144: 200000
    };

    const resolutionMap = {
        1080: "1920x1080",
        720: "1280x720",
        480: "854x480",
        360: "640x360",
        240: "426x240",
        144: "256x144"
    };

    for (const quality of qualities) {

        content += `#EXT-X-STREAM-INF:
        BANDWIDTH=${bandwidthMap[quality]},
        RESOLUTION=${resolutionMap[quality]}\n`;
        content += `${quality}p/index.m3u8\n\n`;

    }

    fs.writeFileSync(
        path.join(".streamforge", videoName, "master.m3u8"),
        content
    );
}

module.exports = {
    createMasterPlaylist
}; 