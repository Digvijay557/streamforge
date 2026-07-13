import { Streamforge } from "../core/streamforge.js";

export default class Network {

    async request(path) {
        if (!path) {
            throw new Error("No path provided to request.");
        }

        let url;

        if (path.startsWith("/")) {
            // Already a StreamForge internal path
            url = `${Streamforge.endpoint}${path}`;
        } else {
            // Initial video request
            url = `${Streamforge.endpoint}/streamforge/${path}`;
        }

        console.log("🌐 Fetch:", url);

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch "${path}" (${response.status})`);
        }

        return response;
    }

    progress(path, callback) {
        if (!path) {
            throw new Error("No path provided for progress stream.");
        }

        const url = `${Streamforge.endpoint}/streamforge/${path}/progress`;

        console.log("📡 Opening SSE:", url);

        const source = new EventSource(url);

        source.onopen = () => {
            console.log("✅ SSE Connected");
        };

        source.onmessage = (event) => {
            console.log("📨 SSE Message:", event.data);

            try {
                const progress = JSON.parse(event.data);
                callback(progress);
            } catch (err) {
                console.error("❌ Failed to parse SSE message:", err);
            }
        };

        source.onerror = (event) => {
            console.error("❌ SSE Error", event);
        };

        return source;
    }
}