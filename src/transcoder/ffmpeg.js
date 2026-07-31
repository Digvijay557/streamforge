const { getVideoInfo } = require('./ffprobe');
const fs = require('fs');
const fsp = fs.promises;
const { execFile } = require('child_process');
const path = require('path');
const { createMasterPlaylist } = require('./hls');
const { rewritePlaylist } = require('./rewrite');
const { emitProgress } = require("../services/progress.manager");
const { validate } = require('../utils/helpers');
const { generateManifest } = require('./manifest');
const FFMPEG_TIMEOUT_MS = 30 * 60 * 1000; // 30 min hard ceiling per rendition
const FFMPEG_MAX_BUFFER = 1024 * 1024 * 20; // 20MB for stdout/stderr capture
const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']);
const { spawn } = require("child_process");
function planQualities(height) {
    if (!Number.isFinite(height) || height <= 0) {
        throw new Error(`Invalid source height: ${height}`);
    }

    const LADDER = [1080, 720, 480, 360, 240, 144];
    
    
        const qualities = LADDER.filter((q) => height >= q);
        

    if (qualities.length === 0) {
        qualities.push(height);
    }

    return qualities;
}

async function ensureDir(dirPath) {
    await fsp.mkdir(dirPath, { recursive: true });
}

async function assertReadableVideoFile(filepath) {
    if (!filepath || typeof filepath !== 'string') {
        throw new Error('filepath must be a non-empty string');
    }

    const ext = path.extname(filepath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        throw new Error(`Unsupported file extension: ${ext || '(none)'}`);
    }

    let stat;
    try {
        stat = await fsp.stat(filepath);
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`File does not exist: ${filepath}`);
        }
        throw err;
    }

    if (!stat.isFile()) {
        throw new Error(`Path is not a regular file: ${filepath}`);
    }
    if (stat.size === 0) {
        throw new Error(`File is empty: ${filepath}`);
    }

    try {
        await fsp.access(filepath, fs.constants.R_OK);
    } catch {
        throw new Error(`File is not readable (permissions): ${filepath}`);
    }
}

async function removeDirSafely(dirPath) {
    try {
        await fsp.rm(dirPath, { recursive: true, force: true });
    } catch (err) {
        //console.warn(`Failed to clean up ${dirPath}:`, err.message);
    }
}

/**
 * Runs a single ffmpeg rendition using execFile (array args — no shell
 * involved, so filenames/paths can never be interpreted as shell syntax).
 */
// 
async function generateHLSforQuality(videoPath, quality, outputDir, onProgress) {
    await ensureDir(outputDir);

    const args = [
        "-y",
        "-i", videoPath,

        "-progress", "pipe:1",
        "-nostats",

        "-vf", `scale=-2:${quality}`,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "23",
        "-c:a", "aac",

        "-hls_time", "6",
        "-hls_playlist_type", "vod",
        "-hls_segment_type", "fmp4",

        "-hls_fmp4_init_filename", path.join(outputDir, "init.mp4"),
        "-hls_segment_filename", path.join(outputDir, "segment_%03d.m4s"),

        path.join(outputDir, "index.m3u8"),
    ];

    return new Promise((resolve, reject) => {

        const child = spawn("ffmpeg", args);

        let stderr = "";

        // Timeout
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
        }, FFMPEG_TIMEOUT_MS);

       
        child.stdout.on("data", (data) => {

            const lines = data.toString().trim().split("\n");

            for (const line of lines) {

                const [key, value] = line.split("=");

                if (key === "out_time_ms" || key === "out_time_us") {
            const currentDuration = Number(value)/1000000; 

            if (onProgress) {
                onProgress(currentDuration);
            }
        

                   
                }

            }

        });

        
        child.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        child.on("close", (code) => {

            clearTimeout(timer);

            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `ffmpeg exited with code ${code} for ${quality}\n${stderr}`
                    )
                );
            }

        });

        child.on("error", (err) => {

            clearTimeout(timer);

            if (err.code === "ENOENT") {
                return reject(new Error("ffmpeg binary not found on PATH"));
            }

            reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));

        });

    });
}
module.exports.generateHLS = async function generateHLS(filepath, videoPath,retry =0) {
    emitProgress(videoPath,{
            stage:"Starting....",
            percent: (0)*100
        })
  
    await assertReadableVideoFile(filepath);

    let vidinfo;
    try {
        vidinfo = await getVideoInfo(filepath);
    } catch (err) {
        throw new Error(`Failed to read video metadata for ${filepath}: ${err.message}`);
    }
    
    if (!vidinfo || !vidinfo.video || !Number.isFinite(vidinfo.video.height)) {
        throw new Error(`No usable video stream found in ${filepath}`);
    }
    const duration = Number(vidinfo.format.duration);
    const qualities = planQualities(vidinfo.video.height);
    const videoName = path.parse(filepath).name;
    const videoRoot = path.join('.streamforge', videoName);
    
   
   
    emitProgress(videoPath,{
        stage:"Video Information Obtained!!",
        percent: 0*100
    })
    await ensureDir('.streamforge');
    
    // Start clean so old segments from a previous run don't mix with new ones.
    await removeDirSafely(videoRoot);
    await ensureDir(videoRoot);
    let protocol;
    let lastPercent = -1;
    try {
        for (let i = 0; i < qualities.length; i++) {

    const quality = qualities[i];
    const outputDir = path.join(videoRoot, `${quality}`);

    await generateHLSforQuality(
        filepath,
        quality,
        outputDir,
        (currentDuration) => {

            const totalWork = duration * qualities.length;

            const workDone =
                i * duration + currentDuration;

            const progress =
                (workDone / totalWork) * 100;

            if (progress !== lastPercent) {

        lastPercent = progress;

        emitProgress(videoPath, {
            stage: "encoding",
            quality,
            percent: progress
        });

    }

        }
    );

    

    await rewritePlaylist(
        path.join(outputDir, "index.m3u8"),
        videoName,
        `${quality}`
    );
}
        await createMasterPlaylist(videoName, qualities);
        
            protocol = await generateManifest(
                videoName,
                qualities,
                duration
            )
            ? "sf"
            : "hls";
        
        
        
        

        await rewritePlaylist(
            path.join('.streamforge', videoName, 'master.m3u8'),
            videoName
        );

        const check = await validate(path.join(".streamforge", videoName));

if (!check) {
    if(retry >=3) throw new Error("tried hard");
    
    await fsp.rm(path.join(".streamforge", videoName), {
        recursive: true,
        force: true
    });
    return await generateHLS(filepath,videoPath,retry+1);
} 
        emitProgress(videoPath,{
            stage:"Finished",
            percent: 100
        })
    } catch (err) {
        // Fail fast, but don't leave a half-built output tree behind.
        await removeDirSafely(videoRoot);
        throw err;
    }

    return { videoName, qualities, protocol };
};