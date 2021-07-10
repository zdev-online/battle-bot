import mongoose from '../database';

interface Chat {
    chatId: number,
    regDate: number,
    active: boolean,
    kickGroups: boolean,
    isBattle: boolean,
    smileFilter: boolean
}

const ChatSchema = new mongoose.Schema({
    chatId: { type: Number, required: true },
    regDate: { type: Number, required: true },
    active: { type: Boolean, required: false, default: true },
    kickGroups: { type: Boolean, required: false, default: true },
    isBattle: { type: Boolean, required: false, default: false },
    smileFilter: { type: Boolean, required: false, default: true }
});

export default mongoose.model <Chat> ('Chats', ChatSchema, 'chats');