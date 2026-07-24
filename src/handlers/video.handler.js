const path = require("path");
const { exists } = require("../storage/local.storage");
const { generateHLS } = require("../transcoder/ffmpeg");
const fs = require("fs");
const fsp = require("fs/promises");
const { validate } = require("../utils/helpers");

async function videoHandler(req, res, config = {}) {
    try {
        const result = await exists(req.url);
        const sourcePath = path.join(config.source, result.vidsrc);
        const videoName = path.parse(sourcePath).name;
        const videoPath = `/${result.vidsrc}`;
        const cachePath = path.join(config.cache, videoName);
        console.log(cachePath);
        console.log(`status: ${result.status}`);
        if (result.status) {
            console.log(`existing files exist for ${videoName}, checking cache validity...`);
    const check = await validate(path.join(config.cache, videoName));

    if (!check) {
        await fsp.rm(path.join(config.cache, videoName), {
            recursive: true,
            force: true
        });
        console.log("deleting existing files");
        

        result.status = false;
    }
    console.log(result.status);
    
}
        
        if (!result.status) {

            //console.log("[StreamForge] Generating HLS:", sourcePath);

             await generateHLS(sourcePath, videoPath);

            
        }
        
        
        const protocol = fs.existsSync(path.join(cachePath, "manifest.sf"))
    ? "sf"
    : "hls";
    console.log(protocol);
    
        const requestedFile = path.join(
        cachePath,
        protocol === "sf"
        ? "manifest.sf"
        : "master.m3u8"
);

console.log("path " + path.resolve(requestedFile));

const fileContent = await fsp.readFile(requestedFile)


        if(protocol == "sf"){
            res.setHeader(
                "Content-Type",
                "application/vnd.streamforge.manifest+json"
            )
        }else if (protocol == "hls"){
            res.setHeader(
                "Content-Type",
                "application/vnd.apple.mpegurl"
            )
        }



        return res.sendFile(path.resolve(requestedFile), {
            dotfiles: "allow"
        });

    } catch (err) {
        //console.error("[StreamForge] Video Handler Error");
        //console.error(err);

        if (!res.headersSent) {
            return res.status(500).json({
                error: "Internal Server Error"
            });
        }

        res.destroy(err);
    }
}

module.exports = videoHandler;