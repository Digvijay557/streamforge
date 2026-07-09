const { getVideoInfo } = require('./ffprobe');
const fs = require('fs');
const fsp = fs.promises;
const { execFile } = require('child_process');
const path = require('path');
const { createMasterPlaylist } = require('./hls');
const { rewritePlaylist } = require('./rewrite');

const FFMPEG_TIMEOUT_MS = 30 * 60 * 1000; // 30 min hard ceiling per rendition
const FFMPEG_MAX_BUFFER = 1024 * 1024 * 20; // 20MB for stdout/stderr capture
const ALLOWED_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']);

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
        console.warn(`Failed to clean up ${dirPath}:`, err.message);
    }
}

/**
 * Runs a single ffmpeg rendition using execFile (array args — no shell
 * involved, so filenames/paths can never be interpreted as shell syntax).
 */
async function generateHLSforQuality(videoPath, quality, outputDir) {
    await ensureDir(outputDir);

    const args = [
        '-y',
        '-i', videoPath,
        '-vf', `scale=-2:${quality}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-c:a', 'aac',
        '-hls_time', '6',
        '-hls_playlist_type', 'vod',
        '-hls_segment_type', 'fmp4',
        '-hls_fmp4_init_filename', path.join(outputDir, 'init.mp4'),
        '-hls_segment_filename', path.join(outputDir, 'segment_%03d.m4s'),
        path.join(outputDir, 'index.m3u8'),
    ];

    return new Promise((resolve, reject) => {
        const child = execFile(
            'ffmpeg',
            args,
            { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: FFMPEG_MAX_BUFFER, killSignal: 'SIGKILL' },
            (error, stdout, stderr) => {
                if (error) {
                    if (error.code === 'ENOENT') {
                        return reject(new Error('ffmpeg binary not found on PATH'));
                    }
                    if (error.killed && error.signal === 'SIGKILL') {
                        return reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms for ${quality}`));
                    }
                    return reject(new Error(`ffmpeg exited with code ${error.code} for ${quality}: ${stderr?.slice(-2000)}`));
                }
                resolve({ stdout, stderr });
            }
        );

        child.on('error', (err) => reject(new Error(`Failed to spawn ffmpeg: ${err.message}`)));
    });
}

module.exports.generateHLS = async function generateHLS(filepath) {
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

    const qualities = planQualities(vidinfo.video.height);
    const videoName = path.parse(filepath).name;
    const videoRoot = path.join('.streamforge', videoName);

    await ensureDir('.streamforge');

    // Start clean so old segments from a previous run don't mix with new ones.
    await removeDirSafely(videoRoot);
    await ensureDir(videoRoot);

    try {
        for (const quality of qualities) {
            const outputDir = path.join(videoRoot, `${quality}`);

            await generateHLSforQuality(filepath, quality, outputDir);

            await rewritePlaylist(
                path.join(outputDir, 'index.m3u8'),
                videoName,
                `${quality}`
            );
        }

        await createMasterPlaylist(videoName, qualities);

        await rewritePlaylist(
            path.join('.streamforge', videoName, 'master.m3u8'),
            videoName
        );
    } catch (err) {
        // Fail fast, but don't leave a half-built output tree behind.
        await removeDirSafely(videoRoot);
        throw err;
    }

    return { videoName, qualities };
};