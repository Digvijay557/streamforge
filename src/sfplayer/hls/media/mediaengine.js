export class MediaEngine {
    constructor(video) {
        this.video = video;

        this.mediaSource = new MediaSource();
        this.video.src = URL.createObjectURL(this.mediaSource);
        this.appendQueue = Promise.resolve();

        this.readyPromise = new Promise((resolve, reject) => {
            this.mediaSource.addEventListener("sourceopen", () => {
                //console.log("🎉 MediaSource opened");
                //console.log(
                //    MediaSource.isTypeSupported(
                //        'video/mp4; codecs="avc1.4d401e,mp4a.40.2"'
                //    )
                //);

                try {
                    this.sourceBuffer = this.mediaSource.addSourceBuffer(
                        'video/mp4; codecs="avc1.4d401e,mp4a.40.2"'
                    );
                } catch (err) {
                    //console.error("[StreamForge] Failed to create SourceBuffer.");
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

    // Waits until the SourceBuffer isn't mid-operation — remove()/duration
    // changes both throw InvalidStateError if called while `updating` is true.
    #waitForUpdateEnd() {
        if (!this.sourceBuffer || !this.sourceBuffer.updating) {
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.sourceBuffer.addEventListener("updateend", resolve, { once: true });
        });
    }

    async setDuration(duration) {
        if (this.mediaSource.readyState !== "open") return;

        const oldDuration = this.mediaSource.duration;

        // Per spec: shrinking duration below the highest buffered timestamp
        // throws InvalidStateError unless the excess range is removed from
        // every SourceBuffer first, and that removal is itself async.
        if (Number.isFinite(oldDuration) && duration < oldDuration && this.sourceBuffer) {
            await this.#waitForUpdateEnd();

            await new Promise((resolve, reject) => {
                this.sourceBuffer.addEventListener("updateend", resolve, { once: true });
                this.sourceBuffer.addEventListener(
                    "error",
                    () => reject(new Error("SourceBuffer remove failed.")),
                    { once: true }
                );
                try {
                    this.sourceBuffer.remove(duration, oldDuration);
                } catch (err) {
                    reject(err);
                }
            });
        }

        if (this.mediaSource.readyState === "open") {
            this.mediaSource.duration = duration;
        }
    }

    ready() {
        return this.readyPromise;
    }

    append(data) {
        // A quality switch can arrive while the previous segment is still
        // being appended. SourceBuffer rejects concurrent appendBuffer calls,
        // which previously made switching intermittently stop all buffering.
        const append = async () => {
            await this.#waitForUpdateEnd();
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
        };

        const result = this.appendQueue.then(append, append);
        // Keep the queue usable if a bad segment fails to append; callers
        // still receive the original rejection through `result`.
        this.appendQueue = result.catch(() => {});
        return result;
    }

    setupEventListeners() {
        this.sourceBuffer.addEventListener("updateend", () => {
            //console.log("✅ updateend");
        });

        this.sourceBuffer.addEventListener("error", (e) => {
            //console.error("[StreamForge] SourceBuffer error:", e);
        });

        this.video.addEventListener("error", () => {
            //console.error("[StreamForge] Video error:", this.video.error);
        });
    }
}
