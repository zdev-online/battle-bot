import mongoose from '../database';
import { Document } from 'mongoose';

interface Chat extends Document{
    chatId: number,
    regDate: number,
    active: boolean,
    kickGroups: boolean
}

interface Admins {
    vkId: number,
    date: number,
    chat: Chat
}

const AdminsSchema = new mongoose.Schema({
    vkId: { type: Number, required: true },
    date: { type: Number, required: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chats', required: true }
});

export default mongoose.model <Admins> ('admins', AdminsSchema, 'admins');