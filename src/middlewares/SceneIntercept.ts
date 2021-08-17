import { MessageContext } from "vk-io";
import config from "../config/config";

const { debug } = config;

export default (ctx: MessageContext, next: Function) => {
    debug && console.log(`SI-Enter`);
    if(!ctx.scene.current || ctx.isChat){
        debug && console.log(`SI-Enter-No-Scene`);
        return next();
    }
    debug && console.log(`SI-Enter-Scene`);
    return ctx.scene.reenter();
}