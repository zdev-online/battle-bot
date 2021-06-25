import mongoose from '../database';
import { Document } from 'mongoose';

interface Chat extends Document{
    chatId: number,
    regDate: number,
    active: boolean,
    kickGroups: boolean
}

interface Fall {
    vkId: number,
    date: number,
    chat: Chat
}

const FallSchema = new mongoose.Schema({
    vkId: { type: Number, required: true },
    date: { type: Number, required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Chats' }
}, {
    timestamps: true
});

export default mongoose.model <Fall> ('Fall', FallSchema, 'falls');