<h1 align="center">StreamForge</h1>

<p align="center">
  An end-to-end video streaming middleware for Express.js, paired with a modern custom web video player.
</p>

<p align="center">
  <img src="./assets/demo.gif" width="900" alt="StreamForge Demo">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-under%20active%20development-orange" alt="Status">
  <img src="https://img.shields.io/badge/node-Express.js-000000?logo=express" alt="Express">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

> 🚧 **StreamForge is currently under active development.** APIs and internals are subject to change.

## Overview

StreamForge automates the full video streaming pipeline — from ingest to adaptive playback — as a drop-in Express.js middleware, complete with a custom `sf-player` web component built for modern HLS/fMP4 delivery.

## Features

- 🎬 **Automatic HLS generation** — converts source video into HLS streams with no manual setup
- 📦 **fMP4 segmented streaming** — modern, efficient segment format
- ⚙️ **On-demand transcoding** — transcodes only when a stream is requested
- 🧩 **Custom `sf-player` web component** — lightweight, framework-agnostic player built on the Media Source Extensions API
- ⏩ **Seeking support** — accurate seek handling across segments
- 📊 **Progress bar** — built-in playback progress UI
- 🧹 **Automatic cleanup** — removes stale transcoded assets automatically
- 🛡️ **Production-grade error handling** — structured error classes and failure paths throughout the pipeline

## Roadmap

<h3>✅ v0.1</h3>
<ul>
  <li>HLS Generation</li>
  <li>Media Engine</li>
  <li>Segment Loader</li>
  <li>Seeking</li>
  <li>Progress Bar</li>
  <li>Error Handling</li>
</ul>

<h3>🚧 v0.2</h3>
<ul>
  <li>Retry Failed Segments</li>
  <li>Better Scheduler</li>
  <li>Buffer Manager</li>
  <li>Buffer Progress Indicator</li>
  <li>Manual Quality Selection</li>
  <li>Playback Speed</li>
  <li>Picture-in-Picture</li>
  <li>Loading Spinner</li>
  <li>Generation Progress UI</li>
</ul>

<h3>🔮 Future</h3>
<ul>
  <li>Adaptive Bitrate (ABR)</li>
  <li>CDN Support</li>
  <li>Cloud Storage</li>
  <li>Player Themes</li>
  <li>Headless Player</li>
</ul>

## Contributing

Contributions, issues, and feature requests are welcome. This project is early-stage, so expect breaking changes — feedback is especially valuable right now.

## License

MIT