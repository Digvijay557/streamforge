// ==========================================================
// Playback Control
// ==========================================================

import { SFPlayerError } from "../Errorhandling/SFPlayerError.js";
import playRouter from "../playbackEngine/playRouter.js";
import playQuality from "../playbackEngine/playStreamer.js";
// import {Gprogess} from "../cacheElements/cacheElements.js"
export function togglePlay(player) {
    if (player.video.paused) {
        safePlay(player);
    } else {
        player.video.pause();
    }
}

export function safePlay(player) {
    let playPromise;

    try {
        player.video.playbackRate = player.playbackSpeed;
        playPromise = player.video.play();
    } catch (err) {
        player.errorHandler.handleFatalError(
            new SFPlayerError(`Playback failed to start: ${err.message}`, "PLAYBACK_FAILURE", err)
        );
        return;
    }

    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(err => {
            if (err.name !== "AbortError") {
                player.errorHandler.handleFatalError(
                    new SFPlayerError(`Playback failed: ${err.message}`, "PLAYBACK_FAILURE", err)
                );
            }
        });
    }
}

// ==========================================================
// Progress / Time / Buffer UI
// ==========================================================

export function updateProgress(player) {
    const current = player.video.currentTime;
    const duration = player.video.duration;

    const percent = (Number.isFinite(duration) && duration > 0)
        ? (current / duration) * 100
        : 0;

    player.progressPlayed.style.width = `${percent}%`;
    player.progressThumb.style.left = `${percent}%`;

    player.time.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

export function updateBuffer(player) {
    const duration = player.video.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
        player.progressBuffer.style.width = "0%";
        return;
    }

    let bufferEnd = 0;

    for (let i = 0; i < player.video.buffered.length; i++) {
        const start = player.video.buffered.start(i);
        const end = player.video.buffered.end(i);

        if (player.video.currentTime >= start && player.video.currentTime <= end) {
            bufferEnd = end;
            break;
        }
    }

    const percent = (bufferEnd / duration) * 100;
    player.progressBuffer.style.width = `${percent}%`;
}

export function showBuffer(player) {
    if (!player.bufferLoding.classList.contains("hidden")) return;
    player.bufferLoding.classList.remove("hidden");
}

export function hideBuffer(player) {
    if (!player.bufferLoding.classList.contains("hidden")) {
        player.bufferLoding.classList.add("hidden");
    }
}

export function updateGeneration(player) {

    console.log("🔥 GENERATION UPDATE");

    const progress = player.generationprogress;

    if (!progress) {
        console.log("❌ No generation progress");
        return;
    }

    const percent = Number(progress.percent) || 0;

    console.log("Stage:", progress.stage);
    console.log("Percent:", percent);
    console.log("Quality:", progress.quality);

    // ----------------------------------------------------------
    // Show UI
    // ----------------------------------------------------------

    if (player.Gprogess) {
        player.Gprogess.classList.remove("hidden");

        player.Gprogess.textContent =
            `${progress.stage || "Processing"} ${progress.quality ?? 0}p`;
    }

    if (player.progressGeneration) {
        player.progressGeneration.classList.remove("hidden");

        player.progressGeneration.style.width =
            `${Math.min(100, Math.max(0, percent))}%`;
    }

    // ----------------------------------------------------------
    // Generation finished
    // ----------------------------------------------------------

    if (percent >= 100) {

        console.log("✅ Generation finished");

        setTimeout(() => {

            if (player.progressGeneration) {
                player.progressGeneration.classList.add("hidden");
                player.progressGeneration.style.width = "0%";
            }

            if (player.Gprogess) {
                player.Gprogess.classList.add("hidden");
            }

            if (player.progressSource) {
                player.progressSource.close();
                player.progressSource = null;
            }

        }, 1000);
    }
}

// ==========================================================
// Seeking Logic
// ==========================================================

export function findSegmentIndexForTime(player, time) {
    if (!player.currentTimeline || !player.currentTimeline.length) {
        return 0;
    }

    let elapsed = 0;
    const segments = player.currentTimeline;

    for (let i = 0; i < segments.length; i++) {
        elapsed += segments[i].duration;
        if (time < elapsed) return i;
    }
    return segments.length - 1;
}

export function isBuffered(player, time) {
    const buffered = player.video.buffered;
    for (let i = 0; i < buffered.length; i++) {
        if (time >= buffered.start(i) && time <= buffered.end(i)) {
            return true;
        }
    }
    return false;
}

export async function performSeek(player, targetTime) {
    const duration = player.video.duration;

    if (!isFinite(duration) || duration <= 0 || !isFinite(targetTime)) {
        return;
    }

    targetTime = Math.max(0, Math.min(targetTime, duration));

    if (isBuffered(player, targetTime)) {
        player.internalSeek = true;
        player.video.currentTime = targetTime;
        return;
    }

    if (!player.segmentLoader || player.segmentLoader.loading) {
        return;
    }

    setSeekingUI(player, true);

    try {
        const targetIndex = findSegmentIndexForTime(player, targetTime);
        player.segmentLoader.seekTo(targetIndex);

        const loaded = await player.segmentLoader.loadNext();

        if (loaded) {
            let total = 0;
            for (let i = 0; i < player.segmentLoader.currentSegment; i++) {
                total += player.currentTimeline[i]?.duration || 0;
            }
            player.loadedDuration = total;
            player.internalSeek = true;
            player.video.currentTime = targetTime;
            emit(player, "seeked", { previousTime: player.video.currentTime, time: targetTime });
        } else {
            player.errorHandler.handleFatalError(
                new SFPlayerError("Seek failed — could not load target segment", "SEEK_FAILURE")
            );
        }
    } catch (err) {
        player.errorHandler.handleFatalError(
            new SFPlayerError(`Seek failed: ${err.message}`, "SEEK_FAILURE", err)
        );
    } finally {
        setSeekingUI(player, false);
    }
}

