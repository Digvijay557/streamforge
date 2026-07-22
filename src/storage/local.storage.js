const fs = require("fs/promises");
const path = require("path");

async function exists(videoPath) {
    const fileName = path.parse(videoPath).name;

    const cacheDir = path.join(".streamforge", fileName);

    try {
        const stats = await fs.stat(cacheDir);

        return {
            status: stats.isDirectory(),
            vidsrc: `${fileName}.mp4`,
            videoName: fileName
        };
    } catch (err) {
        if (err.code !== "ENOENT") {
            //console.error(err);
        }

        return {
            status: false,
            vidsrc: `${fileName}.mp4`,
            videoName: fileName
        };
    }
}

module.exports = {
    exists
    
};