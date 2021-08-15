import { MessageContext, VK } from "vk-io";
import { Chats, Stuff, Admins } from "../database/models";
import sendError from "../utils/sendError";
import config from '../config/config';

const debug = config.debug;

export default (vk: VK, ss: number[]) => async (ctx: MessageContext, next: Function) => {
    try { 
        debug && console.log(`Stuff-Enter`);
        ctx.adminIds    = []
        ctx.admins      = []
        ctx.isAdmin     = false;
        debug && console.log(`Stuff-Init`);

        let chat        = await Chats.findOne({ chatId: ctx.chatId });
        ctx.chat        = chat;
        debug && console.log(`Stuff-Chat-Get`);
        
        if(chat){
            debug && console.log(`Stuff-Chat-Found`);
            let admins      = await Admins.find({ chat: chat.id });
            ctx.adminIds    = admins.map(x => x.vkId);
            ctx.admins      = admins;
            ctx.isAdmin     = ctx.adminIds.includes(ctx.senderId);
            debug && console.log(`Stuff-Admins-Init`);
        }
        
        let stuff       = await Stuff.find({});
        debug && console.log(`Stuff-Stuff-Init`);
        ctx.stuffIds    = stuff.map(x => x.vkId);
        ctx.stuff       = stuff;
        ctx.isStuff     = ctx.stuffIds.includes(ctx.senderId);
        debug && console.log(`Stuff-Go-Next`);
        ctx.allStuffIds = [...ctx.stuffIds, ...ctx.adminIds, ...ss];
        return next();
    } catch(e){
        return sendError(ctx, 'StuffM', e);
    }
}