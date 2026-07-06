// parser/parser.js

import { parseMasterPlaylist } from "./master.parser.js";
import { parseVariantPlaylist } from "./variant.parser.js";

/**
 * Parse an HLS playlist.
 * Delegates parsing to either the master or variant parser.
 *
 * @param {string} text
 * @returns {MasterPlaylist | VariantPlaylist}
 */
export function parsePlaylist(text) {
    if (typeof text !== "string") {
        throw new TypeError("Playlist must be a string.");
    }

    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) {
        throw new Error("Playlist is empty.");
    }

    if (lines[0] !== "#EXTM3U") {
        throw new Error("Invalid HLS playlist. Missing #EXTM3U header.");
    }

    function detectPlaylistType(lines) {
    for (const line of lines) {
        if (line.startsWith("#EXT-X-STREAM-INF")) {
            return "master";
        }
    }
    return "variant";}
    const type = detectPlaylistType(lines);

return type === "master"
    ? parseMasterPlaylist(lines)
    : parseVariantPlaylist(lines);

}