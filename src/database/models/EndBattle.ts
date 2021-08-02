import mongoose from 'mongoose';

interface EndBattle {
    createdBy: number;
    battleId: string;
}

const Schema = new mongoose.Schema({
    createdBy: { type: Number, required: true },
    battle: { type: String, required: true },
});

export default mongoose.model<EndBattle>('EndBattle', Schema, 'end_battle');