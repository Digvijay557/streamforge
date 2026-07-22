const fsp = require("fs/promises");
const { parsePlaylist } = require("./parser/Parser");
const path = require("path");

const DEBUG = true; // toggle via env var
// function //log(...args) {
//     if (DEBUG) console.//log("[validate]", ...args);
// }

async function validate(videoPath) {
    try {
        //log("start", { videoPath });

        const videoStats = await fsp.stat(videoPath);
        if (!videoStats.isDirectory()) {
            //log("FAIL: videoPath is not a directory", videoPath);
            return false;
        }
        //log("videoPath dir OK", videoPath);

        const masterPath = path.join(videoPath, "master.m3u8");
        const masterStats = await fsp.stat(masterPath);
        if (!masterStats.isFile()) {
            //log("FAIL: master.m3u8 missing", masterPath);
            return false;
        }
        //log("master.m3u8 found", masterPath);

        const content = await fsp.readFile(masterPath, "utf8");
        const playlist = parsePlaylist(content);
        //log("master playlist parsed", { variantCount: playlist.variants?.length });

        for (const variant of playlist.variants) {
            //log("checking variant", variant.uri);
            const variantPath = uriToCachePath(variant.uri);
            //log("  -> resolved path", variantPath);

            const variantstats = await fsp.stat(variantPath);
            if (!variantstats.isFile()) {
                //log("FAIL: variant playlist missing", variantPath);
                return false;
            }

            const variantContent = await fsp.readFile(variantPath, "utf8");
            const variantPlaylist = parsePlaylist(variantContent);
            //log("  variant playlist parsed", { segmentCount: variantPlaylist.segments?.length, initSegment: variantPlaylist.initSegment });

            const initPath = uriToCachePath(variantPlaylist.initSegment);
            const initStats = await fsp.stat(initPath);
            if (!initStats.isFile()) {
                //log("FAIL: init segment missing", initPath);
                return false;
            }
            //log("  init segment OK", initPath);

            for (const segment of variantPlaylist.segments) {
    const segmentPath = uriToCachePath(segment.uri);

    const segmentStats = await fsp.stat(segmentPath);

    if (!segmentStats.isFile()) {
        //log("FAIL: segment missing", segmentPath);
        return false;
    }
}
            //log("  all segments OK for variant", variant.uri);
        }

        //log("PASS: validation successful");
        return true;
    } catch (err) {
        //log("EXCEPTION during validation", err.message, err.stack);
        return false;
    }
}

function uriToCachePath(uri) {
    const [, , , videoName, ...rest] = uri.split("/");
    const resolved = path.join(".streamforge", videoName, ...rest);
    if (DEBUG) //console.//log("[uriToCachePath]", { uri, videoName, rest, resolved });
    //console.//log(resolved);
    return resolved;
}

module.exports = {
    validate
};