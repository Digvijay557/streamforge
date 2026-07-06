const path = require("path");
const { exists } = require("../storage/local.storage");
const { generateHLS } = require("../transcoder/ffmpeg");
const fs = require("fs");

async function videoHandler(req, res, config = {}) {



    console.log("config:", config);
    const result = await exists(req.url);
    console.log("result:", result)
    console.log(result);
    if (!result.status) {
        console.log(path.join(config.source, result.vidsrc));
        
        await generateHLS(path.join(config.source, result.vidsrc));
        const fullPath = path.resolve(result.requestedFile);

console.log(fullPath);
console.log("Exists:", fs.existsSync(fullPath));

return res.sendFile(fullPath, {
    dotfiles: "allow"
});
    }

   return res.sendFile(
    path.resolve(result.requestedFile),
    {
        dotfiles: "allow"
    }
);
}

module.exports = videoHandler;