const fs = require("fs");

module.exports.rewritePlaylist = function (filePath, videoName, quality = null) {

    const content = fs.readFileSync(filePath, "utf8");

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

    fs.writeFileSync(filePath, updated.join("\n"));
};