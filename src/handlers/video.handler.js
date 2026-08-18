const path = require("path");
const { exists } = require("../storage/local.storage");
const { generateHLS } = require("../transcoder/ffmpeg");
const fs = require("fs");
const fsp = require("fs/promises");
const { validate } = require("../utils/helpers");

async function videoHandler(req, res, config = {}) {
    try {
        const result = await exists(req.url);
        console.log("result.vidsrc: " + result.vidsrc);
        console.log(result.vidsrc.split("-")[1]);
        const isNative = (result.vidsrc.split("-")[1] == "native.mp4")?true:false;
        let videoname;
        if(isNative){
            videoname = `${result.vidsrc.split("-")[0]}.mp4`
        }else{
            videoname = `${result.vidsrc.split("-")[0]}`
        }
       
        
        
        
        const sourcePath = path.join(config.source, videoname);

        const videoName = path.parse(sourcePath).name; 
        
        const videoPath = `/${ videoname}`;
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

            console.log("[StreamForge] Generating HLS:", sourcePath,videoPath);

             await generateHLS(sourcePath, videoPath);

            
        }
        let protocol;
        
            protocol = fs.existsSync(path.join(cachePath, "manifest.sf"))
            ? "sf"
            : "hls";
       
        
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