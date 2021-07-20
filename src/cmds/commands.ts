import { MessageContext, resolveResource, createCollectIterator, getRandomId, Keyboard } from 'vk-io';
import { Fall, Members, Chats, Admins, Stuff, Whitelist, Battles, Users, PoolUsers, Settings } from '../database/models';
import { vk, hm, ss } from '../index';
import sendError from '../utils/sendError';
import moment from 'moment';
import os from 'os';
import config from '../config/config';

moment.locale('ru');

const formatUptime = function (time: number): string {
    function pad(s: number) {
        return (s < 10 ? '0' : '') + s;
    }
    let hours = Math.floor(time / (60 * 60));
    let minutes = Math.floor(time % (60 * 60) / 60);
    let seconds = Math.floor(time % 60);
    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);

}

const hasRole = function (ctx: MessageContext, role: String) {
    if (role == 'admin' && (ctx.isAdmin || ctx.isStuff)) { return true; }
    if (role == 'stuff' && ctx.isStuff) { return true; }
    return ss.includes(ctx.senderId);
}

hm.hear(/^\/help/i, (ctx: MessageContext) => {
    let message = `Команды бота:\n`;
    message += `> /status - Статус беседы\n`;
    message += `> /bot - Статистика бота\n`;
    message += `> /time - Время добавления бота\n`;
    message += `> /info - Данные пользователя\n`;
    message += `> /admins - Управляющие\n`;
    message += `> /groups - Вкл\\выкл кик групп\n`;
    message += `> /check - Вкл\\выкл слежки за пользователем\n`;
    message += `> /filter - Вкл\\выкл фильтр смайликов\n`;
    message += `> /clear - Кикнуть забаненных\n`;
    message += `> /online - Онлайн пользователей\n`;
    return ctx.send(message);
});

hm.hear(/^\/status/i, async (ctx: MessageContext) => {
    return ctx.send(`Статус беседы: ${ctx.chat ? 'Активный' : 'Неактивный'}`);
});

hm.hear(/^\/active/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!hasRole(ctx, 'admin')) { return; }
        let data = await Members.find({ chat: ctx.chat.id });
        let name: string = '';

        let message = data.length ? `Последняя активность пользоватлей:\n` : 'Никто ещё не писал...';
        for (let i = 0; i < data.length; i++) {
            let { vkId, lastMessage } = data[i];
            if (vkId < 0) {
                name = `[club${Math.abs(vkId)}|${(await vk.api.groups.getById({ group_id: String(vkId) }))[0].name}]`;
            } else {
                let [{ first_name, last_name }] = await vk.api.users.get({ user_ids: String(vkId), name_case: 'gen' });
                name = `[id${vkId}|${first_name} ${last_name}]`;
            }
            let minutes = moment().diff(new Date(lastMessage - config.timeout * 1000), 'm');
            let seconds = moment().diff(new Date(lastMessage - config.timeout * 1000), 's');
            message += `${name} - ${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds} назад.\n`;
        }
        return ctx.send(message);
    } catch (e) {
        return sendError(ctx, '/active', e);
    }
});

hm.hear(/^\/admins/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!ctx.stuff.length) { return ctx.send('Нет администраторов!'); }
        let message = `Администраторы:\n`;
        for (let i = 0; i < ctx.stuff.length; i++) {
            let [{ first_name, last_name, id }] = await vk.api.users.get({ user_ids: ctx.stuff[i].vkId });
            message += `[id${id}|${first_name} ${last_name}]\n`;
        }
        return ctx.send(message);
    } catch (e) { return sendError(ctx, '/stuff', e); }
});

hm.hear(/^\/bot/i, async (ctx: MessageContext) => {
    let uptime = formatUptime(process.uptime());
    let used = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100 + ' Мб';
    let total = Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100 + ' Мб';
    let rss = Math.round(process.memoryUsage().rss / 1024 / 1024 * 100) / 100 + ' Мб';
    let ext = Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100 + ' Мб';
    let OSMF = Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100;
    let OSMT = Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100;
    let message = `Статистика бота:\n`;
    message += `> Time: ${moment().format('HH:mm:ss')}\n`;
    message += `> Date: ${moment().format('DD.MM.YYYY')}\n`;
    message += `> Uptime: ${uptime}\n`;
    message += `> Всего выделено: ${total}\n`;
    message += `> Используется: ${used}\n`;
    message += `> RSS: ${rss}\n`;
    message += `> EXT: ${ext}\n\n`;
    message += `> ОС Используется: ${(OSMT - OSMF).toFixed(2)} Гб\n`;
    message += `> ОС Свободно: ${OSMF} Гб\n`;
    message += `> ОС Всего: ${OSMT} Гб\n`;
    return ctx.send(message);
});

