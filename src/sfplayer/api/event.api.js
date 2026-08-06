export function applyEventApi(SFPlayer){

    const player = SFPlayer.prototype;

    player.on = function(event, callback){

        this.events.addEventListener(event, callback);

    };

    player.off = function(event, callback){

        this.events.removeEventListener(event, callback);

    };

    player.once = function(event, callback){

        this.events.addEventListener(event, callback,{
            once:true
        });

    };

}