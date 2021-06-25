import { MessageContext } from "vk-io";
import { MAIN_MENU_KEYBOARD } from "./utils";

export default (ctx: MessageContext, desc: String, e: Error) => {
    console.error(`[${desc}]: ${e.message}\n${e.stack}`);
    return ctx.send(`Произошла ошибка! Обратитесь к разработчику!`, {
        keyboard: MAIN_MENU_KEYBOARD
    });
}