hm.hear(/^\/time/i, (ctx: MessageContext) => {
    if (!ctx.chat) { return ctx.send('Чат не активирован!'); }
    let message = `Дата добавления бота: ${moment(ctx.chat.regDate).format('HH:mm:ss, DD.MM.YYYY')}\nДата: ${moment().format('HH:mm:ss, DD.MM.YYYY')}`;
    return ctx.send(message);
});

hm.hear(/^\/kill/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!hasRole(ctx, 'owner')) { return; }
        let title: string = ``;
        if (ctx.text) {
            title = ctx.text.split(' ')[1];
            title = title ? title : ``;
        }
        let { items } = await vk.api.messages.getConversationMembers({ peer_id: ctx.peerId });
        for (let i = 0; i < items.length; i++) {
            if (items[i].member_id == ctx.senderId || (ctx.$groupId && items[i].member_id == -ctx.$groupId)) { continue; }
            vk.api.messages.removeChatUser({
                chat_id: Number(ctx.chatId),
                member_id: items[i].member_id
            }).then(() => { }).catch(e => {
                console.error(`[/kill]: ${e.message}`);
            });
        }

        title.length && await vk.api.messages.editChat({
            chat_id: Number(ctx.chatId),
            title: title
        });
        return ctx.send(`Беседа 'убита'`);
    } catch (e) {
        return sendError(ctx, '/kill', e);
    }
});

hm.hear(/^\/clear/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        let { profiles } = await vk.api.messages.getConversationMembers({ peer_id: ctx.peerId });
        let count = 0;
        if (!profiles) { return ctx.send('Забанненых пользователей - нет!') }
        for (let i of profiles) {
            if (i.deactivated) {
                await vk.api.messages.removeChatUser({ chat_id: Number(ctx.chatId), member_id: i.id }).catch(e => {
                    console.error(`Ошибка удаления забаненного пользователя! ${e.message}`);
                });
                count++;
            }
        }
        return ctx.send(`Забанненых пользователей кикнуто: ${count}`);
    } catch (e) {
        return sendError(ctx, '/clear', e);
    }
});

hm.hear(/^\/update/i, async (ctx: MessageContext) => {
    try {
        if (!hasRole(ctx, 'owner')) { return; }
        let message: string = '';
        let attachments: string[] = [];
        if (ctx.text) {
            let splited = ctx.text.split(' ');
            splited.splice(0, 1);
            message = splited.length ? splited.join(' ') : 'Webterrors | Company ♕';
        }

        let data = await Chats.find({});
        let length = data.length;
        if (ctx.attachments.length) {
            attachments = ctx.attachments.map(x => x.toString());
        }
        for (let i = 0; i < length; i++) {
            vk.api.messages.send({
                chat_id: data[i].chatId,
                message,
                random_id: getRandomId(),
                attachment: attachments
            }).catch(e => {
                console.error(`Ошибка рассылки [ChatID: ${data[i].chatId}]: ${e.message}`);
            }).then(() => { config.debug && console.log(`Сообщение рассылки - отправлено: ${i + 1}/${length}`); });
        }
        return ctx.send(`Рассылка началась!`);
    } catch (e) {
        return sendError(ctx, '/update', e);
    }
});

