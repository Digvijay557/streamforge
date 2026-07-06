const fs = require("fs");
const path = require("path");

async function cacheHandler(req, res, config = {}) {

    console.log("📦 Cache Handler");

    const relativePath = req.url.replace("/stream/", "");

    const cacheFile = path.join(config.cache, relativePath);

    if (!fs.existsSync(cacheFile)) {
        return false;
    }

    if (cacheFile.endsWith(".m3u8")) {
        res.type("application/vnd.apple.mpegurl");
    } else if (cacheFile.endsWith(".m4s")) {
        res.type("video/iso.segment");
    } else if (cacheFile.endsWith(".mp4")) {
        res.type("video/mp4");
    }

    fs.createReadStream(cacheFile).pipe(res);
}

module.exports = cacheHandler;