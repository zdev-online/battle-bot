import mongoose from '../database';
import { Document } from 'mongoose';

interface Chat extends Document {
    chatId: number,
    regDate: number,
    active: boolean,
    kickGroups: boolean
}

interface Whitelist {
    vkId: number
}

const WhiteListSchema = new mongoose.Schema({
    vkId: { type: Number, required: true }
});

export default mongoose.model <Whitelist> ("WhiteList", WhiteListSchema, 'whitelist');