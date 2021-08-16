import { StepScene } from "@vk-io/scenes";
import { resolveResource, VK, Keyboard } from "vk-io";
import { Battles, EndBattle } from "../database/models";
import { ABOUT_BATTLE, ACCEPT, ACCEPT_BATTLE, CANCEL, CANCEL_BATTLE, END_BATTLE_ACCEPT, END_BATTLE_CANCEL, ENEMY, FRIEND, INVALID, NEXT_BATTLE_PAGE, PREV_BATTLE_PAGE, SELECT_BATTLE_TYPE, SINGLE_BATTLE } from "../utils/key-actions";
import Notify from "../utils/notify";
import sendError from "../utils/sendError";
import { getBattleId, MAIN_MENU_KEYBOARD, paginateBattles } from "../utils/utils";
import config from "../config/config";

export default (vk: VK, ss: number[]) => {
    const notify = Notify(vk, ss);
    const { debug } = config;
    return [
        // Создание баттла
        new StepScene('create-battle', [
            // Союзники
            async (ctx) => {
                try {

                    if (ctx.scene.step.firstTime || !ctx.text) {
                        ctx.scene.state.attacks = [
                            { vkId: ctx.senderId, accepted: true }
                        ];
                        ctx.scene.state.defenders = [];
                        ctx.scene.state.bet = '';
                        ctx.scene.state.type = null;
                        ctx.scene.state.keys = Keyboard.keyboard([
                            [
                                Keyboard.textButton({
                                    label: "Одиночный баттл",
                                    color: 'secondary',
                                    payload: {
                                        action: SINGLE_BATTLE
                                    }
                                }),
                                Keyboard.textButton({
                                    label: "Отменить",
                                    color: 'negative',
                                    payload: {
                                        action: CANCEL
                                    }
                                })
                            ]
                        ]);

                        return await ctx.send(`Введите своих союзников через запятую! (Не более 4) \nПример: https://vk.com/id0, id0, 0, @id0, [id0|Пользователь]`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }

                    if (ctx.hasMessagePayload) {
                        switch (ctx.messagePayload.action) {
                            case SINGLE_BATTLE: {
                                return ctx.scene.step.next();
                            }
                            case CANCEL: {
                                await ctx.send(`${ctx.nickname}, создания баттла - отменено!`, { keyboard: MAIN_MENU_KEYBOARD });
                                return ctx.scene.leave();
                            }
                        }
                    }

                    let attacks_links = ctx.text.split(',').map(x => x.trim());
                    if (attacks_links.length > 4) {
                        return ctx.send(`Можно ввести не более 4 союзников!`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }
                    for (let i = 0; i < attacks_links.length; i++) {
                        let user = await resolveResource({ api: vk.api, resource: attacks_links[i] });
                        if (user.type == 'group') {
                            ctx.scene.state.attacks = [];
                            return ctx.send(`Нельзя пригласить группу в качестве союзника!\nУберите ссылку на группу и пришлите заново!`, {
                                keyboard: ctx.scene.state.keys
                            });
                        }

                        ctx.scene.state.attacks.push({
                            vkId: user.id,
                            accepted: false
                        });
                    }

                    return ctx.scene.step.next();
                } catch (e) {
                    if (e.message === 'Resource not found') {
                        return ctx.send(`Одна из ссылок пользователей - неверна!\nПроверьте ссылки и пришлите заново!`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }
                    ctx.scene.leave();
                    return sendError(ctx, 'create-battle', e);
                }
            },
            // Противники
            async (ctx) => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {
                        ctx.scene.state.keys = Keyboard.keyboard([
                            Keyboard.textButton({
                                label: "Отменить",
                                color: 'negative',
                                payload: {
                                    action: CANCEL
                                }
                            })
                        ]);
                        return ctx.send(`Введите таким же образом своих противников! (Не менее 1 и не более 5)`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }

                    if (ctx.hasMessagePayload) {
                        switch (ctx.messagePayload.action) {
                            case CANCEL: {
                                await ctx.send(`${ctx.nickname}, создания баттла - отменено!`, { keyboard: MAIN_MENU_KEYBOARD });
                                return ctx.scene.leave();
                            }
                        }
                    }

                    let a_ids = ctx.scene.state.attacks.map((x: { vkId: number; }) => x.vkId);
                    let defenders_links = ctx.text.split(',').map(x => x.trim());
                    if (defenders_links.length > 5 || defenders_links.length < 1) {
                        return ctx.send(`Введите не менее 1 и не более 5 противников!`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }
                    for (let i = 0; i < defenders_links.length; i++) {
                        let user = await resolveResource({ api: vk.api, resource: defenders_links[i] });
                        if (user.type == 'group') {
                            ctx.scene.state.defenders = [];
                            return ctx.send(`Нельзя указать группу в качестве противника!\nУберите ссылку на группу и пришлите заново!`, {
                                keyboard: ctx.scene.state.keys
                            });
                        }

                        if (a_ids.includes(user.id)) {
                            ctx.scene.state.defenders = [];
                            return ctx.send(`Нельзя указывать союзника в качестве противника!\nУберите лишнюю ссылку и повторите попытку!`);
                        }

                        ctx.scene.state.defenders.push({
                            vkId: user.id,
                            accepted: false
                        });
                    }

                    return ctx.scene.step.next();
                } catch (e) {
                    if (e.message === 'Resource not found') {
                        return ctx.send(`Одна из ссылок пользователей - неверна!\nПроверьте ссылки и пришлите заново!`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }
                    ctx.scene.leave();
                    return sendError(ctx, 'create-battle', e);
                }
            },
            // Тип баттла
            async (ctx) => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {
                        ctx.scene.state.keys = Keyboard.keyboard([
                            [
                                Keyboard.textButton({
                                    label: "На ДД",
                                    color: 'primary',
                                    payload: {
                                        type: 0,
                                        action: SELECT_BATTLE_TYPE
                                    }
                                }),
                                Keyboard.textButton({
                                    label: "От рук",
                                    color: 'primary',
                                    payload: {
                                        type: 1,
                                        action: SELECT_BATTLE_TYPE
                                    }
                                })
                            ],
                            [
                                Keyboard.textButton({
                                    label: "Отменить",
                                    color: 'negative',
                                    payload: {
                                        action: CANCEL
                                    }
                                })
                            ]
                        ]);
                        return ctx.send(`Выберите тип баттла, нажав на кнопку!`, {
                            keyboard: ctx.scene.state.keys
                        });
                    }

                    if (ctx.hasMessagePayload) {
                        switch (ctx.messagePayload.action) {
                            case SELECT_BATTLE_TYPE: {
                                ctx.scene.state.type = ctx.messagePayload.type;
                                return ctx.scene.step.next();
                            }
                            case CANCEL: {
                                await ctx.send(`${ctx.nickname}, создания баттла - отменено!`, { keyboard: MAIN_MENU_KEYBOARD });
                                return ctx.scene.leave();
                            }
                        }
                    }

                    return ctx.send(`Выберите тип баттла, нажав на кнопку!`, {
                        keyboard: ctx.scene.state.keys
                    });
                } catch (e) {
                    ctx.scene.leave();
                    return sendError(ctx, 'create-battle', e);
                }
            },
            // Ставка
            async (ctx) => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {
                        ctx.scene.state.keys = Keyboard.keyboard([
                            Keyboard.textButton({
                                label: "Отменить",
                                color: 'negative',
                                payload: {
                                    action: CANCEL
                                }
                            })
                        ]);
                        return ctx.send(`Введите ставку!`, {
                            keyboard: ctx.scene.state.keys
                        })
                    }

                    if (ctx.hasMessagePayload) {
                        switch (ctx.messagePayload.action) {
                            case CANCEL: {
                                await ctx.send(`${ctx.nickname}, создания баттла - отменено!`, { keyboard: MAIN_MENU_KEYBOARD });
                                return ctx.scene.leave();
                            }
                        }
                    }

                    ctx.scene.state.bet = ctx.text;

                    return ctx.scene.step.next();
                } catch (e) {
                    ctx.scene.leave();
                    return sendError(ctx, 'create-battle', e);
                }
            },
            // Подтверждение данных
            async (ctx) => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {
                        ctx.scene.state.keys = Keyboard.keyboard([
                            [
                                Keyboard.textButton({
                                    label: "Все верно",
                                    color: 'positive',
                                    payload: {
                                        action: ACCEPT
                                    }
                                }),
                                Keyboard.textButton({
                                    label: "Неверно",
                                    color: 'negative',
                                    payload: {
                                        action: INVALID
                                    }
                                })
                            ],
                            [
                                Keyboard.textButton({
                                    label: "Отменить",
                                    color: 'negative',
                                    payload: {
                                        action: CANCEL
                                    }
                                })
                            ]
                        ]);
                        let message: string = 'Подтвердите введенные данные:\n\n';

                        let { attacks, defenders, bet, type } = ctx.scene.state;

                        let a_users_vk = await vk.api.users.get({ user_ids: attacks.map((x: { vkId: { toString: () => string; }; }) => x.vkId.toString()) });
                        let d_users_vk = await vk.api.users.get({ user_ids: defenders.map((x: { vkId: { toString: () => string; }; }) => x.vkId.toString()) });

                        message += `Атакующие:\n`;
                        a_users_vk.forEach(({ first_name, last_name, id }, i) => {
                            message += `${i + 1}. [id${id}|${first_name} ${last_name}]\n`;
                        });

                        message += `\n`;

                        message += `Защищающиеся:\n`;
                        d_users_vk.forEach(({ first_name, last_name, id }, i) => {
                            message += `${i + 1}. [id${id}|${first_name} ${last_name}]\n`;
                        });

                        message += `\n`;
                        message += `Ставка: ${bet}\n`;
                        message += `Тип: ${attacks.length} VS ${defenders.length} ${['на ДД', 'от рук'][type]}\n`;
                        message += `\nПри нажатии 'Неверно' - данные нужно будет заполнить заново!`

                        ctx.scene.state.message = message;
                        return await ctx.send(message, {
                            keyboard: ctx.scene.state.keys
                        });
                    }

                    if (ctx.hasMessagePayload) {
                        let { attacks, defenders, bet, type } = ctx.scene.state;
                        switch (ctx.messagePayload.action) {
                            case ACCEPT: {
                                let battle = new Battles({
                                    attacks, defenders, bet, type,
                                    creator: ctx.senderId
                                });
                                let a_ids: number[] = attacks.filter((x: { accepted: boolean; }) => !x.accepted).map((x: { vkId: number; }) => x.vkId);
                                let d_ids: number[] = defenders.map((x: { vkId: number; }) => x.vkId);

                                a_ids.length && await ctx.send(`${ctx.nickname}, приглашает тебя на баттл в качестве союзника!`, {
                                    user_ids: a_ids,
                                    keyboard: Keyboard.keyboard([
                                        [
                                            Keyboard.textButton({
                                                label: 'Подробнее',
                                                color: 'positive',
                                                payload: {
                                                    id: battle.id,
                                                    action: ABOUT_BATTLE,
                                                }
                                            })
                                        ]
                                    ]).inline(true)
                                });
                                d_ids.length && await ctx.send(`${ctx.nickname}, приглашает тебя на баттл в качестве противника!`, {
                                    user_ids: d_ids,
                                    keyboard: Keyboard.keyboard([
                                        [
                                            Keyboard.textButton({
                                                label: 'Подробнее',
                                                color: 'positive',
                                                payload: {
                                                    id: battle.id,
                                                    action: ABOUT_BATTLE,
                                                }
                                            })
                                        ]
                                    ]).inline(true)
                                });
                                await battle.save();
                                ctx.scene.leave();
                                return await ctx.send(`Баттл #${getBattleId(battle)} - создан. Ожидайте подтверждения других участников!`, {
                                    keyboard: MAIN_MENU_KEYBOARD
                                });
                            }
                            case INVALID: {
                                ctx.scene.reset();
                                return ctx.send(`Неверно? Давай заново :)`);
                            }
                            case CANCEL: {
                                await ctx.send(`${ctx.nickname}, создания баттла - отменено!`, { keyboard: MAIN_MENU_KEYBOARD });
                                return ctx.scene.leave();
                            }
                        }
                    }

                    return await ctx.send(ctx.scene.state.message, {
                        keyboard: ctx.scene.state.keys
                    });
                } catch (e) {
                    ctx.scene.leave();
                    return sendError(ctx, 'create-battle', e);
                }
            }
        ]),
        // О баттле
        new StepScene('about-battle', [
            async (ctx) => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {

                        let battle = await Battles.findById(ctx.scene.state.id);
                        if (!battle) {
                            ctx.scene.leave();
                            return ctx.send(`Баттл не действителен (Удален\\Не существовал)`);
                        }
                        let message: string = `Информация о баттле #${getBattleId(battle)}\n`;
                        let type = battle.attacks.find(x => x.vkId == ctx.senderId);

                        let a_users = await vk.api.users.get({
                            user_ids: battle.attacks.map(x => x.vkId.toString())
                        });
                        let d_users = await vk.api.users.get({
                            user_ids: battle.defenders.map(x => x.vkId.toString())
                        });

                        ctx.scene.state.keys = Keyboard.keyboard([
                            [
                                Keyboard.textButton({
                                    label: "Принять",
                                    color: 'positive',
                                    payload: {
                                        id: battle.id,
                                        action: ACCEPT_BATTLE,
                                        type: type ? FRIEND : ENEMY
                                    }
                                }),
                                Keyboard.textButton({
                                    label: "Отказаться",
                                    color: 'negative',
                                    payload: {
                                        id: battle.id,
                                        action: CANCEL_BATTLE,
                                        type: type ? FRIEND : ENEMY
                                    }
                                })
                            ],
                            [
                                Keyboard.textButton({
                                    label: 'Выйти',
                                    color: 'secondary',
                                    payload: {
                                        action: CANCEL
                                    }
                                })
                            ]
                        ]);

                        message += `Ваша роль: ${type ? 'Атакующий' : 'Защищающийся'}\n`;
                        message += `Ставка: ${battle.bet}\n`;
                        message += `Тип: ${battle.attacks.length} VS ${battle.defenders.length} ${['на ДД', 'от рук'][battle.type]}\n`;
                        message += `\nАтакующие:\n`;
                        for (let i = 0; i < a_users.length; i++) {
                            let { id, first_name, last_name } = a_users[i];
                            message += `${i + 1}. [id${id}|${first_name} ${last_name}] ${id === battle.creator ? '(Создатель)' : ''}\n`;
                        }
                        message += `\nЗащищающиеся:\n`;
                        for (let i = 0; i < d_users.length; i++) {
                            let { id, first_name, last_name } = d_users[i];
                            message += `${i + 1}. [id${id}|${first_name} ${last_name}] ${id === battle.creator ? '(Создатель)' : ''}\n`;
                        }
                        ctx.scene.state.message = message;
                        ctx.scene.state.type = type;
                        return ctx.send(message, {
                            keyboard: ctx.scene.state.keys
                        });
                    }

                    if (ctx.hasMessagePayload) {
                        let { type } = ctx.scene.state;
                        switch (ctx.messagePayload.action) {
                            case ACCEPT_BATTLE: {
                                let battle = await Battles.findById(ctx.messagePayload.id);
                                if (!battle) {
                                    ctx.scene.leave();
                                    return ctx.send(`${ctx.nickname}, баттл - не действителен! (Удален\\Не существовал)`, {
                                        keyboard: ctx.scene.state.keys
                                    });
                                }
                                let aIDs: number[] = battle.attacks.filter(x => !x.accepted && x.vkId != ctx.senderId).map(x => x.vkId);
                                let dIDs: number[] = battle.defenders.filter(x => !x.accepted && x.vkId != ctx.senderId).map(x => x.vkId);

                                if (type) {
                                    battle.attacks[battle.attacks.findIndex(x => x.vkId == ctx.senderId)].accepted = true;
                                    aIDs.splice(aIDs.indexOf(ctx.senderId), 1);
                                    await battle.save();
                                } else {
                                    battle.defenders[battle.defenders.findIndex(x => x.vkId == ctx.senderId)].accepted = true;
                                    dIDs.splice(dIDs.indexOf(ctx.senderId), 1);
                                    await battle.save();
                                }


                                if (dIDs.length || aIDs.length) {
                                    await ctx.send(`${ctx.nickname} - подтвердил участие в баттле (${type ? 'Атакующий' : 'Защищающийся'}). Успей и ты!`, {
                                        user_ids: [...dIDs, ...aIDs],
                                        keyboard: Keyboard.keyboard([
                                            Keyboard.textButton({
                                                label: "Подробнее",
                                                color: 'positive',
                                                payload: {
                                                    action: ABOUT_BATTLE,
                                                    id: battle.id
                                                }
                                            })
                                        ]).inline(true)
                                    });
                                }

                                if (!dIDs.length && !aIDs.length) {
                                    await notify.battle(battle);
                                }

                                ctx.scene.leave();
                                return await ctx.send(`${ctx.nickname}, вы подтвердили участие в баттле в качестве ${type ? 'атакующего' : 'защищающегося'}!`, {
                                    keyboard: ctx.scene.state.keys
                                });
                            }
                            case CANCEL_BATTLE: {
                                let battle = await Battles.findById(ctx.messagePayload.id);
                                if (!battle) {
                                    ctx.scene.leave();
                                    return ctx.send(`${ctx.nickname}, баттл - не действителен! (Удален\\Не существовал)`, {
                                        keyboard: ctx.scene.state.keys
                                    });
                                }
                                let aIDs: number[] = battle.attacks.filter(x => !x.accepted).map(x => x.vkId);
                                let dIDs: number[] = battle.defenders.filter(x => !x.accepted).map(x => x.vkId);
                                if (type) {
                                    aIDs.splice(aIDs.indexOf(ctx.senderId), 1);
                                    battle.attacks.splice(aIDs.indexOf(ctx.senderId), 1);
                                    await battle.save();
                                } else {
                                    dIDs.splice(dIDs.indexOf(ctx.senderId), 1);
                                    battle.defenders.splice(dIDs.indexOf(ctx.senderId), 1);
                                    await battle.save();
                                }

                                if (dIDs.length || aIDs.length) {
                                    await ctx.send(`${ctx.nickname} - отказался от баттла (${type ? 'Атакующий' : 'Защищающийся'}). Но вы еще можете можете принять участие!`, {
                                        user_ids: [...dIDs, ...aIDs],
                                        keyboard: Keyboard.keyboard([
                                            Keyboard.textButton({
                                                label: "Подробнее",
                                                color: 'positive',
                                                payload: {
                                                    action: ABOUT_BATTLE,
                                                    id: battle.id
                                                }
                                            })
                                        ]).inline(true)
                                    });
                                }

                                if (!battle.attacks.length || !battle.defenders.length) {
                                    let ids: number[] = [
                                        ...battle.attacks.map(x => x.vkId),
                                        ...battle.defenders.map(x => x.vkId)
                                    ]
                                    ids.length && await ctx.send(`Баттл #${getBattleId(battle)} - удален, т.к в одной из команд не осталось участников!`, {
                                        user_ids: ids
                                    });
                                    battle.delete();
                                }

                                if (!dIDs.length && battle.attacks.length && !aIDs.length && battle.defenders.length) {
                                    await notify.battle(battle);
                                }

                                ctx.scene.leave();
                                return await ctx.send(`${ctx.nickname}, вы отказались от участия в баттле!`, {
                                    keyboard: MAIN_MENU_KEYBOARD
                                });
                            }
                            case CANCEL: {
                                if (ctx.scene.state.battleList) {
                                    ctx.scene.leave();
                                    ctx.scene.enter('battle-list');
                                    return;
                                }
                                ctx.scene.leave();
                                return ctx.send(`${ctx.nickname}, вы вышли в главное меню!`, {
                                    keyboard: MAIN_MENU_KEYBOARD
                                });
                            }
                        }
                    }

                    return ctx.send(ctx.scene.state.message, {
                        keyboard: ctx.scene.state.keys
                    });
                } catch (e) {
                    ctx.scene.leave();
                    return sendError(ctx, 'about-battle', e);
                }
            }
        ]),
        // Список баттлов
        new StepScene('battle-list', [
            async ctx => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {
                        ctx.scene.state.page = 0;
                        let data = await paginateBattles(ctx.senderId, ctx.scene.state.page);
                        ctx.scene.state = { ...ctx.scene.state, ...data };
                        if (!data.battles.length) {
                            ctx.scene.leave();
                            return ctx.send(`${ctx.nickname}, вызовов на баттл - нет!`);
                        }
                        return ctx.send(ctx.scene.state.message, {
                            keyboard: ctx.scene.state.keyboard
                        });
                    }

                    if (ctx.hasMessagePayload) {
                        switch (ctx.messagePayload.action) {
                            case ABOUT_BATTLE: {
                                ctx.scene.leave();
                                ctx.scene.enter('about-battle');
                                ctx.scene.state.id = ctx.messagePayload.id;
                                ctx.scene.state.battleList = true;
                                return;
                            }
                            case NEXT_BATTLE_PAGE: {
                                ctx.scene.state.page += 1;
                                let data = await paginateBattles(ctx.senderId, ctx.scene.state.page);
                                ctx.scene.state = { page: ctx.scene.state.page, ...data };
                                return ctx.send(ctx.scene.state.message, {
                                    keyboard: ctx.scene.state.keyboard
                                });
                            }
                            case PREV_BATTLE_PAGE: {
                                ctx.scene.state.page -= 1;
                                let data = await paginateBattles(ctx.senderId, ctx.scene.state.page);
                                ctx.scene.state = { page: ctx.scene.state.page, ...data };
                                return ctx.send(ctx.scene.state.message, {
                                    keyboard: ctx.scene.state.keyboard
                                });
                            }
                            case CANCEL: {
                                ctx.scene.leave();
                                return ctx.send(`${ctx.nickname}, вы вышли в главное меню!`, {
                                    keyboard: MAIN_MENU_KEYBOARD
                                });
                            }
                        }
                    }

                    return ctx.send(ctx.scene.state.message, {
                        keyboard: ctx.scene.state.keyboard
                    });
                } catch (e) {
                    ctx.scene.leave();
                    return sendError(ctx, 'battle-list', e);
                }
            }
        ]),
        // Заявка на завершение баттла
        // new StepScene('end-battle', [
        //     async ctx => {
        //         try {
        //             if (ctx.scene.step.firstTime || !ctx.text) {
        //                 return ctx.send(`Пришли мне ID | Ссылки проигравших через запятую!`, {
        //                     keyboard: Keyboard.keyboard([
        //                         Keyboard.textButton({ label: 'Отмена', color: 'negative', payload: { action: CANCEL } })
        //                     ])
        //                 });
        //             }

        //             if (ctx.messagePayload && ctx.messagePayload.action) {
        //                 switch (ctx.messagePayload.action) {
        //                     case CANCEL: {
        //                         ctx.scene.leave();
        //                         return ctx.send('Отмена заявки на завершения баттла!', {
        //                             keyboard: MAIN_MENU_KEYBOARD
        //                         });
        //                     }
        //                 }
        //             }

        //             let losed = ctx.text.split(',');
        //             if (!losed.length) { return ctx.send(`Пришли мне ID | Ссылки проигравших через запятую!`); }

        //             let losedIds = [];
        //             for (let i = 0; i < losed.length; i++) {
        //                 let res = await resolveResource({ api: vk.api, resource: losed[i] });
        //                 if (res.type != 'user') {
        //                     return ctx.send(`Ссылка должна указывать на пользователя!`);
        //                 }
        //                 losedIds.push(res.id);
        //             }

        //             ctx.scene.state.losed = losedIds;

        //             return ctx.scene.step.next();
        //         } catch (e) {
        //             if (e.message == 'Resource not found') {
        //                 return ctx.send(`Одна из ссылок - неправильная. Исправьте ссылку и пришлите снова.`);
        //             }
        //             ctx.scene.leave();
        //             return sendError(ctx, 'end-battle', e);
        //         }
        //     },
        //     async ctx => {
        //         try {
        //             if (ctx.scene.step.firstTime || !ctx.text) {
        //                 return ctx.send(`Пришли мне ID баттла и 3 скриншота (2 скрина - слёт противника, 1 скрин - сама беседа и её участники)`, {
        //                     keyboard: Keyboard.keyboard([
        //                         Keyboard.textButton({ label: 'Отмена', color: 'negative', payload: { action: CANCEL } })
        //                     ])
        //                 });
        //             }

        //             let battleId = ctx.text.replace('#', '');
        //             let [battle] = await Battles.find({ $where: `/${battleId}/i.test(this._id.str)` });
        //             if (!battle) {
        //                 return ctx.send(`Баттл с таким ID - не найден! Исправьте ID и отправьте снова! Вместе со скриншотами!`);
        //             }

        //             let photos = ctx.attachments ? ctx.attachments.filter(x => x.type == 'photo').map(x => x.toString()) : [];
        //             if (!photos.length || photos.length < 3) {
        //                 return ctx.send(`Пришлите 3 скриншота (2 скрина - слёт противника, 1 скрин - сама беседа и её участники), вместе с ID баттла`);
        //             }

        //             let end_battle = await EndBattle.create({
        //                 battle: battleId,
        //                 createdBy: ctx.senderId,
        //                 losed: ctx.scene.state.losed
        //             });
        //             debug && console.log(`Photos: ${JSON.stringify(photos)}`)
        //             let [{ first_name, last_name }] = await vk.api.users.get({ user_ids: ctx.senderId.toString() });
        //             let message = `Заявка на заверешение баттла от пользователя [id${ctx.senderId}|${first_name} ${last_name}].`;
        //             await ctx.send(message, {
        //                 peer_ids: ctx.allStuffIds,
        //                 attachment: photos,
        //                 keyboard: Keyboard.keyboard([
        //                     Keyboard.textButton({
        //                         label: "Принять",
        //                         color: "positive",
        //                         payload: {
        //                             action: END_BATTLE_ACCEPT,
        //                             id: end_battle.id
        //                         }
        //                     }),
        //                     Keyboard.textButton({
        //                         label: "Отказать",
        //                         color: "negative",
        //                         payload: {
        //                             action: END_BATTLE_CANCEL,
        //                             id: end_battle.id
        //                         }
        //                     })
        //                 ]).inline(true)
        //             });
        //             ctx.scene.leave();
        //             return ctx.send(`Заявка отправлена!`, {
        //                 keyboard: MAIN_MENU_KEYBOARD
        //             });
        //         } catch (e) {
        //             ctx.scene.leave();
        //             return sendError(ctx, 'end-battle', e);
        //         }
        //     }
        // ])
    ]
}
