import { Keyboard, MessageContext, VK } from "vk-io";
import config from "../config/config";
import { Battles, Chats, Users } from "../database/models";
import createBattlePost from "../utils/createBattlePost";
import {
    ABOUT_BATTLE,
    ADMIN_ACCEPT_BATTLE,
    ADMIN_CALL,
    ADMIN_CANCEL_BATTLE,
    CREATE_BATTLE, GET_BATTLES, KICK, PROFILE
} from "../utils/key-actions";
import sendError from "../utils/sendError";
import { getBattleId, MAIN_MENU_KEYBOARD } from "../utils/utils";

let { debug } = config;

const chunkArray = function chunkArray(array: Array<any>, size: number) {
    let result: Array<any> = [];
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size)
        result.push(chunk);
    }
    return result;
}


export default (vk: VK, ss: Array<Number>) => {
    let createPost = createBattlePost(vk);
    return async (ctx: MessageContext, next: Function) => {
        try {
            if (!ctx.hasMessagePayload) { debug && console.log(`Payload-Go-Next`); return next(); }
            if (ctx.messagePayload.action && !ctx.isChat) {
                switch (ctx.messagePayload.action) {
                    case CREATE_BATTLE: { return ctx.scene.enter('create-battle'); }
                    case GET_BATTLES: { return ctx.scene.enter('battle-list'); }
                    case ABOUT_BATTLE: {
                        ctx.scene.enter('about-battle', { 
                            state: {
                                id: ctx.messagePayload.id
                            }
                        });
                        return;
                    }
                    case ADMIN_ACCEPT_BATTLE: {
                        let battle = await Battles.findById(ctx.messagePayload.id);
                        if (!battle) { return ctx.send(`Баттл не действителен! (Удален\\Не существовал)`); }
                        if(battle.chat){ return ctx.send(`Баттл уже был одобрен!`);}
                        let a_ids: number[] = battle.attacks.map(x => x.vkId);
                        let d_ids: number[] = battle.defenders.map(x => x.vkId);
                        let title: string = `Баттл ${['на ДД', 'от рук'][battle.type]} #${getBattleId(battle)}`;
                        let chatId: number = await vk.api.messages.createChat({ title });
                        let chat = await Chats.create({ chatId: chatId, regDate: new Date().getTime(), isBattle: true });
                        battle.chat = chat.id;
                        let link = await vk.api.messages.getInviteLink({ peer_id: chatId + 2000000000, reset: true });
                        let message: string = `Администратор одобрил баттл ${getBattleId(battle)}!\n`;
                        message += `Тип: ${battle.attacks.length} VS ${battle.defenders.length} ${['на ДД', 'от рук'][battle.type]}\n`;
                        message += `Ссылка на беседу: ${link.link}\n`;
                        await battle.save();
                        await ctx.send(message, { user_ids: [...a_ids, ...d_ids] });
                        await ctx.send(`Баттл ${['на ДД', 'от рук'][battle.type]} #${getBattleId(battle)} - одобрен!\nСсылка: ${link.link}`);
                        return await createPost(battle);
                    }
                    case ADMIN_CANCEL_BATTLE: {
                        let battle = await Battles.findById(ctx.messagePayload.id);
                        if (!battle) { return ctx.send(`Баттл не действителен! (Удален\\Не существовал)`); }
                        let ids: number[] = [...battle.attacks.map(x => x.vkId), ...battle.defenders.map(x => x.vkId)];
                        await ctx.send(`Баттл #${getBattleId(battle)} - удален, т.к был отклонен администратором!`, { user_ids: ids });
                        battle.delete();
                        return await ctx.send(`Баттл #${getBattleId(battle)} - удален`, {
                            keyboard: MAIN_MENU_KEYBOARD
                        });
                    }
                    case PROFILE: {
                        return ctx.scene.enter('profile');
                    }
                    case KICK: {
                        if (ctx.isStuff || ss.includes(ctx.senderId)) {
                            debug && console.log(`Payload-Is-Stuff`);
                            let { vkId, chatId } = ctx.messagePayload;
                            await vk.api.messages.removeChatUser({ member_id: vkId, chat_id: chatId });
                            await ctx.send(`Пользователь исключен из беседы!`);
                            debug && console.log(`[Payload]: https://vk.com${ctx.senderId < 0 ? `club${ctx.senderId}` : `id${ctx.senderId}`} кикнул https://vk.com${vkId < 0 ? `club${vkId}` : `id${vkId}`}`);
                        }
                        return;
                    }
                    case ADMIN_CALL: {
                        let link = await vk.api.messages.getInviteLink({ peer_id: ctx.peerId });
                        let message = `В баттл-беседе вызвают администратора!\nСсылка: ${link.link}`;
                        await ctx.send(message, { 
                            user_ids: ctx.stuffIds,
                            keyboard: Keyboard.keyboard([
                                Keyboard.urlButton({ label: 'Зайти в беседу', url: String(link.link) })
                            ]).inline(true)
                        });
                        await ctx.send(`Администраторы получили уведомление!`);
                        return;
                    }
                }
            }
            debug && console.log(`Payload-Go-Next`);
            return next();
        } catch (e) {
            return sendError(ctx, 'Payload', e);
        }
    }
}