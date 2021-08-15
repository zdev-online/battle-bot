import mongoose from '../database';

interface Reports {
    closedBy: number;
    reportId: number;
    state: 'open' | 'closed';
}

const Schema = new mongoose.Schema({
    closedBy: { type: Number, required: false, default: -1 },
    reportId: { type: Number, required: true },
    state: { type: String, required: false, default: 'open'}
});

export default mongoose.model<Reports>('Report', Schema, 'reports');