const fs = require("fs");
const path = require("path");

async function testHandler(req,res,){
        const relativePath = req.url.replace("test", "");

        if (!relativePath) {
        return false;
    }
    const cacheFile = path.join("src/assets",relativePath);
    console.log("usw", cacheFile);
    console.log(fs.existsSync(cacheFile));
        
        if (!fs.existsSync(cacheFile)) {
            return false;
        }
        res.type("application/vnd.apple.mpegurl" || "application/octet-stream");

        const stream = fs.createReadStream(cacheFile);
            // console.log(stream);
            
            stream.on("error", (err) => {
                console.error("Cache stream error:", err);
        
                if (!res.headersSent) {
                    return res.status(500).json({
                        error: "Failed to read cached file."
                    });
                }
        
                res.destroy(err);
            });
        
            res.on("close", () => {
                stream.destroy();
            });
        
            stream.pipe(res);
            console.log("Streamed succfeulyly");
            
            return true;
        
        

}


module.exports = testHandler;