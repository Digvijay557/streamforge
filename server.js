const express = require("express");
const streamforge = require("./src/index.js");

const app = express();

app.use(streamforge({
    source: "./videos"
}));

app.listen(3000, () => {
    console.log("Running on http://localhost:3000");
});