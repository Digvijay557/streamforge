import request from '../util/request.js'; 
import parsePlaylistSafe from '../util/parser.js'
import detectNativeHLS from '../util/detectNative.js'
import { insertQualities, updateGeneration } from '../controlFunctions/controlFunctions.js';
import { Streamforge } from '../streamforge.js';

let protocol;

 export default async function getENV(player) {
        player.network.abortAll()

        
        const video = player.getAttribute("video");
        // console.log("awdjajd" + video.name);
        
        
        
        if (!video) {
            throw player.errorHandler.handleFatalError( new SFPlayerError(
                "No 'video' attribute set on <sf-player>",
                "NO_SOURCE"
            ));
        }
        
        // ==========================================================
        // Request Master Playlist
        // ==========================================================

  
        if (player.progressSource) {
    player.progressSource.close();

    
}

const nativeHLS = await detectNativeHLS(
    `${Streamforge.endpoint}/streamforge/test/master.m3u8`)
let change;

console.log("nativity: " + nativeHLS);


    if(nativeHLS){
        player.emit("backendchange", {backend: "Native"})
        change = `${video.split(".")[0]}-native.mp4` 
    }else{
        change = video;
        player.emit("backendchange", {backend: "Streamforge"})
    }
    console.log("change" + change);
    


    player.progressSource = player.network.progress(video, (progress) => {
            player.generationprogress = progress;
            updateGeneration(player);
});
    
        const Responce = await request(player, change, "master playlist", player.MASTER_PLAYLIST_TIMEOUT);
        const contentType = Responce.headers.get("Content-Type")
        switch (contentType) {
            case "application/vnd.streamforge.manifest+json": {
                console.log("SFFFFFF");
                
                player.protocol = "sf";
                const manifest = await Responce.json();
                player.qualities = manifest.qualities.map((q, i) => ({
                    index: i,
                    quality: q.id,
            
                }));
        
        insertQualities(player);
        player.manifest = manifest;
        player.protocol = "sf"
        break;
    }
    
    case "application/vnd.apple.mpegurl": {
 
        player.protocol = "hls";
        const playlist = await Responce.text();
        const parsed = parsePlaylistSafe(player ,playlist, "master playlist");
        player.masterPlaylist = parsed;
        player.qualities = parsed.qualities.map((q, i) => ({
        index: i,
        quality: q
        }));
        insertQualities(player);
        player.protocol = "hls"
        break;
    }
    default:
        console.error("Unsupported:", contentType);
    throw player.errorHandler.handleFatalError( new Error("Unsupported protocol"));
    }
    console.log("uwuw" + protocol);
    
    return{
        player: player,
        index: 0,
        protocol: player.protocol,
        status: false,
        quality: player.qualities[0].quality,
        video: video,
        manifest: player.manifest
    }
    
}