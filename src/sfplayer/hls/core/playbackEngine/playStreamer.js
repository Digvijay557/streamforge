import getENV from "../getENV/getENV.js";
import playRouter from "./playRouter.js";

export default async function playStreamer(player){
    const sf_env = await getENV(player);

    await playRouter(sf_env);



}