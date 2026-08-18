import playSF from "./playSF.js";
import playHLS from "./playHLS.js";
import playNative from "./playNative.js";
import { SFPlayerError } from "../Errorhandling/SFPlayerError.js";

export default async function playRouter(env) {
        const { player ,index, status, protocol, quality, video, manifest } = env;
        console.log("proto:   " + protocol);
  

        if (protocol === "hls") {

            await playHLS(player ,index, status);
        
        
        }else {
            console.log("ueeeuwuwu");
            
            await playSF(
                player,
                manifest,
                quality,
                status
            );

        }

}