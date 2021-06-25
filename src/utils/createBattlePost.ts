import { VK } from 'vk-io';
import config from '../config/config';
import { getBattleId } from './utils';
import { Document } from 'mongoose';
import { Users } from '../database/models';

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

const user: VK = new VK({ token: config.user_token });

export default (vk: VK) => {
    return async (battle: Battles) => {
        let [{ id }] = await user.api.users.get({});
        let [{ id: gid }] = await vk.api.groups.getById({});
        let attacks: any[] = [];
        let defenders: any[] = [];


        for(let i = 0; i < battle.attacks.length; i++){
            let user = await Users.findOne({ vkId: battle.attacks[i].vkId });
            user && attacks.push({nickname: user.nickname, id: user.vkId });
        }

        for(let i = 0; i < battle.defenders.length; i++){
            let user = await Users.findOne({ vkId: battle.defenders[i].vkId });
            user && defenders.push({nickname: user.nickname, id: user.vkId });
        }


        let poll = await user.api.polls.create({
            add_answers: `["${attacks.map(x => x.nickname).join(' & ')}","${defenders.map(x => x.nickname).join(' & ')}"]`,
            owner_id: id,
            question: 'Кто победит?'
        });
        let message:string  =  `Баттл ${['на ДД', 'от Рук'][battle.type]} #${getBattleId(battle)}\n`;

        config.debug && console.log(attacks.map(x => `[id${x.id}|${x.nickname}]`))
        config.debug && console.log((attacks.map(x => `[id${x.id}|${x.nickname}]`)).join(' & '))

        message += `Атакующие: ${(attacks.map(x => `[id${x.id}|${x.nickname}]`)).join(' & ')}\n`;
        message += `Защищающиеся: ${(defenders.map(x => `[id${x.id}|${x.nickname}]`)).join(' & ')}\n`;
        message += `Ставка: ${battle.bet}\n`;
        message += `Тип: ${battle.attacks.length} VS ${battle.defenders.length} ${['на ДД', 'от Рук'][battle.type]}`;
        let wall = await user.api.wall.post({
            owner_id: -gid,
            message,
            attachments: `poll${poll.owner_id}_${poll.id}`,
            from_group: true
        });
        return wall;
    }
}