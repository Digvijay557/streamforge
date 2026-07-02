const { exec } = require("child_process");

async function getVideoInfo(videoPath) {

    const command =
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;

    return new Promise((resolve, reject) => {

        exec(command, (error, stdout, stderr) => {

            if (error) {
                return reject(error);
            }

            try {
                if (!stdout) return reject(new Error('ffprobe returned no output'));

                const info = JSON.parse(stdout);
                const video = (info.streams || []).find(stream => stream.codec_type === 'video') || null;
                const audio = (info.streams || []).find(stream => stream.codec_type === 'audio') || null;

                resolve({
                    video,
                    audio,
                    format: info.format || null
                });
            } catch (err) {
                reject(err);
            }

        });

    });

}

module.exports = {
    getVideoInfo
};