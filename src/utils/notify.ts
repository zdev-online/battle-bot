import { getRandomId, VK, Keyboard } from "vk-io";
import sendError from "./sendError";
import moment from 'moment';
import Config from '../config/config';
import { Document } from 'mongoose';
import { ADMIN_ACCEPT_BATTLE, ADMIN_CANCEL_BATTLE, KICK } from "./key-actions";
import { Battles, Users, Stuff, Admins } from "../database/models";
import { getBattleId } from "./utils";

const config = Config;
const { timeout } = config;

interface Chat extends Document {
    chatId: number,
    regDate: number,
    active: boolean,
    kickGroups: boolean
}

interface UserInBattle {
    vkId: number,
    accepted: boolean
}

interface Battles extends Document {
    attacks: Array<UserInBattle>,
    defenders: Array<UserInBattle>,
    bet: string,
    chat: Chat,
    type: number,
    creator: number
}

function getKeyboard(chatId: number | undefined, vkId: number){
    return Keyboard.keyboard([
        Keyboard.textButton({ 
            label: 'Кикнуть', 
            color: 'negative',
            payload: { chatId, vkId, action: KICK }
        })
    ]).inline(true);
}

export default (vk: VK) => ({
    chat: async (chatId: number | undefined, userId: number, greatThen: number) => {
        try {
            let name: string = '';
            if(userId < 0){
                name = `[club${Math.abs(userId)}|${(await vk.api.groups.getById({ group_id: String(userId) }))[0].name}]`;
            } else {
                let [{ first_name, last_name }] = await vk.api.users.get({ user_ids: String(userId) });
                name = `[id${userId}|${first_name} ${last_name}]`;
            }
            let message = `Уведомление: @all | @online\n${name} не писал(а) больше ${greatThen} сек.`;
            await vk.api.messages.send({
                chat_id: chatId,
                random_id: getRandomId(),
                keyboard: getKeyboard(chatId, userId),
                message
            });
        } catch(e) {
            console.error(`[Notify.chat]: ${e.message}`);
        }
    },
    stuff: async (stuffIds: number | number[] | undefined, userId: number, greatThen: number, chatId: number | undefined, lastMessage: number, now: number) => {
        try {
            if(!stuffIds){ return; }
            let name: string = '';
            if(userId < 0){
                name = `[club${Math.abs(userId)}|${(await vk.api.groups.getById({ group_id: String(userId) }))[0].name}]`;
            } else {
                let [{ first_name, last_name }] = await vk.api.users.get({ user_ids: String(userId) });
                name = `[id${userId}|${first_name} ${last_name}]`;
            }
            let { items } = await vk.api.messages.getConversationsById({ peer_ids: Number(chatId) + 2000000000});
            let title:string = ``;
            if(!items[0].chat_settings || !items[0].chat_settings.title){
                title = `Не удалось получить!`;
            } else {
                title = items[0].chat_settings.title
            }
            let message = `Беседа: ${title}\n${name} не писал(а) больше ${greatThen} сек.\n`;
            
            message += `Последнее сообщение: ${moment(new Date(lastMessage - timeout * 1000).getTime()).format('HH:mm:ss - DD.MM.YYYY')}\n`;
            message += `Время сейчас: ${moment(now).format('HH:mm:ss - DD.MM.YYYY')}`;

            await vk.api.messages.send({
                peer_ids: stuffIds,
                random_id: getRandomId(),
                keyboard: getKeyboard(chatId, userId),
                message
            });
        } catch(e) { 
            console.error(`[Notify.stuff]: ${e.message}`);
        }
    },
    battle: async (battle: Battles) => {
        try {
            let stuff: number[] = (await Stuff.find()).map(x => x.vkId);
            let admins: number[] = (await Admins.find()).map(x => x.vkId);
            let message = `Баттл #${getBattleId(battle)} ожидает подтверждения\n`;
            let creator = await vk.api.users.get({ user_id: battle.creator });
            message += `Создатель: [id${creator[0].id}|${creator[0].first_name} ${creator[0].last_name}]\n`;
            message += `Атакующие [${battle.attacks.length}]:\n`;
            let a_users = await Users.find({ vkId: { $in: battle.attacks.map(x => x.vkId) } });
            let d_users = await Users.find({ vkId: { $in: battle.defenders.map(x => x.vkId) } });
            for(let i = 0; i < battle.attacks.length; i++){
                let { vkId, nickname } = a_users[i];
                message += `${i + 1}. [id${vkId}|${nickname}]\n`;
            }
            message += `Защищающиеся [${battle.defenders.length}]:\n`;
            for(let i = 0; i < battle.defenders.length; i++){
                let { vkId, nickname } = d_users[i];
                message += `${i + 1}. [id${vkId}|${nickname}]\n`;
            }
            message += `\nСтавка: ${battle.bet}\n`;
            message += `Тип: ${['На ДД', 'От рук'][battle.type]}`;
            return vk.api.messages.send({
                user_ids: [...stuff, ...admins],
                message,
                random_id: new Date().getTime() * 1000 * Math.random(),
                keyboard: Keyboard.keyboard([
                    [
                        Keyboard.textButton({ 
                            label: 'Одобрить',
                            color: 'positive',
                            payload: {
                                action: ADMIN_ACCEPT_BATTLE,
                                id: battle.id
                            }
                        }),
                        Keyboard.textButton({
                            label: 'Отказать',
                            color: 'negative',
                            payload: {
                                action: ADMIN_CANCEL_BATTLE,
                                id: battle.id
                            }
                        })
                    ]
                ]).inline(true)
            })
        } catch(e){
            console.log(`[Notify.battle]: ${e.message}`);
        }
    }
})