hm.hear(/^\/info/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        let id: string = '';
        if (ctx.replyMessage) {
            id = String(ctx.replyMessage.senderId);
        } else if (ctx.text) {
            let s = ctx.text.split(' ');
            id = s[1] ? s[1] : '';
        }
        if (!id) { return ctx.send('Укажите ID человека или перешлите его сообщение!'); }

        let { id: userId } = await resolveResource({ api: vk.api, resource: id });

        let { items } = await vk.api.messages.getConversationMembers({ peer_id: ctx.peerId });

        for (let i = 0; i < items.length; i++) {
            if (items[i].member_id == userId) {
                let selfInvite = items[i].invited_by == items[i].member_id;
                let [{ first_name: fName, last_name: lName, id: uid }] = await vk.api.users.get({ user_ids: String(userId) });
                let message = `Пользователь [id${uid}|${fName} ${lName}]:\n`;
                if (items[i].join_date) {
                    let joinDate: number = Number(items[i].join_date) * 1000;
                    message += `В чате с: ${moment(joinDate).format('DD.MM.YYYY - HH:mm:ss')}`;
                    message += ` (${moment().diff(new Date(joinDate), 'd')} дн.)\n`;
                } else {
                    message += `В чате с: Данных нет\n`;
                }
                if (!selfInvite) {
                    let [{ first_name, last_name, id: uuid }] = await vk.api.users.get({
                        user_ids: String(items[i].invited_by),
                        name_case: 'ins'
                    });
                    message += `Приглашен: [id${uuid}|${first_name} ${last_name}]\n`;
                } else {
                    message += `Приглашен: По ссылке\\Создатель\n`;
                }
                let data = await Members.findOne({ vkId: uid, chat: ctx.chat.id });
                if (!data) {
                    message += `Последняя активность: Нет данных\n`;
                } else {
                    let hours = moment().diff(data.lastMessage - config.timeout * 1000, 'h');
                    let minutes = moment().diff(data.lastMessage - config.timeout * 1000, 'm');
                    let seconds = moment().diff(data.lastMessage - config.timeout * 1000, 's');

                    message += `Последняя активность: `;
                    message += hours < 10 ? `0${hours}:` : `${hours}:`;
                    message += minutes < 10 ? `0${minutes}:` : `${minutes}:`;
                    message += seconds < 10 ? `0${seconds}` : `${seconds}`;
                    message += ` назад.\n`;
                }

                let fall = await Fall.find({ vkId: uid, chat: ctx.chat.id }).sort('desc').limit(1);
                if (!fall.length) {
                    message += `Последний слёт: Нет данных\n`;
                } else {
                    message += `Последний слёт: ${moment(fall[0].date).format("HH:mm:ss - DD.MM.YYYY")}\n`;
                }
                return ctx.send(message);
            }
        }
        return ctx.send(`[id${userId}|Пользователь] не найден в беседе!`);
    } catch (e) {
        if (e.message == 'Resource not found') {
            return ctx.send('Пользователь с таким ID не найден!');
        }
        return sendError(ctx, '/info', e);
    }
});

hm.hear(/^\/giveadm/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!hasRole(ctx, 'stuff')) { return ctx.send(`Недостаточно прав!`); }
        let id: string = '';
        if (ctx.replyMessage) {
            id = String(ctx.replyMessage.senderId);
        } else if (ctx.text) {
            let s = ctx.text.split(' ');
            id = s[1] ? s[1] : '';
        }
        if (!id) { return ctx.send('Укажите ID человека или перешлите его сообщение!'); }
        let { id: userId } = await resolveResource({ api: vk.api, resource: id });
        if (ctx.stuffIds.includes(userId) && !ss.includes(ctx.senderId)) { return ctx.send(`Недостаточно прав!`); }
        if (ctx.adminIds.includes(userId)) { return ctx.send(`Пользователь уже управляющий!`); }
        await Admins.create({ vkId: userId, date: new Date().getTime(), chat: ctx.chat.id });
        let [{ first_name, last_name }] = await vk.api.users.get({ user_ids: String(userId) });
        return ctx.send(`Роль администратора выдана пользователю: [id${userId}|${first_name} ${last_name}]`);
    } catch (e) {
        if (e.message == 'Resource not found') {
            return ctx.send('Пользователь с таким ID не найден!');
        }
        return sendError(ctx, '/giveadm', e);
    }
});

hm.hear(/^\/staff/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!hasRole(ctx, 'owner')) { return ctx.send(`Недостаточно прав!`); }
        let id: string = '';
        if (ctx.replyMessage) {
            id = String(ctx.replyMessage.senderId);
        } else if (ctx.text) {
            let s = ctx.text.split(' ');
            id = s[1] ? s[1] : '';
        }
        if (!id) { return ctx.send('Укажите ID человека или перешлите его сообщение!'); }
        let { id: userId } = await resolveResource({ api: vk.api, resource: id });
        if (ctx.stuffIds.includes(userId)) { return ctx.send(`Пользователь уже управляющий!`); }
        if (ctx.adminIds.includes(userId)) {
            await Admins.deleteOne({ vkId: userId, chat: ctx.chat.id });
        }
        await Stuff.create({ vkId: userId, date: new Date().getTime() });
        let [{ first_name, last_name }] = await vk.api.users.get({ user_ids: String(userId) });
        return ctx.send(`Роль управляющего выдана пользователю: [id${userId}|${first_name} ${last_name}]`);
    } catch (e) {
        if (e.message == 'Resource not found') {
            return ctx.send('Пользователь с таким ID не найден!');
        }
        return sendError(ctx, '/stuff', e);
    }
});

