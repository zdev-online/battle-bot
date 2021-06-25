import mongoose from '../database';

interface Stuff {
    vkId: number,
    date: number
}

const StuffSchema = new mongoose.Schema({
    vkId: { type: Number, required: true },
    date: { type: Number, required: true }
});

export default mongoose.model <Stuff> ('Stuff', StuffSchema, 'stuff');