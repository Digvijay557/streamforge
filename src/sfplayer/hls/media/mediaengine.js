export class MediaEngine{

    constructor(video) {

        this.video = video;

        this.mediaSource = new MediaSource();

        this.video.src = URL.createObjectURL(this.mediaSource);

        this.readyPromise = new Promise((resolve) => {

            this.mediaSource.addEventListener("sourceopen", () => {

                console.log("🎉 MediaSource opened");
                console.log(
    MediaSource.isTypeSupported(
        'video/mp4; codecs="avc1.4d401e,mp4a.40.2"'
    )
);

                this.sourceBuffer = this.mediaSource.addSourceBuffer(
    'video/mp4; codecs="avc1.4d401e,mp4a.40.2"'
);

                resolve();

            });

        });

    }

    ready() {
        return this.readyPromise;
    }

    append(data) {
        return new Promise((resolve) => {
            this.sourceBuffer.addEventListener(
                "updateend",
                () => resolve(),
                { once: true }
            );

            this.sourceBuffer.appendBuffer(data);
        });
    }

    setupEventListeners() {
        this.sourceBuffer.addEventListener("updateend", () => {
            console.log("✅ updateend");
        });

        this.sourceBuffer.addEventListener("error", (e) => {
            console.log("❌ SourceBuffer Error", e);
        });

        this.video.addEventListener("error", () => {
            console.log("❌ Video Error", this.video.error);
        });
    }

}