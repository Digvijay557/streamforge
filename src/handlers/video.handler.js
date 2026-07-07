const path = require("path");
const { exists } = require("../storage/local.storage");
const { generateHLS } = require("../transcoder/ffmpeg");
const fs = require("fs");

async function videoHandler(req, res, config = {}) {
    try {
        const result = await exists(req.url);

        if (!result.status) {
            const sourcePath = path.join(config.source, result.vidsrc);

            console.log("[StreamForge] Generating HLS:", sourcePath);

            await generateHLS(sourcePath);

            return res.sendFile(path.resolve(result.requestedFile), {
                dotfiles: "allow"
            });
        }

        return res.sendFile(path.resolve(result.requestedFile), {
            dotfiles: "allow"
        });

    } catch (err) {
        console.error("[StreamForge] Video Handler Error");
        console.error(err);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Internal Server Error"
            });
        }

        res.destroy(err);
    }
}

module.exports = videoHandler;