hm.hear(/^\/del/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!hasRole(ctx, 'stuff')) { return ctx.send(`Недостаточно прав!`); }
        let id: string = '';
        if (ctx.replyMessage) {
            id = String(ctx.replyMessage.senderId);
        } else if (ctx.text) {
            let s = ctx.text.split(' ');
            id = s[1] ? s[1] : '';
        }
        if (!id) { return ctx.send('Укажите ID человека или перешлите его сообщение!'); }
        let { id: userId } = await resolveResource({ api: vk.api, resource: id });
        if (!ss.includes(userId) && !ctx.stuffIds.includes(userId) && !ctx.adminIds.includes(userId)) {
            return ctx.send(`У [id${userId}|пользователя] нет ролей!`);
        }
        if (ss.includes(userId)) { return ctx.send(`Недостаточно прав!`); }
        if (ctx.stuffIds.includes(userId) && (ctx.isStuff || ctx.isAdmin) && !ss.includes(ctx.senderId)) { return ctx.send('Недостаточно прав!'); }
        if (ctx.stuffIds.includes(userId)) {
            await Stuff.deleteOne({ vkId: userId });
            return ctx.send(`С [id${userId}|пользователя] снята роль управляющего!`);
        }
        if (ctx.adminIds.includes(userId)) {
            await Admins.deleteOne({ vkId: userId, chat: ctx.chat.id });
            return ctx.send(`С [id${userId}|пользователя] снята роль администратора!`);
        }
    } catch (e) {
        if (e.message == 'Resource not found') {
            return ctx.send('Пользователь с таким ID не найден!');
        }
        return sendError(ctx, '/del', e);
    }
});

hm.hear(/^\/wlist/i, async (ctx: MessageContext) => {
    try {
        if (!hasRole(ctx, 'owner')) { return ctx.send(`Недостаточно прав!`); }
        let id: string = '';
        if (ctx.replyMessage) {
            id = String(ctx.replyMessage.senderId);
        } else if (ctx.text) {
            let s = ctx.text.split(' ');
            id = s[1] ? s[1] : '';
        }
        if (!id) { return ctx.send('Укажите ID человека или перешлите его сообщение!'); }
        let { id: userId } = await resolveResource({ api: vk.api, resource: id });
        let wl = await Whitelist.findOne({ vkId: userId });
        if (wl) {
            await Whitelist.deleteOne({ vkId: userId });
            return ctx.send(`[id${userId}|Пользователь] убран из белого списка!`);
        } else {
            await Whitelist.create({ vkId: userId });
            return ctx.send(`[id${userId}|Пользователь] добавлен в белый список!`);
        }
    } catch (e) {
        if (e.message == 'Resource not found') {
            return ctx.send('Пользователь с таким ID не найден!');
        }
        return sendError(ctx, '/wlist', e);
    }
});

hm.hear(/^\/white/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.chat) { return; }
        if (!hasRole(ctx, 'stuff')) { return ctx.send(`Недостаточно прав!`); }
        if (ctx.chat.active) {
            await Chats.updateOne({ chatId: ctx.chatId }, { active: false });
            return ctx.send(`Чат добавлен в белый список!`);
        } else {
            await Chats.updateOne({ chatId: ctx.chatId }, { active: false });
            return ctx.send(`Чат убран из белого списка!`);
        }
    } catch (e) {
        return sendError(ctx, '/white', e);
    }
});

hm.hear(/^\/groups/i, async (ctx: MessageContext) => {
    try {
        if (!hasRole(ctx, 'admin')) { return; }
        if (ctx.chat.kickGroups) {
            await Chats.updateOne({ chatId: ctx.chatId }, { kickGroups: false });
            return ctx.send(`Бот не будет исключать приглашенные группы!`);
        } else {
            await Chats.updateOne({ chatId: ctx.chatId }, { kickGroups: true });
            return ctx.send(`Бот будет исключать приглашенные группы!`);
        }
    } catch (e) {
        return sendError(ctx, '/groups', e);
    }
});

hm.hear(/^\/battle/i, async (ctx: MessageContext) => {
    try {
        if (ctx.isChat) { return ctx.send(`Создать\\Принять заявку на баттл можно только в ЛС боту!`); }
        return ctx.scene.enter('battle-pages');
    } catch (e) {
        return sendError(ctx, '/battle', e);
    }
});

hm.hear(/^\/nick/, async (ctx: MessageContext) => {
    try {
        if (!ctx.text) { return; }
        let new_nick = ctx.text.split(' ')[1];
        if (!new_nick) {
            return ctx.send(`Укажите новый ник!`);
        }
        let user = await Users.findOne({ vkId: ctx.senderId });
        if (!user) {
            return ctx.send(`Вы не зарегистрированы!`);
        }
        user.nickname = new_nick;
        await user.save();
        return ctx.send(`Ник сменен на [id${ctx.senderId}|${new_nick}]!`);
    } catch (e) {
        return sendError(ctx, '/nick', e);
    }
});

