const path = require("path");
const { generateHLS } = require("../src/transcoder/ffmpeg");

(async () => {
    try {

        const videoPath = path.resolve(__dirname, "../src/videos/demo.mp4");

        //console.log("📹 Video Path:", videoPath);

        await generateHLS(videoPath);

        //console.log("✅ HLS Generated Successfully");

    } catch (err) {

        //console.error("❌ Error:");
        //console.error(err);

    }
})();