export default function renderStyles() {
    return `
    <style>

    /* ==========================================================
       ROOT
    ========================================================== */

    :host {
        --sf-accent: #FBBF24;
        --sf-accent-dim: #FBBF2433;
        --sf-accent-glow: #FBBF2455;
        --sf-bg: #0a0a0a;
        --sf-radius: 16px;
        --sf-transition: .2s cubic-bezier(.4,0,.2,1);

        display: block;
        width: 100%;

        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            sans-serif;
    }

    * {
        box-sizing: border-box;
    }


    /* ==========================================================
       PLAYER
    ========================================================== */

    .sf-player {
        position: relative;

        width: 100%;
        aspect-ratio: 16 / 9;

        background:
            radial-gradient(
                120% 120% at 50% 0%,
                #161616 0%,
                #0a0a0a 70%
            );

        border-radius: var(--sf-radius);
        overflow: hidden;

        display: flex;
        flex-direction: column;

        box-shadow:
            0 12px 40px rgba(0,0,0,.5),
            0 0 0 1px rgba(255,255,255,.06);
    }


    /* ==========================================================
       VIDEO
    ========================================================== */

    video {
        position: absolute;

        inset: 0;

        display: block;

        width: 100%;
        height: 100%;

        background: #000;

        object-fit: contain;

        z-index: 1;
    }


    /* ==========================================================
       CONTROLS
    ========================================================== */

    .sf-controls {
        position: absolute;

        left: 0;
        right: 0;
        bottom: 0;

        z-index: 20;

        display: flex;
        flex-direction: column;

        background:
            linear-gradient(
                to top,
                rgba(0,0,0,.85),
                rgba(0,0,0,.4) 65%,
                transparent
            );

        color: white;

        opacity: 1;

        transition:
            opacity .25s ease;
    }

    .sf-controls.hidden {
        opacity: 0;
        pointer-events: none;
    }

    .sf-controls-bottom {
        display: flex;

        justify-content: space-between;
        align-items: center;

        padding: 8px 16px 16px;
    }

    .sf-controls-left,
    .sf-controls-right {
        display: flex;

        align-items: center;

        gap: 14px;
    }


    /* ==========================================================
       PROGRESS BAR
    ========================================================== */

    .sf-progress {
        position: relative;

        width: 100%;
        height: 4px;

        background: rgba(255,255,255,0);

        cursor: pointer;

        transition:
            height var(--sf-transition),
            background var(--sf-transition);
    }

    .sf-progress:hover {
        height: 7px;

        background: rgba(255,255,255,.45);
    }


    /* ---------- Buffer ---------- */

    .sf-progress-buffer {
        position: absolute;

        top: 0;
        left: 0;

        width: 0%;
        height: 100%;

        background: rgba(255,255,255,.7);

        border-radius: 5px;

        z-index: 1;

        transition:
            width .3s linear;
    }


    /* ---------- Generation ---------- */

  .sf-progress-generation {
    position: absolute;
    top: 0;
    left: 0;

    height: 100%;
    width: 0%;

    background: #7C3AED;

    z-index: 10;

    border-radius: 5px;

    transition:
        width 250ms linear,
        opacity 250ms ease;
}

    .sf-progress-generation.hidden {
    opacity: 0;
    visibility: hidden;
}



    /* ---------- Played ---------- */

    .sf-progress-played {
        position: absolute;

        top: 0;
        left: 0;

        width: 0%;
        height: 100%;

        background: var(--sf-accent);

        box-shadow:
            0 0 8px var(--sf-accent-glow);

        border-radius: 5px;

        z-index: 3;
    }


    /* ---------- Thumb ---------- */

    .sf-progress-thumb {
        position: absolute;

        top: 50%;
        left: 0%;

        width: 13px;
        height: 13px;

        border-radius: 50%;

        background: var(--sf-accent);

        box-shadow:
            0 0 0 5px var(--sf-accent-dim),
            0 0 10px var(--sf-accent-glow);

        transform:
            translate(-50%, -50%)
            scale(0);

        transition:
            transform var(--sf-transition);

        z-index: 4;

        pointer-events: none;
    }

    .sf-progress:hover .sf-progress-thumb {
        transform:
            translate(-50%, -50%)
            scale(1);
    }


    /* ==========================================================
       BUTTONS
    ========================================================== */

    button {
        background: transparent;

        border: none;

        color: white;

        cursor: pointer;

        font-size: 18px;

        display: flex;

        align-items: center;
        justify-content: center;

        padding: 6px;

        border-radius: 8px;

        opacity: .9;

        transition:
            opacity var(--sf-transition),
            background var(--sf-transition),
            transform var(--sf-transition);
    }

    button:hover:not(:disabled) {
        opacity: 1;

        background: rgba(255,255,255,.1);

        transform: scale(1.08);
    }

    button:active:not(:disabled) {
        transform: scale(.92);
    }

    button:focus-visible {
        outline:
            2px solid var(--sf-accent);

        outline-offset: 2px;
    }

    button:disabled {
        opacity: .4;

        cursor: not-allowed;
    }


    /* ==========================================================
       TIME
    ========================================================== */

    .sf-time {
        font-size: 13px;

        font-variant-numeric: tabular-nums;

        opacity: .85;

        letter-spacing: .2px;
    }


    /* ==========================================================
       VOLUME
    ========================================================== */

    .sf-volume {
        display: flex;

        align-items: center;

        gap: 8px;
    }

    .sf-volume-slider {
        width: 80px;
        height: 4px;

        background: rgba(255,255,255,.2);

        border-radius: 999px;

        cursor: pointer;

        overflow: hidden;
    }

    .sf-volume-level {
        width: 100%;
        height: 100%;

        background: var(--sf-accent);

        box-shadow:
            0 0 6px var(--sf-accent-glow);

        border-radius: 999px;
    }


    /* ==========================================================
       ERROR
    ========================================================== */

    .sf-error {
        position: absolute;

        top: 0;
        left: 0;
        right: 0;

        z-index: 100;

        padding: 10px 14px;

        background:
            rgba(185,28,28,.85);

        backdrop-filter:
            blur(6px);

        -webkit-backdrop-filter:
            blur(6px);

        color: white;

        font-size: 13px;

        line-height: 1.4;

        border-bottom:
            1px solid rgba(255,255,255,.15);
    }

    .sf-error.hidden {
        display: none;
    }


    /* ==========================================================
       SETTINGS
    ========================================================== */

    .settings {
        position: absolute;

        bottom: 60px;
        right: 12px;

        z-index: 50;

        width: 200px;

        display: flex;

        gap: 10px;

        opacity: 0;

        visibility: hidden;

        transform:
            translateY(8px)
            scale(.97);

        transform-origin:
            bottom right;

        transition:
            opacity .2s ease,
            transform .2s cubic-bezier(.34,1.56,.64,1),
            visibility .2s ease;
    }

    .settings.show {
        opacity: 1;

        visibility: visible;

        transform:
            translateY(0)
            scale(1);
    }


    /* ==========================================================
       SETTINGS PANELS
    ========================================================== */

    .speedMenu,
    .qualities,
    .controls {
        background:
            rgba(24,24,24,.45);

        backdrop-filter:
            blur(16px)
            saturate(160%);

        -webkit-backdrop-filter:
            blur(16px)
            saturate(160%);

        border:
            1px solid rgba(255,255,255,.1);

        border-radius: 12px;

        padding: 10px;

        box-shadow:
            0 16px 40px rgba(0,0,0,.55),
            0 0 0 1px rgba(255,255,255,.04) inset;
    }


    /* ==========================================================
       SETTINGS LABEL
    ========================================================== */

    .settings-label {
        font-size: 11px;

        text-transform: uppercase;

        letter-spacing: .08em;

        color:
            rgba(255,255,255,.45);

        padding:
            4px 8px 8px;
    }


    /* ==========================================================
       QUALITY MENU
    ========================================================== */

    .qualities {
        display: flex;

        flex-direction: column;

        gap: 2px;

        opacity: 0;

        visibility: hidden;

        pointer-events: none;

        transform:
            translateY(8px)
            scale(.97);

        transform-origin:
            left;

        transition:
            opacity .2s ease,
            transform .2s cubic-bezier(.34,1.56,.64,1),
            visibility .2s ease;
    }


    /* ==========================================================
       QUALITY
    ========================================================== */

    .quality {
        cursor: pointer;

        display: flex;

        align-items: center;

        justify-content: space-between;

        padding: 8px 10px;

        border-radius: 8px;

        font-size: 13px;

        color:
            rgba(255,255,255,.8);

        transition:
            background var(--sf-transition),
            color var(--sf-transition);
    }

    .quality:hover {
        background:
            rgba(255,255,255,.08);

        color: white;
    }

    .quality.active {
        color: var(--sf-accent);

        background:
            var(--sf-accent-dim);

        font-weight: 600;
    }

    .quality.active::after {
        content: "●";

        font-size: 8px;

        color: var(--sf-accent);

        text-shadow:
            0 0 6px var(--sf-accent-glow);
    }


    .sf-quality-btn {
        cursor: pointer;
    }


    /* ==========================================================
       SUB CONTROLS
    ========================================================== */

    .sub-controlsM {
        display: none;
    }

    .sub-controlsM.show {
        display: flex;

        flex-direction: column;

        gap: 2px;

        opacity: 1;

        visibility: visible;

        pointer-events: auto;
    }


    /* ==========================================================
       SPEED
    ========================================================== */

    .speed {
        display: flex;

        flex-direction: column;

        gap: 2px;

        opacity: 0;

        visibility: hidden;

        pointer-events: none;

        transition:
            opacity .2s ease;
    }


    /* ==========================================================
       BUFFER INDICATOR
    ========================================================== */

    .sf-buffer {
        position: absolute;

        top: 50%;
        left: 50%;

        transform:
            translate(-50%, -50%);

        z-index: 9999;

        display: flex;

        align-items: center;

        justify-content: center;

        min-width: 160px;

        padding: 12px 18px;

        gap: 8px;

        background:
            rgba(0,0,0,.7);

        color: white;

        font-weight: 600;

        font-family:
            system-ui,
            -apple-system,
            "Segoe UI",
            Roboto,
            Arial;

        border-radius: 10px;

        box-shadow:
            0 8px 30px rgba(0,0,0,.6),
            0 1px 0 rgba(255,255,255,.02) inset;

        backdrop-filter:
            blur(6px)
            saturate(140%);

        -webkit-backdrop-filter:
            blur(6px)
            saturate(140%);

        pointer-events: none;

        opacity: 1;

        visibility: visible;

        transition:
            opacity .2s ease,
            visibility .2s ease;
    }


    /* ==========================================================
       BUFFER HIDDEN
    ========================================================== */

    .sf-buffer.hidden {
        opacity: 0;

        visibility: hidden;

        pointer-events: none;
    }


    /* ==========================================================
       RETRY
    ========================================================== */

    .sf-retry {
        position: absolute;

        top: 50%;
        left: 50%;

        transform:
            translate(-50%, -50%);

        z-index: 9999;

        display: flex;

        align-items: center;

        justify-content: center;

        min-width: 160px;

        padding: 12px 18px;

        gap: 8px;

        background:
            rgba(0,0,0,.7);

        color: white;

        font-weight: 600;

        font-family:
            system-ui,
            -apple-system,
            "Segoe UI",
            Roboto,
            Arial;

        border-radius: 10px;

        box-shadow:
            0 8px 30px rgba(0,0,0,.6),
            0 1px 0 rgba(255,255,255,.02) inset;

        backdrop-filter:
            blur(6px)
            saturate(140%);

        -webkit-backdrop-filter:
            blur(6px)
            saturate(140%);

        cursor: pointer;

        opacity: 1;

        visibility: visible;

        transition:
            opacity .2s ease,
            visibility .2s ease;
    }

    .sf-retry:hover {
        border:
            1px solid white;
    }

    .sf-retry.hidden {
        opacity: 0;

        visibility: hidden;

        pointer-events: none;
    }


    /* ==========================================================
       GENERATION PROGRESS
    ========================================================== */

   .sf-G-progress {
    position: absolute;

    top: 12px;
    left: 12px;

    z-index: 99999;

    display: flex;

    align-items: center;
    justify-content: center;

    min-width: 140px;
    min-height: 34px;

    padding: 8px 14px;

    background: #000 !important;
    color: #fff !important;

    border: 1px solid #fff;

    border-radius: 999px;

    font-size: 13px;
    font-weight: 600;

    opacity: 1;
    visibility: visible;

    pointer-events: none;
}

.sf-G-progress.hidden {
    opacity: 0;
    visibility: hidden;
}

    /* ==========================================================
       FULLSCREEN
    ========================================================== */

    :host(:fullscreen) {
        width: 100vw;
        height: 100vh;
    }

    :host(:fullscreen) .sf-player {
        width: 100%;
        height: 100%;
        aspect-ratio: auto;
        border-radius: 0;
    }


    /* ==========================================================
       MOBILE
    ========================================================== */

    @media (max-width: 600px) {

        .sf-controls-bottom {
            padding:
                6px 10px 10px;
        }

        .sf-controls-left,
        .sf-controls-right {
            gap: 6px;
        }

        .sf-volume-slider {
            width: 55px;
        }

        .sf-time {
            font-size: 11px;
        }

        .settings {
            right: 8px;
            bottom: 52px;
            width: 180px;
        }

 

    </style>
    `;
}