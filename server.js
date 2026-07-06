// server.js

const express = require("express");
const streamforge = require("./src/index"); // Change this if your entry file is different

const app = express();

// StreamForge middleware
app.use(
    "/streamforge",
    streamforge({
        source: "./videos"
    })
);

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Running on http://localhost:${PORT}`);
});