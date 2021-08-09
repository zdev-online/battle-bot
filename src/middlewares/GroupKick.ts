import { VK, Context } from 'vk-io';
import { Chats, Rights } from '../database/models';
import config from '../config/config';


export default (vk: VK, ss: Array<Number>) => async (ctx: Context, next: Function) => {
    if(ctx.$groupId && ctx.eventMemberId == -ctx.$groupId){  
        return ctx.send(config.startMessage); 
    }
    let chat = await Chats.findOne({ chatId: ctx.chatId });
    if(chat && chat.kickGroups && ctx.eventMemberId < 0){
        return vk.api.messages.removeChatUser({ chat_id: ctx.chatId, member_id: ctx.eventMemberId });
    } 
    if(ctx.eventMemeberId < 0){
        let rights = await Rights.findOne({ vkId: ctx.senderId });
        if(!rights){
            rights = await Rights.create({ vkId: ctx.senderId });
        }
        if(!rights.canInviteGroups){
            return vk.api.messages.removeChatUser({ chat_id: ctx.chatId, member_id: ctx.eventMemberId });
        }
    }
    return next();
}