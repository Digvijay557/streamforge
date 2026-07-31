export function checkBrowserSupport() {
    
    if (typeof window === "undefined") {
        return {
            supported: false,
            playback: {
                nativeHLS: false,
                mediaSource: false
            },
            codecs: {
                h264: false,
                aac: false
            }
        };
    }

    const video = document.createElement("video");


    const nativeHLS = video.canPlayType(
        "application/vnd.apple.mpegurl"
    ) !== "";

 
    const mediaSource = typeof MediaSource !== "undefined";

    // Codec support
    const h264 = mediaSource
        ? MediaSource.isTypeSupported(
              'video/mp4; codecs="avc1.42E01E"'
          )
        : false;

    const aac = mediaSource
        ? MediaSource.isTypeSupported(
              'audio/mp4; codecs="mp4a.40.2"'
          )
        : false;

    const supported =
        nativeHLS || (mediaSource && h264 && aac);

    return {
        supported,
        playback: {
            nativeHLS,
            mediaSource
        },
        codecs: {
            h264,
            aac
        }
    };
}