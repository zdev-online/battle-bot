import mongoose from '../database';

interface Users {
    nickname: string,
    vkId: number,
    regDate: number,
    canReport: boolean
}

const UsersSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    vkId: { type: Number, required: true },
    regDate: { type: Number, required: true },
    canReport: { type: Boolean, required: false, default: true}
});

export default mongoose.model<Users>('Users', UsersSchema, 'users');