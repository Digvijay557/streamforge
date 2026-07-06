const requesthandler = require("./handlers/request.handler");
const path = require("path");
const { applyCors } = require("./middleware/cors.js");
function streamforge(config = {}) {
    config = {
    cache: path.join(process.cwd(), ".streamforge"),
    origin: "*",
    ...config
};
    return async function (req, res, next) {
        if (applyCors(req, res, config)) {
            return;
        }

        console.log(req.url);
        try {
            await requesthandler(req, res, next, config);
        } catch (err) {
            next(err);
        }
    };
}

module.exports = streamforge;