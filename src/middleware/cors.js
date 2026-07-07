function applyCors(req, res, options = {}) {
    const origin = options.origin ?? "*";
    try{

        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }catch (err) {
    console.error("[StreamForge] Failed to apply CORS headers.");
    console.error(err);

    throw err;
}

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return true;
    }

    return false;
}

module.exports = {applyCors};