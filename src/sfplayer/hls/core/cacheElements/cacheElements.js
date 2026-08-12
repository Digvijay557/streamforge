export default function cacheElements() {
        this.player = this.root.querySelector(".sf-player");
        this.video = this.root.querySelector("video");
        this.controls = this.root.querySelector(".sf-controls");
        this.errorBanner = this.root.querySelector(".sf-error");
        this.progress = this.root.querySelector(".sf-progress");
        this.progressPlayed = this.root.querySelector(".sf-progress-played");
        this.progressBuffer = this.root.querySelector(".sf-progress-buffer");
        this.progressGeneration = this.root.querySelector(".sf-progress-generation");
        this.progressThumb = this.root.querySelector(".sf-progress-thumb"); 
        this.controlsBottom = this.root.querySelector(".sf-controls-bottom");
        this.controlsButtons = this.root.querySelectorAll(".c");
        this.Gprogess = this.root.querySelector(".sf-G-progress");
        this.controlsLeft = this.root.querySelector(".sf-controls-left");
        this.controlsRight = this.root.querySelector(".sf-controls-right");
        this.retryy = this.root.querySelector(".sf-retry");
        // Bug fix: #showBuffer()/#hideBuffer() referenced this.bufferLoding,
        // which was never cached — first "waiting" event would throw.
        this.bufferLoding = this.root.querySelector(".sf-buffer");
        this.playBtn = this.root.querySelector(".sf-play-btn");
        this.time = this.root.querySelector(".sf-time");
        // Bug fix: was `.speed` — no such class exists in renderHTML.js
        // (the actual element is `.speedMenu`), so this always cached
        // `null`. (Currently unused elsewhere, but fixed for correctness.)
        this.speedMenu = this.root.querySelector(".speedMenu")
        this.volumeBtn = this.root.querySelector(".sf-volume-btn");
        this.settingsBtn = this.root.querySelector(".sf-settings-btn");
        this.settingsmenu = this.root.querySelector(".settings");
        this.subControlMenus = this.root.querySelectorAll(".sub-controlsM");
        this.qualitybtn = this.root.querySelector(".sf-quality-btn");
        this.qualitiescont = this.root.querySelector(".qualities");
        this.fullscreenBtn = this.root.querySelector(".sf-fullscreen-btn");  
        this.volume = this.root.querySelector(".sf-volume");
        this.volumeSlider = this.root.querySelector(".sf-volume-slider");
        this.volumeLevel = this.root.querySelector(".sf-volume-level");
        this.speeds = this.root.querySelectorAll(".speedx")
        this.pip = this.root.querySelector('.sf-pip-btn');
    }