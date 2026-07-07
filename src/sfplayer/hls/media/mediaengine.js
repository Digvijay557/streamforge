export class MediaEngine {
    constructor(video) {
        this.video = video;

        this.mediaSource = new MediaSource();
        this.video.src = URL.createObjectURL(this.mediaSource);

        this.readyPromise = new Promise((resolve, reject) => {
            this.mediaSource.addEventListener("sourceopen", () => {
                console.log("🎉 MediaSource opened");
                console.log(
                    MediaSource.isTypeSupported(
                        'video/mp4; codecs="avc1.4d401e,mp4a.40.2"'
                    )
                );

                try {
                    this.sourceBuffer = this.mediaSource.addSourceBuffer(
                        'video/mp4; codecs="avc1.4d401e,mp4a.40.2"'
                    );
                } catch (err) {
                    console.error("[StreamForge] Failed to create SourceBuffer.");
                    throw err;
                }

                resolve();
            });

            this.mediaSource.addEventListener(
                "error",
                (err) => {
                    reject(err);
                },
                { once: true }
            );
        });
    }

    setDuration(duration) {
        if (this.mediaSource.readyState === "open") {
            this.mediaSource.duration = duration;
        }
    }

    ready() {
        return this.readyPromise;
    }

    append(data) {
        return new Promise((resolve, reject) => {
            this.sourceBuffer.addEventListener("updateend", resolve, { once: true });

            this.sourceBuffer.addEventListener(
                "error",
                () => {
                    reject(new Error("SourceBuffer append failed."));
                },
                { once: true }
            );

            try {
                this.sourceBuffer.appendBuffer(data);
            } catch (err) {
                reject(err);
            }
        });
    }

    setupEventListeners() {
        this.sourceBuffer.addEventListener("updateend", () => {
            console.log("✅ updateend");
        });

        this.sourceBuffer.addEventListener("error", (e) => {
            console.error("[StreamForge] SourceBuffer error:", e);
        });

        this.video.addEventListener("error", () => {
            console.error("[StreamForge] Video error:", this.video.error);
        });
    }
}