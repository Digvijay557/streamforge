  export default function detectNativeHLS(url, timeout = 5000) {
    return new Promise((resolve) => {
        const video = document.createElement("video");

        let finished = false;

        const cleanup = (supported) => {
            if (finished) return;
            finished = true;

            clearTimeout(timer);

            video.pause();
            video.removeAttribute("src");
            video.load();

            video.onloadedmetadata = null;
            video.onerror = null;
            video.oncanplay = null;
            resolve(supported);
        };

        const timer = setTimeout(() => {
            cleanup(false);
        }, timeout);

        video.oncanplay = () => {
            cleanup(true);
        };

        video.onerror = () => {
            cleanup(false);
        };

        video.src = url;
    });
}