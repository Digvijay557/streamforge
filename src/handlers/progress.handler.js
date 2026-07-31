const {
    onProgress,
    offProgress
} = require("../services/progress.manager");

function progressHandler(req, res) {

    const videoPath = req.path.slice(0, -"/progress".length) + ".mp4";
    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send headers immediately
    res.flushHeaders();

    // Optional: tell client connection is alive
    res.write(`data: ${JSON.stringify({
        stage: "Connected",
        percent: 0
    })}\n\n`);

    const listener = (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
    };
    console.log("progressss" + videoPath);
    
    onProgress(videoPath,listener);

    req.on("close", () => {
        offProgress(videoPath,listener);
        res.end();
    });
}

module.exports = progressHandler;