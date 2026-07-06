const path = require("path");
const { exists } = require("../storage/local.storage");
const { generateHLS } = require("../transcoder/ffmpeg");
const fs = require("fs");
const videoHandler = require("./video.handler");
const cacheHandler = require("./cache.handler");

async function requesthandler(req, res, next, config = {}) {
    console.log("URL:", req.url);
console.log("Cache?", isCacheRequest(req.url));
    if (isCacheRequest(req.url)) {
            return cacheHandler(req, res, config);
        }
    return videoHandler(req, res,config);

    
}


function isCacheRequest(url) {
    return url.startsWith("/stream/");
}

module.exports = requesthandler;