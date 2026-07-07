const fs = require("fs");

module.exports.rewritePlaylist = function (filePath, videoName, quality = null) {


    if (!filePath) {
        throw new Error("filePath is required.");
    }
    if (!videoName) {
        throw new Error("videoName is required.");
    }
    
let content;
    try {
    content = fs.readFileSync(filePath, "utf8");
} catch (err) {
    console.error("[StreamForge] Failed to read playlist:", filePath);
    throw err;
}

    const lines = content.split("\n");

    const updated = lines.map(line => {

        // Master playlist
        if (line.endsWith(".m3u8")) {
            return `/streamforge/stream/${videoName}/${line}`;
        }

        // Initialization segment
        if (line.startsWith("#EXT-X-MAP:")) {
            return `#EXT-X-MAP:URI="/streamforge/stream/${videoName}/${quality}/init.mp4"`;
        }

        // Media fragments
        if (line.endsWith(".m4s")) {
            return `/streamforge/stream/${videoName}/${quality}/${line}`;
        }

        return line;

    });

    try {
    fs.writeFileSync(filePath, updated.join("\n"));
} catch (err) {
    console.error("[StreamForge] Failed to write playlist:", filePath);
    throw err;
}
};