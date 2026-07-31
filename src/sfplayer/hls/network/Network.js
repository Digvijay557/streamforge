import { Streamforge } from "../core/streamforge.js";

export default class Network {
    constructor(){
         this.activeRequests = new Set();
         this.REQUEST_TIMEOUT = 5000;
    }

    async request(path, timeoutMs) {
        if (!path) {
            throw new Error("No path provided to request.");
        }
        const timeout = timeoutMs ?? this.REQUEST_TIMEOUT;
        let controller;
        let timeoutId;
        try {
            let url;
            console.log("oh yeha " + path);
            

            if (path.startsWith("/")) {
                // Already a StreamForge internal path
                url = `${Streamforge.endpoint}${path}`;
            } else {
                // Initial video request
                url = `${Streamforge.endpoint}/streamforge/${path}`;
            }

            console.log("🌐 Fetch:", url);
            
             controller = new AbortController();
            this.activeRequests.add(controller);
             timeoutId = setTimeout(() => {
                //console.trace("TIMEOUT");
     controller.abort(new Error(`Request timed out after ${timeout}ms: ${path}`));
}, timeout);
            const response = await fetch(url,{
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch "${path}" (${response.status})`);
            }

            return { response, controller };
        } catch (err) {
            // Only untrack on failure — on success the caller still owns
            // the controller (e.g. to abort mid-download) until it calls
            // abort()/abortAll() itself.
            this.activeRequests.delete(controller);
            //console.error("❌ Request failed:", err);
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    progress(path, callback) {
        if (!path) {
            throw new Error("No path provided for progress stream.");
        }
        console.log("progress" + path);
        

        try {
            const url = `${Streamforge.endpoint}/streamforge/${path}/progress`;

            //console.log("📡 Opening SSE:", url);

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
        } catch (err) {
            console.error("❌ Progress stream failed:", err);
            throw err;
        }
    }

    abort(controller, reason = "Aborted via abort()") {
        if (controller) {
            controller.abort(new Error(reason));
            this.activeRequests.delete(controller);
            //console.trace("abort()")
            //console.log("🛑 Aborted request");
        }
    }

    abortAll(reason = "Aborted via abortAll()") {
        //console.trace("abort()")
        for (const controller of this.activeRequests) {
            controller.abort(new Error(reason));
            //console.log("🛑 Aborted request");
        }

        this.activeRequests.clear();
    }


}