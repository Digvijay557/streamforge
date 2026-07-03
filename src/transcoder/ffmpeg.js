const {getVideoInfo} = require('./ffprobe');
const fs = require('fs')
const {exec} = require('child_process');
const path = require('path');


function planQualities(height) {
    const qualities = [];

    if (height >= 1080) qualities.push(1080);
    if (height >= 720) qualities.push(720);
    if (height >= 480) qualities.push(480);

    if (qualities.length === 0) {
        qualities.push(height);
    }

    return qualities;
}

async function ensureDir(dirPath){
    return new Promise((resolve, reject)=>{
        fs.mkdir(dirPath, {recursive: true}, (err)=>{
            if(err) return reject(err);
            resolve();
        })
    })
}


async function generateHLSforQuality(videoPath, quality, outputDir) {

    await ensureDir(outputDir);

    const command = `
        ffmpeg
        -y
        -i "${videoPath}"
        -vf scale=-2:${quality}
        -c:v libx264
        -preset veryfast
        -crf 23
        -c:a aac
        -hls_time 6
        -hls_playlist_type vod
        -hls_segment_filename "${path.join(outputDir, "segment_%03d.ts")}"
        "${path.join(outputDir, "index.m3u8")}"
    `.replace(/\s+/g, " ").trim();

    return new Promise((resolve, reject) => {

        exec(command, (error, stdout, stderr) => {

            if (error) {
                return reject(error);
            }

            resolve({
                stdout,
                stderr
            });

        });

    });
}









module.exports.generateHLS = async function (filepath) {

  
    const vidinfo = await getVideoInfo(filepath);

  
    const qualities = planQualities(vidinfo.video.height);

   
    const videoName = path.parse(filepath).name;

    
    await ensureDir(".streamforge");
    await ensureDir(`.streamforge/${videoName}`);

    for (const quality of qualities) {

        const outputDir = `.streamforge/${videoName}/${quality}p`;

        await ensureDir(outputDir);

        await generateHLSforQuality(
            filepath,
            quality,
            outputDir
            );
        }
    }
