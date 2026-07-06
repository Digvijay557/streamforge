function applyCors(req, res, options = {}) {
    const origin = options.origin ?? "*";

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return true;
    }

    return false;
}

module.exports = {applyCors};