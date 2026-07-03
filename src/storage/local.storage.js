const fs = require("fs/promises");
const path = require("path");

async function exists(videoPath) {

    // /videos/demo.mp4  -> demo
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

    } catch {

        return {
            status: false,
            vidsrc: `${fileName}.mp4`,
            requestedFile,
            videoName: fileName
        };

    }

}

function save(videoName, files) {

}

function read(videoName) {

}

module.exports = {
    exists,
    save,
    read
};