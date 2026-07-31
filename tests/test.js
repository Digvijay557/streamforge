// 1. Mock the browser environment BEFORE importing the module
globalThis.window = {};
globalThis.document = {
  createElement: (tagName) => {
    if (tagName === "video") {
      return {
        canPlayType: (mimeType) => {
          // Simulate native HLS support (like Safari)
          if (mimeType === "application/vnd.apple.mpegurl") return "maybe";
          return "";
        }
      };
    }
    return {};
  }
};

globalThis.MediaSource = {
  isTypeSupported: (codecString) => {
    // Simulate support for modern video/audio formats
    return codecString.includes("avc1.42E01E") || codecString.includes("mp4a.40.2");
  }
};

// 2. Import your actual function (Note the .js extension if using ES modules)
import { checkBrowserSupport } from '../src/sfplayer/hls/network/checkBrowserSupport.js';

// 3. Execute the function and verify the output
const testResult = checkBrowserSupport();

console.log("--- TEST RESULTS ---");
console.log(JSON.stringify(testResult, null, 2));

// 4. Basic assertion check
if (testResult.supported === true) {
  console.log("\n✅ Test Passed: Browser environment mock successfully validated.");
} else {
  console.error("\n❌ Test Failed: Logic did not mark environment as supported.");
  process.exit(1);
}
