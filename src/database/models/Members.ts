import mongoose from '../database';
import { Document } from 'mongoose';

interface Chat extends Document {
    chatId: number,
    regDate: number,
    active: boolean,
    kickGroups: boolean,
    isBattle: boolean
}

interface Member {
    vkId: number,
    chat: Chat,
    lastMessage: number
}

const MemberSchema = new mongoose.Schema({
    vkId: { type: Number, required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Chats' },
    lastMessage: { type: Number, required: true }
});

export default mongoose.model <Member>('Members', MemberSchema, 'members');