import { StepScene } from "@vk-io/scenes";
import { resolveResource, VK, Keyboard } from "vk-io";
import { Battles, Reports } from "../database/models";
import { ABOUT_BATTLE, ACCEPT, ACCEPT_BATTLE, CANCEL, CANCEL_BATTLE, ENEMY, FRIEND, INVALID, NEXT_BATTLE_PAGE, PREV_BATTLE_PAGE, SELECT_BATTLE_TYPE, SINGLE_BATTLE } from "../utils/key-actions";
import Notify from "../utils/notify";
import sendError from "../utils/sendError";
import { getBattleId, MAIN_MENU_KEYBOARD, paginateBattles } from "../utils/utils";
import config from '../config/config';


export default (vk: VK, ss: number[]) => {
    const notify = Notify(vk, ss);
    const { debug } = config;
    return [
        new StepScene('report-answer', [
            async ctx => {
                try {
                    if (ctx.scene.step.firstTime || !ctx.text) {
                        debug && console.log(`DEBUG-REPORT: `, JSON.stringify(ctx.scene.state));
                        let report = await Reports.findById(ctx.scene.state.id);
                        if (!report) {
                            debug && console.log(`Report-Debug-If-Not-Report-Enter`)
                            ctx.scene.leave();
                            return ctx.send(`Репорт с таким ID не найден!`);
                        }
                        if (report.state != 'open') {
                            debug && console.log(`Report-Debug-If-Closed-Report`)
                            let [{ first_name, last_name, id }] = await vk.api.users.get({ user_ids: report.closedBy.toString() });
                            debug && console.log(`Report-Debug-If-Closed-Report-Users-Get`)
                            ctx.scene.leave();
                            return await ctx.send(`Администратор [id${id}|${first_name} ${last_name}] уже ответил на этот репорт!`, {
                                keyboard: MAIN_MENU_KEYBOARD
                            });
                        }
                        debug && console.log(`Report-Debug-Get-Answer`)
                        let [{ first_name, last_name, id }] = await vk.api.users.get({ user_ids: report.reportId.toString() });
                        return ctx.send(`Введите ответ на репорт для пользователя [id${id}|${first_name} ${last_name}]`, {
                            keyboard: Keyboard.keyboard([
                                Keyboard.textButton({
                                    label: "Отмена",
                                    color: 'negative',
                                    payload: {
                                        action: CANCEL
                                    }
                                })
                            ])
                        });
                    }

                    console.log(`Report-Debug-3`)

                    if (ctx.messagePayload) {
                        ctx.scene.leave();
                        return ctx.send(`Ответ на репорт - отменен!`, {
                            keyboard: MAIN_MENU_KEYBOARD
                        });
                    }

                    console.log(`Report-Debug-3`)
                    let report = await Reports.findById(ctx.scene.state.id);
                    if (!report) {
                        ctx.scene.leave();
                        return ctx.send(`Репорт с таким ID не найден!`);
                    }

                    let [{ first_name, last_name, id }] = await vk.api.users.get({ user_ids: ctx.senderId.toString() });
                    await ctx.send(`Ответ от администратора [id${id}|${first_name} ${last_name}] на репорт!\nОтвет: ${ctx.text}`, {
                        user_ids: report.reportId
                    });
                    report.closedBy = ctx.senderId;
                    report.state = 'closed';
                    await report.save();
                    ctx.scene.leave();
                    return await ctx.send(`Ответ отправлен!`, {
                        keyboard: MAIN_MENU_KEYBOARD
                    });
                } catch (e) {
                    ctx.scene.leave();
                    return sendError(ctx, 'report-scene', e);
                }
            }
        ])
    ]
}