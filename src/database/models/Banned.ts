import mongoose from '../database';

interface Banned {
    vkId: number;
    banBy: number;
    reason: string;
    unbanTime: Date;
}

const Banned = new mongoose.Schema({
    vkId: { type: Number, required: true },
    banBy: { type: Number, required: true },
    reason: { type: String, required: true },
    unbanTime: { type: Date, required: true }
});

export default mongoose.model('Banned', Banned, 'bans');