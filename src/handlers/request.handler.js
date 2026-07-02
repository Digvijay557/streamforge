const { exists } = require("../storage/local.storage")

function requesthandler(req, res, config = {}){
    const streamingStatus = exists()
}