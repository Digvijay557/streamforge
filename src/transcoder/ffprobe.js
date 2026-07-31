const { exec } = require("child_process");

async function getVideoInfo(videoPath) {

    const command =
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;

    return new Promise((resolve, reject) => {

        exec(command, (error, stdout, stderr) => {

            if (error) {
                    console.error("[StreamForge] ffprobe failed:");
                    console.error(stderr);

                    return reject(error);
                }

            try {
                if  (!stdout.trim())return reject(new Error('ffprobe returned no output'));

                const info = JSON.parse(stdout);
                const video = (info.streams || []).find(stream => stream.codec_type === 'video') || null;
                const audio = (info.streams || []).find(stream => stream.codec_type === 'audio') || null;

                if (!video && !audio) {
    return reject(
        new Error("Video or audio stream not found.")
    );
}

                resolve({
                    video,
                    audio,
                    format: info.format || null
                });
            } catch (err) {
    console.error("[StreamForge] Invalid ffprobe JSON output");
    reject(err);
}

        });

    });

}

module.exports = {
    getVideoInfo
};