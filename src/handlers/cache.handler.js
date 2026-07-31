const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".m4s": "video/iso.segment",
    ".mp4": "video/mp4",
    ".sf": "application/vnd.streamforge.manifest+json"
};

async function cacheHandler(req, res, config = {}) {
    const relativePath = req.url.replace("/stream/", "");

    if (!relativePath) {
        return false;
    }

    const cacheFile = path.join(config.cache, relativePath);
    console.log("usw", cacheFile);
    
    console.log(!fs.existsSync(cacheFile));
    
    if (!fs.existsSync(cacheFile)) {
        return false;
    }

    const ext = path.extname(cacheFile);

    res.type(MIME_TYPES[ext] || "application/octet-stream");

    const stream = fs.createReadStream(cacheFile);

    stream.on("error", (err) => {
        console.error("Cache stream error:", err);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Failed to read cached file."
            });
        }

        res.destroy(err);
    });

    res.on("close", () => {
        stream.destroy();
    });

    stream.pipe(res);

    return true;
}

module.exports = cacheHandler;