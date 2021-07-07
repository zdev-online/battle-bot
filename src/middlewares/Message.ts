import { MessageContext, VK } from "vk-io";
import { Chats, Members, Settings, Whitelist } from "../database/models";
import sendError from "../utils/sendError";
import fs from 'fs';
import path from 'path';
import Config from '../config/config';

const config = Config;
const { database, timeout, debug } = config;

export default (vk: VK, ss: Array<Number>) => async (ctx: MessageContext, next: Function) => {
    try {
        debug && console.log(`Message-Enter`);
        if(!ctx.isChat || ctx.isOutbox || (ctx.$groupId && ctx.senderId == -ctx.$groupId)){return next();}
        let chat = await Chats.findOne({ chatId: ctx.chatId });
        if(!chat){
            debug && console.log(`Message-No-Chat`);
            chat = await Chats.create({ chatId: ctx.chatId, regDate: new Date().getTime() });
            await chat.save();
        }
        
        if(!chat.active){ debug && console.log(`Message-Chat-No-Active`); return; }

        // Smile filter
        let smiles = String(ctx.text).match(/[^\w\s,]/gim);
        let settings = await Settings.findOne({ key: 'settings-key' });
        if(!settings){ return; }
        if(smiles && smiles.length >= settings.maxSmiles){
            await ctx.deleteMessage({ peer_id: ctx.peerId, conversation_message_ids: ctx.conversationMessageId });
        }

        let wl = await Whitelist.findOne({ vkId: ctx.senderId });
        if(wl){ debug && console.log(`Message-User-In-WL`); return; }
        if(!ctx.stuffIds.includes(ctx.senderId) && !ss.includes(ctx.senderId) && ctx.senderId > 0){
            let member = await Members.findOne({ vkId: ctx.senderId, chat: chat.id });
            if(!member){
                debug && console.log(`Message-No-Member`);
                member = await Members.create({ 
                    vkId: ctx.senderId, 
                    chat: chat.id, 
                    lastMessage: new Date().getTime() + timeout * 1000
                });
            }
            member.lastMessage = new Date().getTime() + timeout * 1000;
            await member.save();
            debug && console.log(`\
            MSG: [https://vk.com/${ctx.senderId > 0 ? `id${ctx.senderId}` : `club${+ctx.senderId}`}]: LM: ${member.lastMessage}, Now: ${new Date().getTime()}
            TIME: ${new Date().toLocaleString()}
            `);
        }
        debug && console.log(`Message-Go-Next`);
        return next();
    } catch (e) {
        return sendError(ctx, 'MessageMiddleware', e);
    }
}