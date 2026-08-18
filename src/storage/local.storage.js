const fs = require("fs/promises");
const path = require("path");

async function exists(videoPath) {
    console.log("checking exist");
    
    const fileName = path.parse(videoPath).name;
    console.log("fileName:  "+ fileName);
    
    const realfilename = `${fileName.split("-")[0]}.mp4`
    console.log(realfilename);
    console.log(fileName.split("-")[0]);
    
    
    const cacheDir = path.join(".streamforge", fileName.split("-")[0]);
    console.log(cacheDir);

    try {
        console.log(
            "ggg"
        );
        const stats = await fs.stat(cacheDir);
        console.log("succass");
        
        
        return {
            status: stats.isDirectory(),
            vidsrc: `${fileName}.mp4`,
            videoName: fileName.split("-")[0]
        };
    } catch (err) {
        if (err.code !== "ENOENT") {
            console.error(err);
        }
        console.log("dfdfgfghgjh");
        
        return {
            status: false,
             vidsrc: `${fileName}.mp4`,
            videoName: fileName.split("-")[0]
        };
    }
}

module.exports = {
    exists
    
};