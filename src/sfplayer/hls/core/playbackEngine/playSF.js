import { safePlay } from "../controlFunctions/controlFunctions.js";
import request from "../util/request.js";
import { MediaEngine } from "../../media/mediaengine.js"
import { SegmentLoader } from "../../media/medialoader.js"
import { SFPlayerError } from "../Errorhandling/SFPlayerError.js";

export default async function playSF(player ,manifest, quality, isLoaded) {

        player.isSwitchingQuality = true;
        player.network.abortAll();

        // ==========================================================
        // ① Save manifest/protocol/quality — playQuality() and the
        //    unified timeline helpers need these on later calls
        // ==========================================================
        player.manifest = manifest;
        player.quality = quality;
        
        // ==========================================================
        // ② Unified timeline (see constructor) — replaces the
        //    HLS-only player.variantPlaylist.segments dependency
        // ==========================================================
        player.currentTimeline = manifest.segments.map(duration => ({ duration }));
        
        const totalDuration = player.currentTimeline.reduce(
            (sum, seg) => sum + seg.duration, 0
        );

        // ==========================================================
        // ③ Initialize Media Engine
        // ==========================================================
        if (!player.media) {
            try {
                if (!isLoaded) player.media = new MediaEngine(player.video);
                await player.media.ready();
            } catch (err) {
                player.media = null;
                throw player.errorHandler.handleFatalError( new SFPlayerError(
                    `Failed to initialize media engine: ${err.message}`,
                    "MEDIA_INIT_FAILURE",
                    err
                ));
            }
        }
        
        if (typeof player.media.setDuration === "function") {
            await player.media.setDuration(totalDuration);
        }

        // ==========================================================
        // ④ Request & append init segment — every quality has its
        //    own init segment, so player runs on quality switches too
        // ==========================================================
        const initResponse = await request(player,
            `/streamforge/stream/${manifest.video.name}/${quality}/init.mp4`,
            "init segment"
        );

        let initBytes;
        try {
            initBytes = await initResponse.arrayBuffer();
            await player.media.append(initBytes);
        } catch (err) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to append init segment: ${err.message}`,
                "INIT_SEGMENT_FAILURE",
                err
            ));
        }

        player.currentController = null;
        
        // ==========================================================
        // ⑤ Set up / reuse Segment Loader — never recreate it on a
        //    quality switch, just hand it the new quality
        // ==========================================================
        try {
            if (!player.segmentLoader) {
                player.segmentLoader = new SegmentLoader(
                    player.network,
                    player.media,
                    (index) => {
                        player.requestedSegmentIndex = index;
                    },
                    "sf",
                    manifest,
                    quality
                );
            } else {
                player.segmentLoader.quality = quality;
            }

            player.segmentLoader.seekToSegment(player.segmentLoader.currentSegment);
        } catch (err) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                `Failed to initialize segment loader: ${err.message}`,
                "SEGMENT_LOADER_INIT_FAILURE",
                err
            ));
        }

        // ==========================================================
        // ⑥ Load first segment — only on initial playback, never on
        //    a quality switch. currentSegment is untouched, so the
        //    next #onTimeUpdate() tick's loadNext() will re-request
        //    that same index, now at the new quality — no extra code.
        // ==========================================================
        if (!isLoaded) {

            player.loadedDuration = 0;

            const firstSegmentDuration = player.currentTimeline[0].duration;

            let firstLoaded;
            try {
                firstLoaded = await player.segmentLoader.loadNext();
            } catch (err) {
                throw player.errorHandler.handleFatalError( new SFPlayerError(
                    `Failed to load first segment: ${err.message}`,
                    "SEGMENT_LOAD_FAILURE",
                    err
                ));
            }

            if (firstLoaded) {
                player.loadedDuration += firstSegmentDuration;
            } else {
                throw player.errorHandler.handleFatalError( new SFPlayerError(
                    "First segment failed to load",
                    "SEGMENT_LOAD_FAILURE"
                ));
            }

            safePlay(player);
            player.emit("qualitychange", player.qualities.find(q => q.quality === quality));
        }
        
    if (!isLoaded) {
    player.emit("ready", {
        duration: totalDuration,
        qualities: player.qualities,
        protocol: player.protocol
    });
}
        player.isSwitchingQuality = false;
    }