const path = require("path");
const fs = require("fs");
const videoHandler = require("./video.handler");
const cacheHandler = require("./cache.handler");
const progressHandler = require("./progress.handler");

async function requesthandler(req, res, next, config = {}) {

    if (isProgressRequest(req)) {
        return progressHandler(req, res);
    }

    if (isCacheRequest(req)) {
        return cacheHandler(req, res, config);
    }

    return videoHandler(req, res, config);
}
function isCacheRequest(req) {
    return req.path.startsWith("/stream/");
}

function isProgressRequest(req) {
    return req.path.endsWith("/progress");
}

module.exports = requesthandler;