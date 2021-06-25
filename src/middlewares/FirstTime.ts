import { VK, MessageContext, Keyboard } from 'vk-io';
import { Battles, Users } from '../database/models';
import sendError from '../utils/sendError';
import config from '../config/config';
import { MAIN_MENU_KEYBOARD } from '../utils/utils';

const debug = config.debug;

export default (vk: VK) => async (ctx: MessageContext, next: Function) => {
    try {
        debug && console.log(`FirstTime-Enter`);
        if(ctx.isChat){ 
            debug && console.log(`FirstTime-Is-Chat | FirstTime-Go-Next`); 
            return next(); 
        }
        debug && console.log(`FirstTime-Is-Not-Chat`);
        let user = await Users.findOne({ vkId: ctx.senderId });
        if(!ctx.scene.current){
            debug && console.log(`FirstTime-Not-Scene`);
            if(!user){
                return ctx.scene.enter('reg-user');
            }
            if(!ctx.messagePayload && ctx.text && ctx.text[0] != '/'){
                debug && console.log(`FirstTime-Is-Not-Scene-And-Not-A-Payload`);
                return ctx.send('Неизвестная команда, выберите из кнопок!', {
                    keyboard: MAIN_MENU_KEYBOARD
                });
            }
        }
        if(user){
            ctx.user        = user;
            ctx.nickname    = `[id${ctx.senderId}|${user.nickname}]`;
        }
        debug && console.log(`FirstTime-Go-Next`);
        return next();
    } catch(e){
        return sendError(ctx, 'FirstTime', e);
    }
}