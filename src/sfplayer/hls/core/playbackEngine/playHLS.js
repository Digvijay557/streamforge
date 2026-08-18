  import { safePlay } from "../controlFunctions/controlFunctions.js";
  import request from "../util/request.js"; 
  import parsePlaylistSafe from "../util/parser.js";
  import { MediaEngine } from "../../media/mediaengine.js"
  import { SegmentLoader } from "../../media/medialoader.js"
import { SFPlayerError } from "../Errorhandling/SFPlayerError.js";

   
   export default async function playHLS(player, varientIndex, loaded){ 
         console.log("playing hls babbbyyyy");
        player.isSwitchingQuality = true;
        player.network.abortAll()
        
         const variant = player.masterPlaylist.variants?.[varientIndex];

        if (!variant || !variant.uri) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                "Master playlist has no playable variants",
                "NO_VARIANTS"
            ));
        }

        //console.log("② Requesting variant playlist");
        
        const variantResponse = await request(player,variant.uri, "variant playlist");
        const variantText = await variantResponse.text();
        const variantPlaylist = parsePlaylistSafe( player ,variantText, "variant playlist");
        
        if (!variantPlaylist.segments || variantPlaylist.segments.length === 0) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                "Variant playlist has no segments",
                "NO_SEGMENTS"
            ));
        }
        
        player.variantPlaylist = variantPlaylist;
        

        player.currentTimeline = variantPlaylist.segments;
        
        
        let totalDuration;
      
        
        
        // ==========================================================
        // Initialize Media Engine
        // ==========================================================
        
        if (!player.media) {
            try {
                if(!loaded)player.media = new MediaEngine(player.video);
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

        // ==========================================================
        // Set Total Duration on MediaSource
        // ==========================================================

         totalDuration = variantPlaylist.segments.reduce(
            (sum, seg) => sum + seg.duration, 0
        );
        
        if (typeof player.media.setDuration === "function") {
            await player.media.setDuration(totalDuration);
        } 
        
        // ==========================================================
        // Request & Append Init Segment
        // ==========================================================
        
        //console.log("③ Requesting init segment");
        
        if (!variantPlaylist.initSegment) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                "Variant playlist has no init segment",
                "NO_INIT_SEGMENT"
            ));
        }
        
        const initResponse = await request(player ,variantPlaylist.initSegment, "init segment");

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

        // ==========================================================
        // Set Up Segment Loader — reuse on quality switch, only hand
        // it the new source (player.segmentLoader.setPlaylist() removed:
        // "source" now covers both an HLS playlist and an SF manifest)
        // ==========================================================
        
        //console.log("④ Setting up Segment Loader");
       try {
    if (!player.segmentLoader) {
        player.segmentLoader = new SegmentLoader(
    player.network,
    player.media,
    (index) => {
        player.requestedSegmentIndex = index;
    },
    "hls",
    variantPlaylist
);  
    } else {
        player.segmentLoader.source = variantPlaylist;
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
        // Load First Segment
        // ==========================================================
        
        if(!loaded){
        
        //console.log("⑤ Loading first segment");
        
        player.loadedDuration = 0;
        
        const firstSegmentDuration = variantPlaylist.segments[0].duration;
        
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
        
        // ==========================================================
        // Start Playback
        // ==========================================================
        
        //console.log("⑥ Starting playback");
        
        safePlay(player);
        player.emit("qualitychange", player.qualities[varientIndex]);
    }
        
    // ==========================================================
    // Wire Up timeupdate → loadNext()
    // ==========================================================
if(!loaded){
    player.emit("ready", {
        duration: totalDuration,
        qualities: player.qualities,
        protocol: player.protocol
    });
}
    player.isSwitchingQuality = false;
    }