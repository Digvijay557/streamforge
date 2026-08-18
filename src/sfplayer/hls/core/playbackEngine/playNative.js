import { Streamforge } from "../streamforge.js";

import { safePlay } from "../controlFunctions/controlFunctions.js";
export default function playNative(player, video, quality) {
    console.log("playing native babbbyyyy");
    console.log("Quality:", quality);

    const url =
        `${Streamforge.endpoint}/streamforge/stream/${video.split(".")[0]}/${quality}/index.m3u8`;
        console.log(url);
        

    console.log("Changing URL:", url);

    try {
        player.video.pause();

        player.video.src = url;

        player.video.load();

        player.video.play()
            .catch(err => {
                console.error("Play failed:", err);
            });

    } catch (err) {
        console.error("Can't change source:", err);
    }
}