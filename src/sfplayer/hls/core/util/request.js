import { SFPlayerError } from "../Errorhandling/SFPlayerError.js";


export default async function request(player,url, context, timeoutMs) {
    if (!url) {
        throw player.errorHandler.handleFatalError( new SFPlayerError(
            `Missing URL while requesting ${context}`,
            "NO_SOURCE"
        ));
    }

    let response, controller;

    try {
        if (player.currentController) {
            player.network.abort(player.currentController);
        }

       
        
        ({ response, controller } = await player.network.request(url, timeoutMs));

        player.currentController = controller;
    } catch (err) {
        throw player.errorHandler.handleFatalError( new SFPlayerError(
            `Network request failed while requesting ${context}: ${err.message}`,
            "NETWORK_FAILURE",
            err
        ));
    }

    if (response && !response.ok) {
        throw player.errorHandler.handleFatalError( new SFPlayerError(
            `Server returned an error (${response.status}) while requesting ${context}`,
            "HTTP_ERROR"
        ));
    }

    return response;
}