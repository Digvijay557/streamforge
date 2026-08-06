<h1 align="center">StreamForge</h1>

<p align="center">
  An end-to-end video streaming middleware for Express.js with a modern custom web video player powered by HLS and Media Source Extensions.
</p>

<p align="center">
  <img src="./assets/demo.gif" width="900" alt="StreamForge Demo">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-v0.2-success" alt="Version">
  <img src="https://img.shields.io/badge/node-Express.js-000000?logo=express" alt="Express">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
</p>

> 🚧 **StreamForge is under active development.** While v0.2 is complete, APIs may continue to evolve before the first stable release.

---

# Overview

StreamForge automates the complete video streaming pipeline—from ingest to playback—as a plug-and-play Express.js middleware. It generates HLS streams on demand and ships with **SFPlayer**, a lightweight custom web component built on the Media Source Extensions (MSE) API.

---

# Features

- 🎬 Automatic HLS generation
- 📦 Fragmented MP4 (fMP4) streaming
- ⚙️ On-demand transcoding
- 🎥 Custom `<sf-player>` web component
- ⏩ Accurate seeking
- 📊 Playback & buffer progress
- 🎚️ Manual quality selection
- ⚡ Retry failed segment downloads
- ⏳ Request timeout handling
- 📡 Live transcoding progress via Server-Sent Events (SSE)
- 🖼️ Picture-in-Picture support
- ⏩ Playback speed controls
- 🧹 Automatic cache cleanup
- 🛡️ Structured error handling with custom error classes

---

# Roadmap

## ✅ v0.1

- HLS Generation
- Media Engine
- Segment Loader
- Basic Seeking
- Progress Bar
- Error Handling

---

## ✅ v0.2

- Retry Failed Segments
- Buffer Manager
- Manual Quality Selection
- Playback Speed
- Picture-in-Picture
- Request Timeout
- AbortController Support
- Generation Progress UI
- Buffer Progress Indicator
- Improved Network Layer
- Improved Error Handling
- Stability & Cleanup

---

## ✅ v0.3

### 🎬 Streaming

- Rich StreamForge Manifest
- Better metadata handling

### 🌐 Browser Compatibility

- Browser capability detection
- Native HLS support
- Automatic playback backend selection
- Unified playback architecture

### 🛠 Developer Experience

- Public Player API
- Event API
- Real-time encoding progress
- Better middleware integration
- Improved developer experience

### ⚙️ Reliability

- Cache validation
- Automatic regeneration
- Better retry system
- Improved error reporting

---

## 🔮 Future

- Adaptive Bitrate (ABR)
- CDN Integration
- Cloud Storage Support
- Player Themes
- Headless Player API
- Subtitles & Captions
- Thumbnail Preview
- Multi-audio Support
- Analytics & QoE Metrics

---

# Contributing

Contributions, issues, and feature requests are welcome. StreamForge is still evolving, and feedback is greatly appreciated.

---

# License

MIT