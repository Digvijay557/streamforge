export default function renderHTML() {
        return `
            <div class="sf-player">

    <div class="sf-error hidden"></div>

    <video></video>

    <div class="sf-buffer hidden">
        Loading...
    </div>
    <div class="sf-G-progress hidden">
        
    </div>



    <div class="sf-retry hidden">
        Retry
    </div>

    <div class="sf-controls">

        <div class="sf-progress">
            <div class="sf-progress-generation"></div>
            <div class="sf-progress-buffer"></div>
            <div class="sf-progress-played"></div>
            <div class="sf-progress-thumb"></div>
        </div>

        <div class="sf-controls-bottom">

            <div class="sf-controls-left">

                <button class="sf-play-btn">
                    ▶
                </button>

                <span class="sf-time">
                    00:00 / 00:00
                </span>

            </div>

            <div class="sf-controls-right">

                <div class="sf-volume">

    <button class="sf-volume-btn">
        🔊
    </button>

    <div class="sf-volume-slider">

        <div class="sf-volume-level"></div>

    </div>

</div>
                <div class="sf-settings-wrap">
                    <button class="sf-settings-btn">⚙</button>

                    <div class="settings">
                        <div class="controls">
                            <button class="sf-quality-btn c" data-rmenu = "qualities">♾️ Quality</button>
                            <button class="sf-speed-btn c" data-rmenu = "speedMenu">🚅 Speed</button>
                            <button class="sf-pip-btn">🥕 Pic-in-Pic (PiP)</button>
                        </div>
                        <div class="sub-controls">
                            <div class="qualities sub-controlsM">
                                <div class="quality"></div>
                            </div>
                            <div class="speedMenu sub-controlsM" >
                                <div class="speedx" data-speed = "2">2x</div>
                                <div class="speedx" data-speed = "1.75">1.75x</div>
                                <div class="speedx" data-speed = "1.5">1.5x</div>
                                <div class="speedx" data-speed = "1.25">1.25x</div>
                                <div class="speedx" data-speed = "1">1x</div>
                                <div class="speedx" data-speed = "0.75">0.75x</div>
                                <div class="speedx" data-speed = "0.5">0.5x</div>
                                <div class="speedx" data-speed = "0.25">0.25x</div>
                            </div>
                        </div>
                    </div>
                
                </div>

                <button class="sf-fullscreen-btn">
                    ⛶
                </button>

            </div>

        </div>

    </div>

</div>
        `;
    }