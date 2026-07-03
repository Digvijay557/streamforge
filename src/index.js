const requesthandler = require("./handlers/request.handler");

function streamforge(config = {}) {
    return async function (req, res, next) {
        try {
            await requesthandler(req, res, next, config);
        } catch (err) {
            next(err);
        }
    };
}

module.exports = streamforge;