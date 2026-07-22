// parser/variant.parser.js

import { VariantPlaylist, Segment } from "./models.js";

export function parseVariantPlaylist(lines) {
    const playlist = new VariantPlaylist();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("#EXT-X-VERSION:")) {
            parseVersion(line, playlist);
            continue;
        }

        if (line.startsWith("#EXT-X-MAP:")) {
            parseMap(line, playlist);
            continue;
        }

        if (line.startsWith("#EXTINF:")) {
            const uri = lines[i + 1];

            if (!uri) {
                throw new Error("Missing segment URI after #EXTINF");
            }

            parseSegment(line, uri, playlist);
            i++;
            continue;
        }

        if (line === "#EXT-X-ENDLIST") {
            parseEndlist(playlist);
        }
    }

    return playlist;
}

function parseVersion(line, playlist) {
    playlist.version = Number(line.split(":")[1]);
}

function parseMap(line, playlist) {

    const uri = line
        .substring(line.indexOf('URI="') + 5)
        .replace(/"$/, "");

    playlist.initSegment = uri;
}

function parseSegment(line, uri, playlist) {
    const duration = Number(
        line
            .substring(line.indexOf(":") + 1)
            .split(",")[0]
    );

    playlist.segments.push(
        new Segment({
            duration,
            uri
        })
    );
}

function parseEndlist(playlist) {
    playlist.endlist = true;
}