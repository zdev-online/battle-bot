import mongoose from 'mongoose';

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

interface Battles {
    attacks: Array<UserInBattle>,
    defenders: Array<UserInBattle>,
    bet: string,
    chat: Chat,
    type: number,
    creator: number
}

interface EndBattle {
    createdBy: number;
    battle: Battles;
    losed: number;
}



const Schema = new mongoose.Schema({
    createdBy: { type: Number, required: true },
    battle: { type: String, required: true },
    losed: [{ type: Number, required: true }],
});

export default mongoose.model<EndBattle>('EndBattle', Schema, 'end_battle');