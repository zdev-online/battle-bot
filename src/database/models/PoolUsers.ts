import mongoose from '../database';

interface PoolUsers {
    forId: number,
    checkId: number
}

const PoolUsers = new mongoose.Schema({
    forId: { type: Number, required: true },
    checkId: { type: Number, required: true }
});

export default mongoose.model<PoolUsers>('PoolUsers', PoolUsers, 'pool_users');