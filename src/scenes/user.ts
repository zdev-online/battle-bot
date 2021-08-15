import { StepScene } from "@vk-io/scenes";
import { resolveResource, VK, Keyboard } from "vk-io";
import { Users } from "../database/models";
import { REG_USER, CHANGE_NICK, CANCEL, INVALID, ACCEPT } from "../utils/key-actions";
import { MAIN_MENU_KEYBOARD, PROFILE_KEYBOARD } from "../utils/utils";

export default (vk: VK) => {
    return [
        // Регистрация
        new StepScene('reg-user', [
            ctx => {
                if (ctx.scene.step.firstTime || !ctx.text) {
                    return ctx.send(`Чтобы продолжить пользоваться ботом, нужно зарегистроваться в баттл-системе, пришлите мне свой ник!`, {
                        keyboard: Keyboard.keyboard([])
                    });
                }

                if (ctx.text.length > 50) {
                    return ctx.send(`Ник не может быть длиной более 50-ти символов!`);
                }

                ctx.scene.state.nickname = String(ctx.text);

                return ctx.scene.step.next();
            },
            async ctx => {
                if (ctx.scene.step.firstTime || !ctx.text || !ctx.messagePayload) {
                    return ctx.send(`Зарегистроваться под ником: ${ctx.scene.state.nickname}?`, {
                        keyboard: Keyboard.keyboard([
                            Keyboard.textButton({ label: "Да", color: 'positive', payload: { action: 'ACCEPT' } }),
                            Keyboard.textButton({ label: "Нет", color: 'negative', payload: { action: 'CANCEL' } })
                        ])
                    });
                }

                if (ctx.messagePayload && ctx.messagePayload.action) {
                    if (ctx.messagePayload.action == 'ACCEPT') {
                        await Users.create({
                            nickname: ctx.scene.state.nickname,
                            regDate: new Date().getTime(),
                            vkId: ctx.senderId
                        });
                        ctx.send(`Поздравляю [id${ctx.senderId}|${ctx.scene.state.nickname}], вы зарегистрированы в баттл-системе!`, {
                            keyboard: MAIN_MENU_KEYBOARD
                        });
                        return ctx.scene.leave();
                    }
                    if (ctx.messagePayload.action == 'CANCEL') {
                        ctx.send(`Без регистрации вы не сможете: Создавать \\ Принимать вызовы на баттл!`, {
                            keyboard: Keyboard.keyboard([
                                Keyboard.textButton({
                                    label: "Зарегистрироваться",
                                    color: 'positive',
                                    payload: {
                                        action: REG_USER
                                    }
                                }),
                            ])
                        });
                        return ctx.scene.leave();
                    }
                }
                return ctx.send(`Зарегистроваться под ником: ${ctx.scene.state.nickname}?`, {
                    keyboard: Keyboard.keyboard([
                        Keyboard.textButton({ label: "Да", color: 'positive', payload: { action: 'ACCEPT' } }),
                        Keyboard.textButton({ label: "Нет", color: 'negative', payload: { action: 'ACCEPT' } })
                    ])
                });
            }
        ]),
        // Профиль
        new StepScene('profile', [
            ctx => {
                if (ctx.scene.step.firstTime || !ctx.text) {
                    return ctx.send(`Нажмите одну из кнопок!`, {
                        keyboard: PROFILE_KEYBOARD
                    });
                }

                if (ctx.messagePayload) {
                    switch (ctx.messagePayload.action) {
                        case CHANGE_NICK: {
                            ctx.scene.leave();
                            ctx.scene.enter('change-nickname');
                            return;
                        }
                        case CANCEL: {
                            ctx.scene.leave();
                            return ctx.send(`${ctx.nickname}, вы вышли в главное меню!`, {
                                keyboard: MAIN_MENU_KEYBOARD
                            });
                        }
                    }
                }

                return ctx.send(`${ctx.nickname}, нажмите одну из кнопок!`, {
                    keyboard: PROFILE_KEYBOARD
                });
            }
        ]),
        // Смена ника
        new StepScene('change-nickname', [
            (ctx) => {
                if (ctx.scene.step.firstTime || !ctx.text) {
                    return ctx.send(`${ctx.nickname}, пришли мне новый ник!`, {
                        keyboard: Keyboard.keyboard([
                            Keyboard.textButton({
                                label: "Отменить",
                                color: 'negative',
                                payload: {
                                    action: CANCEL
                                }
                            })
                        ])
                    });
                }

                if (ctx.messagePayload) {
                    switch (ctx.messagePayload.action) {
                        case CANCEL: {
                            ctx.scene.leave();
                            ctx.scene.enter('profile');
                            return;
                        }
                    }
                }

                ctx.scene.state.nickname = ctx.text;
                return ctx.scene.step.next();
            },

            async ctx => {
                if (ctx.scene.step.firstTime || !ctx.text || !ctx.messagePayload) {
                    return ctx.send(`${ctx.nickname}, хочешь сменить ник на [id${ctx.senderId}|${ctx.scene.state.nickname}]`, {
                        keyboard: Keyboard.keyboard([
                            [
                                Keyboard.textButton({
                                    label: "Да",
                                    color: 'positive',
                                    payload: { action: ACCEPT }
                                }),
                                Keyboard.textButton({
                                    label: "Нет",
                                    color: 'negative',
                                    payload: { action: INVALID }
                                }),
                            ],
                            [
                                Keyboard.textButton({
                                    label: "Отменить",
                                    color: 'secondary',
                                    payload: { action: CANCEL }
                                })
                            ]
                        ])
                    });
                }

                switch(ctx.messagePayload.action){
                    case ACCEPT: {
                        let user = await Users.findOne({ vkId: ctx.senderId });
                        if(!user){ ctx.scene.leave(); return ctx.send(`Вы не зарегистрованы!`); }
                        user.nickname = ctx.scene.state.nickname;
                        await user.save();
                        ctx.scene.leave();
                        ctx.scene.enter('profile');
                        return ctx.send(`Теперь у тебя ник: [id${ctx.senderId}|${user.nickname}]`);
                    }
                    case INVALID: {
                        ctx.send(`${ctx.nickname}, ну, раз нет, то давай начнем сначала!`);
                        return ctx.scene.step.previous();
                    }
                    case CANCEL: {
                        ctx.scene.leave();
                        ctx.scene.enter('profile');
                        return;
                    }
                }
            }
        ])
    ]
}