export async function seek(player, event) {
    const rect = player.progress.getBoundingClientRect();
    const x = event.clientX - rect.left;

    if (rect.width === 0 || !isFinite(player.video.duration) || player.video.duration <= 0) {
        return;
    }

    const percent = Math.max(0, Math.min(x / rect.width, 1));
    const targetTime = percent * player.video.duration;
    const targetIndex = findSegmentIndexForTime(player, targetTime);

    if (targetIndex !== player.requestedSegmentIndex) {
        player.network.abort(player.currentController);
    }

    try {
        await performSeek(player, targetTime);
    } catch (err) {
        // Handled internally
    }
}

export function setSeekingUI(player, isSeeking) {
    player.classList.toggle("sf-seeking", isSeeking);
}

export function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ==========================================================
// Volume & Fullscreen & PiP
// ==========================================================

export function toggleMute(player) {
    player.video.muted = !player.video.muted;
    updateVolumeUI(player);
}

export function setVolume(player, e) {
    const rect = player.volumeSlider.getBoundingClientRect();
    if (rect.width === 0) return;

    let percent = (e.clientX - rect.left) / rect.width;
    percent = Math.max(0, Math.min(1, percent));

    player.video.volume = percent;
    player.video.muted = false;
    updateVolumeUI(player);
}

export function updateVolumeUI(player) {
    const volume = player.video.muted ? 0 : player.video.volume;
    player.volumeLevel.style.width = `${volume * 100}%`;
}

export function toggleFullscreen(player) {
    try {
        if (!document.fullscreenElement) {
            const req = player.requestFullscreen();
            if (req && typeof req.catch === "function") req.catch(() => {});
        } else {
            const exit = document.exitFullscreen();
            if (exit && typeof exit.catch === "function") exit.catch(() => {});
        }
    } catch (err) {
        // Fallback
    }
}

export async function picinpic(player) {
    if (!document.pictureInPictureEnabled) {
        // Bug fix: was `player.pipButton`, which is never cached anywhere
        // (cacheElements.js caches it as `player.pip`) — so this never
        // actually disabled the button when PiP wasn't supported.
        if (player.pip) player.pip.disabled = true;
        return;
    }

    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await player.video.requestPictureInPicture();
        }
    } catch (err) {
        // Handled
    }
}

// ==========================================================
// Controls Visibility & Events
// ==========================================================

export function showControls(player) {
    player.controls.classList.remove("hidden");
}

export function hideControls(player) {
    if (!player.video.paused) {
        player.controls.classList.add("hidden");
    }
}

export function insertQualities(player) {
    
    player.qualitiescont.innerHTML = player.qualities
        .map(chunk => `<div class="quality" data-index="${chunk.index}">${chunk.quality}p</div>`)
        .join("");

    const qualities = player.root.querySelectorAll(".quality");
    console.log("awdau: "+ player.protocol);
    qualities.forEach(q => {
        q.addEventListener("click", () => {
            // console.log("aswdad"+ );
            
           playRouter({
    player,
    index: Number(q.dataset.index),
    status: true,
    protocol: player.protocol,
    quality: player.qualities[Number(q.dataset.index)].quality,
    video: player.getAttribute("video"),   // ✅ string, matches what playNative expects
    manifest: player.manifest
}).catch((err) => {
    console.error("Quality switch failed:", err);   // also stop swallowing errors silently while debugging
});      
            ;
        });
    });
}

export function resetControlsTimer(player) {
    clearTimeout(player.controlsTimeout);
    showControls(player);

    player.controlsTimeout = setTimeout(() => {
        hideControls(player);
    }, 2000);
}

export function handleKeyboard(player, event) {
    const tag = document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    switch (event.key) {
        case " ":
            event.preventDefault();
            togglePlay(player);
            break;
        case "ArrowLeft":
            performSeek(player, player.video.currentTime - 5).catch(() => {});
            break;
        case "ArrowRight":
            performSeek(player, player.video.currentTime + 5).catch(() => {});
            break;
        case "ArrowUp":
            event.preventDefault();
            player.video.volume = Math.min(player.video.volume + 0.1, 1);
            updateVolumeUI(player);
            break;
        case "ArrowDown":
            event.preventDefault();
            player.video.volume = Math.max(player.video.volume - 0.1, 0);
            updateVolumeUI(player);
            break;
        case "m":
        case "M":
            toggleMute(player);
            break;
        case "f":
        case "F":
            toggleFullscreen(player);
            break;
    }
}

export function emit(player, event, detail = {}) {
    // Dispatch on the player element itself so consumers can just do
    // playerEl.addEventListener(event, ...) like any other DOM element —
    // matches SFPlayer.emit() in sfplayer.js. (Previously targeted
    // `player.events`, an internal EventTarget nothing outside this
    // module ever listened on, so these dispatches were unobservable.)
    if (typeof player?.dispatchEvent !== "function") return;
    player.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
}