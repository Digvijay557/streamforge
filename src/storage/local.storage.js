const fs = require("fs/promises");
const path = require("path");

async function exists(videoPath) {
    const fileName = path.parse(videoPath).name;

    const requestedFile = path.join(
        ".streamforge",
        fileName,
        "master.m3u8"
    );

    try {
        await fs.access(requestedFile);

        return {
            status: true,
            vidsrc: `${fileName}.mp4`,
            requestedFile,
            videoName: fileName
        };

    } catch (err) {

        if (err.code !== "ENOENT") {
            console.error("[StreamForge] Failed to access cache:", requestedFile);
            console.error(err);
        }

        return {
            status: false,
            vidsrc: `${fileName}.mp4`,
            requestedFile,
            videoName: fileName
        };
    }
}

module.exports = {
    exists
    
};