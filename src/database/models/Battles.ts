import mongoose from '../database';
import { Document } from 'mongoose';

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

const BatllesSchema = new mongoose.Schema({
    attacks: [
        {
            vkId: { type: Number, required: true },
            accepted: { type: Boolean, required: true }
        }
    ],
    defenders: [
        {
            vkId: { type: Number, required: true },
            accepted: { type: Boolean, required: true }
        }
    ],
    bet: { type: String, required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chats', required: false },
    type: { type: Number, requried: true },
    creator: { type: Number, required: true }
}, {
    timestamps: true
});

export default mongoose.model<Battles>("Batlles", BatllesSchema, 'battles');