import { Keyboard } from "vk-io";
import { ABOUT_BATTLE, CANCEL, CHANGE_NICK, CREATE_BATTLE, END_BATTLE, GET_BATTLES, NEXT_BATTLE_PAGE, PREV_BATTLE_PAGE, PROFILE } from "./key-actions";
import { Document } from 'mongoose';
import { Battles } from "../database/models";

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


const chunkArray = function chunkArray(array: Array<any>, size: number) {
    let result: Array<any> = [];
    for (let i = 0; i < array.length; i += size) {
        let chunk = array.slice(i, i + size)
        result.push(chunk);
    }
    return result;
}

const genBattleKeyboard = (battles: Array<any>, currPage: number, count: number) => {
    let keys: Array<any> = [];
    for (let i = 0; i < battles.length; i++) {
        keys.push(
            Keyboard.textButton({
                label: `${i + 1}`,
                color: 'secondary',
                payload: {
                    action: ABOUT_BATTLE,
                    id: battles[i].id
                }
            })
        );
    }
    keys = chunkArray(keys, 3);
    keys.push([
        Keyboard.textButton({
            label: `${currPage + 1 <= count ? 'Следующая' : '-'}`,
            color: 'positive',
            payload: {
                action: currPage + 1 <= count ? NEXT_BATTLE_PAGE : ''
            }
        }),
        Keyboard.textButton({
            label: `${currPage - 1 >= 0 ? 'Предыдущая' : '-'}`,
            color: 'negative',
            payload: {
                action: currPage - 1 >= 0 ? PREV_BATTLE_PAGE : ''
            }
        })
    ]);
    keys.push([
        Keyboard.textButton({
            label: 'Главное меню',
            color: 'primary',
            payload: {
                action: CANCEL
            }
        })
    ]);
    return Keyboard.keyboard(keys);
}

const MAIN_MENU_KEYBOARD = Keyboard.keyboard([
    [
        Keyboard.textButton({
            label: 'Создать баттл',
            color: 'secondary',
            payload: {
                action: CREATE_BATTLE
            }
        }),
        Keyboard.textButton({
            label: 'Баттлы',
            color: 'secondary',
            payload: {
                action: GET_BATTLES
            }
        })
    ],
    [
        Keyboard.textButton({
            label: 'Профиль',
            color: 'primary',
            payload: {
                action: PROFILE
            }
        })
    ],
    [
        Keyboard.textButton({
            label: 'Завершить баттл',
            color: 'secondary',
            payload: {
                action: END_BATTLE
            }
        })
    ]
]);

const PROFILE_KEYBOARD = Keyboard.keyboard([
    [
        Keyboard.textButton({
            label: 'Сменить ник',
            color: 'secondary',
            payload: {
                action: CHANGE_NICK
            }
        })
    ], 
    [
        Keyboard.textButton({
            label: "Главное меню",
            color: 'positive',
            payload: {
                action: CANCEL
            }
        })
    ]
]);

const getBattleId = (battle: Battles) => {
    let id = String(battle.id);

    return id.slice(0, 15);
}

const paginateBattles = async (vkId: number, page: number) => {
    let limit = 6;
    let count = await Battles.countDocuments({
        $or: [
            { "attacks.vkId": vkId },
            { "defenders.vkId": vkId }
        ]
    });
    let battles = await Battles.find({
        $or: [
            { "attacks.vkId": vkId },
            { "defenders.vkId": vkId }
        ]
    }).skip(page * limit).sort('asc');

    let message: string = `Список баттлов ${page + 1}\\${count}:\n`;
    for (let i = 0; i < battles.length; i++) {
        let who = battles[i].attacks.find(u => u.vkId == vkId);
        message += `${i + 1}. #${getBattleId(battles[i])} (${who ? 'Атакующий' : 'Защитник'})\n`;
    }

    let keyboard = genBattleKeyboard(battles, page, count);
    return {
        keyboard, message, battles
    }
}

export {
    chunkArray,
    genBattleKeyboard,
    MAIN_MENU_KEYBOARD,
    PROFILE_KEYBOARD,
    getBattleId,
    paginateBattles
}