import { Streamforge } from "../core/streamforge.js";

export default class Network {

    async request(path) {
        if(!path) throw new Error("no path provided to request");
        

        let url;

        if (path.startsWith("/")) {
            // Already a StreamForge path
            url = `${Streamforge.endpoint}${path}`;
        } else {
            // Initial video request
            url = `${Streamforge.endpoint}/streamforge/${path}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch "${path}"`);
        }

        return response;
    }

}