const path = require("path");
const fs = require("fs");
const videoHandler = require("./video.handler");
const cacheHandler = require("./cache.handler");
const progressHandler = require("./progress.handler");
const testHandler = require("./test.handler")

async function requesthandler(req, res, next, config = {}) {
    console.log(req.path);
    

    if (isProgressRequest(req)) {
        // console.log("is progress chache" + req.url);
        return progressHandler(req, res);
    }
    if(isTestRequest(req)){
        console.log("test halde");
        
        return testHandler(req,res);
    }

    if (isCacheRequest(req)) {
        // console.log("is chache" + req.url);
        // console.log(req.url);
        return cacheHandler(req, res, config);
    }

    
    

    return videoHandler(req, res, config);
}
function isCacheRequest(req) {
    return req.path.startsWith("/stream/");
}
function isTestRequest(req) {
    return req.path.startsWith("/test/");
}

function isProgressRequest(req) {
    return req.path.endsWith("/progress");
}

module.exports = requesthandler;