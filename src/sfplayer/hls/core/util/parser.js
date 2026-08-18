    import  {SFPlayerError}  from "../Errorhandling/SFPlayerError.js";
    import {parsePlaylist} from "../../parser/Parser.js"
    
    export default function parsePlaylistSafe( player,  text, context) {
        try {
            return parsePlaylist(text);
        } catch (err) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to parse ${context}: ${err.message}`,
                "PARSE_FAILURE",
                err
            ));
        }
    }