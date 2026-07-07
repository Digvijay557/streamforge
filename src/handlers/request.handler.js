const path = require("path");
const fs = require("fs");
const videoHandler = require("./video.handler");
const cacheHandler = require("./cache.handler");

async function requesthandler(req, res, next, config = {}) {

    if (isCacheRequest(req.url)) {
            return cacheHandler(req, res, config);
        }
    return videoHandler(req, res,config);

    
}
function isCacheRequest(url) {
    if (!url) return false;
    return url.startsWith("/stream/");
}

module.exports = requesthandler;