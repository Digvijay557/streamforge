export class Streamforge{
    static config = {
        endpoint: window.location.origin
    };
    static init(config={}){
        this.config = {
            ...this.config,
            ...config

        };
    }
    static get endpoint() {
    return this.config.endpoint;
}

}