import { Keyboard, VK } from "vk-io";
import { Battles, Fall, Members, Stuff } from "../database/models";
import Notify from "./notify";
import fs from 'fs';
import path from 'path';
import Config from '../config/config';
import { ADMIN_CALL } from "./key-actions";

const config = Config;
const { debug, timeout } = config;

export default (vk: VK) => {
    const notify = Notify(vk);
    setInterval(async () => {
        try {
            // debug && console.clear();
            // debug && console.time('time-contoller-get-data');
            let stuff   = (await Stuff.find()).map(x => x.vkId);
            let data    = await Members.find({ 
                lastMessage: { 
                    $lt: new Date().getTime()
                }
            }).populate('chat');
            // debug && console.timeEnd('time-contoller-get-data');
            let now = new Date().getTime();
            // debug && console.time('time-contoller-loop-start');
            for(let i = 0; i < data.length; i++){
                let { vkId, chat, lastMessage } = data[i];
                let greatThen = Number(((now - (lastMessage - timeout * 1000)) / 1000).toFixed(0));
                // debug && console.log(`[timeContoller]: Не писал(а) более G: ${greatThen}|T: ${timeout}: https://vk.com/${vkId > 0 ? `id${vkId}` : `club${+vkId}`}`)
                notify.stuff(stuff, vkId, greatThen, chat.chatId, lastMessage, now).catch(e => {}).then(() => {
                    debug && console.log(`[timeContoller]: Уведомление в ЛС о: https://vk.com/${vkId > 0 ? `id${vkId}` : `club${+vkId}`}`);
                    debug && console.log(`[timeContoller-Notify]: ${new Date().toLocaleString()}`)
                });
                notify.chat(chat.chatId, vkId, greatThen).catch(e => {}).then(() => {
                    debug && console.log(`[timeContoller]: Уведомление в ЧАТ о: https://vk.com/${vkId > 0 ? `id${vkId}` : `club${+vkId}`}`);
                    debug && console.log(`[timeContoller-Notify]: ${new Date().toLocaleString()}`)
                });
                data[i].delete();
                // debug && console.log(`[timeContoller]: Удален из Members: https://vk.com/${vkId > 0 ? `id${vkId}` : `club${+vkId}`}`);
                Fall.create({ vkId, date: new Date().getTime(), chat: chat.id }).catch(e => {
                    console.error(`[timeContoller]: Ошибка добавления в Fall: https://vk.com/id${vkId}`);
                }).then(() => {
                    debug && console.log(`[timeContoller]: Добавлен в Fall: https://vk.com/${vkId > 0 ? `id${vkId}` : `club${+vkId}`}\n`);
                });
                if(chat.isBattle){
                    vk.api.messages.send({
                        chat_id: chat.chatId,
                        message: 'Вызвать администратора для регистрации окончания баттла?',
                        keyboard: Keyboard.keyboard([
                            Keyboard.textButton({
                                label: "Вызвать администратора!",
                                color: 'positive',
                                payload: {
                                    action: ADMIN_CALL
                                }
                            })
                        ]).inline(true),
                        random_id: Math.round(new Date().getTime() * Math.random())
                    }).catch(e => {
                        console.error(`Не удалось отправить сообщение с вызовом администрации: ${e.message}`);
                    }).then(() => {
                    });
                }
            }
            // debug && console.timeEnd('time-contoller-loop-start');
        } catch (e) {
            console.error(`[timeContoller-kick]: ${e.message}`);
        }
    }, 1000);
}