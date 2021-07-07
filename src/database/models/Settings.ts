import mongoose from '../database';

interface Settings {
    maxSmiles: number
}

const Settings = new mongoose.Schema({
    key: { type: String, required: false, default: 'settings-key' },
    maxSmiles: { type: Number, required: false, default: 0 }
});

export default mongoose.model <Settings>('Settings', Settings, 'settings');