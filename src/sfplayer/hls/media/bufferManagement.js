import { SegmentLoader } from "./medialoader.js"

class Buffer{
    constructor(targetbuffer,network, mediaEngine, variantplaylist){
        this.targetBuffer = targetbuffer;
        this.loader = new SegmentLoader(network, mediaEngine)
        this.variantPlaylist = variantplaylist
    }
    async addBuffer(loadedDuration){

         if (loadedDuration<this.targetBuffer){
            
            
         }
    }



}