hm.hear(/^\/check/i, async (ctx: MessageContext) => {
    try {
        if (!ctx.text) { return; }

        let checkIdSplited: string[] = ctx.text.split(' ');
        if (!checkIdSplited[1]) { return ctx.send(`Укажите ID пользователя, которого нужно проверять!`); }

        let res = await resolveResource({ api: vk.api, resource: checkIdSplited[1] });
        if (res.type !== 'user') { return ctx.send(`Следить можно только за пользователем!`); }

        let check = await PoolUsers.findOne({ forId: ctx.senderId, checkId: res.id });

        if (check) { 
            check.delete();
            return ctx.send(`Слежка за [id${check.checkId}|пользователем] - остановлена!`); 
        }

        await PoolUsers.create({ forId: ctx.senderId, checkId: res.id });

        return ctx.send(`Я сообщу вам, как только пользователь попадет в бан!`);
    } catch (e) {
        if (e.message == 'Resource not found') {
            return ctx.send(`Пользователь с таким ID - не найден!`);
        }
        return sendError(ctx, '/check', e);
    }
});

hm.hear(/^\/online/i, async (ctx) => {
    try {
        let { profiles } = await vk.api.messages.getConversationMembers({
            peer_id: ctx.peerId,
            fields: ['online', 'last_seen']
        });
        let message: string = `Активные пользователи:\n`;
        if (!profiles) { return ctx.send(`Пользователей - нет!`); }
        for (let i = 0; i < profiles.length; i++) {
            let { first_name, last_name, last_seen, online } = profiles[i];
            message += `> ${first_name} ${last_name} - `;
            if (!last_seen || !last_seen.time) {
                message += `Не онлайн (Нет данных)\n`;
                continue;
            }
            if (online) {
                message += `Онлайн (`;
            } else {
                message += `${moment(last_seen.time * 1000).format('HH:mm:ss, DD.MM.YY')} (`;
            }
            switch (last_seen.platform) {
                case 1: { message += `Моб.версия сайта)`; break; }
                case 2: { message += `IPhone)`; break; }
                case 3: { message += `IPad)`; break; }
                case 4: { message += `Android)`; break; }
                case 5: { message += `Windows Phone)`; break; }
                case 6: { message += `Windows 10)`; break; }
                case 7: { message += `Компьютер)`; break; }
            }
            message += `\n`;
        }
        return ctx.send(message);
    } catch (e) {
        return sendError(ctx, '/online', e);
    }
});

hm.hear(/^\/smiles/i, async (ctx) => {
    try {
        if (!ctx.text) { return; }
        if (!hasRole(ctx, 'stuff')) { return ctx.send(`Недостаточно прав!`); }

        let splitted = ctx.text.split(' ')[1];
        let smileLength = parseInt(splitted);

        if (Number.isNaN(smileLength)) {
            return ctx.send(`Укажите целое число!`);
        }

        let settings = await Settings.findOne({ key: 'settings-key' });
        if (!settings) { return; }
        settings.maxSmiles = smileLength;
        await settings.save();
        return ctx.send(`Лимит смайликов в сообщении: ${smileLength}`);
    } catch (e) {
        return sendError(ctx, '/smiles', e);
    }
});

hm.hear(/^\/filter/i, async (ctx) => {
    try {
        if (!ctx.text) { return; }

        let chat = await Chats.findOne({ chatId: ctx.chatId });
        if(!chat){ return; }

        chat.smileFilter = !chat.smileFilter;

        await chat.save();

        return chat.smileFilter ? ctx.send(`Фильтр смайликов - включен!`) : ctx.send(`Фильтр смайликов - отключен!`);
    } catch (e) {
        return sendError(ctx, '/filter', e);
    }
});

hm.hear(/^\/cc/i, async (ctx) => {
    try {
        let users = await PoolUsers.find({ forId: ctx.senderId });
        if(!users.length){ return ctx.send(`Вы не за кем не следите!`);}
        let message: string = ``;
        let users_info = await vk.api.users.get({ user_ids: users.map(x => x.checkId.toString() )});
        for(let i = 0; i < users.length; i++){
            let { id, first_name, last_name } = users_info[i];
            message += `> [id${id}|${first_name} ${last_name}]\n`;
        }
        return ctx.send(message);
    } catch(e){
        return sendError(ctx, '/cc', e);
    }
});

hm.onFallback((ctx: MessageContext, next: Function) => {
    if (ctx.isChat) { config.debug && console.log('CMDS-Fallback-Chat | CMDS-Go-Next'); return next(); }
    return;
});