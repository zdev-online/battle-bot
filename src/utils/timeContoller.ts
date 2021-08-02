import { Keyboard, VK } from "vk-io";
import { Battles, Fall, Members, PoolUsers, Stuff } from "../database/models";
import Notify from "./notify";
import fs from 'fs';
import path from 'path';
import Config from '../config/config';
import { ADMIN_CALL, DEL_DELETED } from "./key-actions";

const config = Config;
const { debug, timeout } = config;

export default (vk: VK, ss: number[]) => {
    const notify = Notify(vk, ss);

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
                if(!chat.active){ continue; }
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
                        message: '@all Вызвать администратора для регистрации окончания баттла?',
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

    setInterval(async () => {
        try {
            let users = await PoolUsers.find({});
            for(let i = 0; i < users.length; i++){
                vk.api.users.get({ user_ids: String(users[i].checkId) }).then(([{ 
                    first_name, last_name, id: sid, deactivated 
                }]) => {
                    deactivated && vk.api.messages.send({
                        user_id: users[i].forId,
                        message: `[id${sid}|${first_name} ${last_name}] был забанен, вы устанавливали за ним слежку.`,
                        random_id: Math.floor(Math.random() * new Date().getTime() + 1),
                        keyboard: Keyboard.keyboard([
                            Keyboard.textButton({
                                label: "Остановить слежку",
                                color: 'secondary',
                                payload: {
                                    action: DEL_DELETED,
                                    id: users[i].id
                                }
                            })
                        ]).inline(true)
                    }).catch(e => {
                        console.error(`Ошибка уведомления о забаненном пользователе: ${e.message}`);
                    });
                }).catch(e => {
                    console.error(`Ошибка уведомления о забаненном пользователе: ${e.message}`);
                });
            }
        } catch(e){
            console.error(`Ошибка уведомления о забаненном пользователе: ${e.message}`);
        }
    }, 1000 * 60 * 60);
}