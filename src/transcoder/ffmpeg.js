const {getVideoInfo} = require('./ffprobe');
const fs = require('fs')
const {exec} = require('child_process');
const path = require('path');
const { createMasterPlaylist } = require('./hls');
const { rewritePlaylist } = require('./rewrite');


function planQualities(height) {
    const qualities = [];

    if (height >= 1080) qualities.push(1080);
    if (height >= 720) qualities.push(720);
    if (height >= 480) qualities.push(480);
    if (height >= 360) qualities.push(360);
    if (height >= 240) qualities.push(240);
    if (height >= 144) qualities.push(144);

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

        -hls_segment_type fmp4
        -hls_fmp4_init_filename "${path.join(outputDir, "init.mp4")}"
        -hls_segment_filename "${path.join(outputDir, "segment_%03d.m4s")}"

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

    console.log("🚀 generateHLS() started");

    const vidinfo = await getVideoInfo(filepath);
    console.log("📄 Video Info:", vidinfo);

    const qualities = planQualities(vidinfo.video.height);
    console.log("🎥 Qualities:", qualities);

    const videoName = path.parse(filepath).name;

    await ensureDir(".streamforge");
    await ensureDir(`.streamforge/${videoName}`);

    for (const quality of qualities) {

        console.log(`⚙️ Generating ${quality}p...`);

        const outputDir = `.streamforge/${videoName}/${quality}p`;

        await ensureDir(outputDir);

        await generateHLSforQuality(
            filepath,
            quality,
            outputDir
        );
        

        console.log(`✅ ${quality}p generated`);



        await rewritePlaylist(
            path.join(outputDir, "index.m3u8"),
            videoName,
            `${quality}p`
        );


        console.log(`✅ ${quality}p regenerated`);
    }
    createMasterPlaylist(videoName,qualities)

    await rewritePlaylist(
    path.join(".streamforge", videoName, "master.m3u8"),
    videoName
);

    console.log("🎉 All qualities generated.");
}