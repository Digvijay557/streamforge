// parser/master.parser.js

import { MasterPlaylist, VariantStream } from "./models.js";

export function parseMasterPlaylist(lines) {
    const playlist = new MasterPlaylist();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("#EXT-X-VERSION:")) {
            parseVersion(line, playlist);
            continue;
        }

        if (line.startsWith("#EXT-X-STREAM-INF:")) {
            const uri = lines[++i];
            parseStreamInf(line, uri, playlist);
        }
    }

    return playlist;
}

function parseVersion(line, playlist) {
    playlist.version = Number(line.split(":")[1]);
}

function parseStreamInf(line, uri, playlist) {
    const attributes = parseAttributes(line);

    playlist.variants.push(
        new VariantStream({
            bandwidth: Number(attributes.BANDWIDTH),
            resolution: attributes.RESOLUTION ?? null,
            uri
        })
    );
}

function parseAttributes(line) {
    const attributeString = line.substring(line.indexOf(":") + 1);

    const attributes = {};

    for (const pair of attributeString.split(",")) {
        const [key, value] = pair.split("=");
        attributes[key] = value;
    }

    return attributes;
}