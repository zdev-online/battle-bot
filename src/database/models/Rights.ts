import mongoose from '../database';


interface Rights {
    vkId: number;
    canInviteGroups: boolean;
}

const RightsSchema = new mongoose.Schema({
    vkId: { type: Number, required: true },
    canInviteGroups: { type: Boolean, required: false, default: false }
});

export default mongoose.model <Rights> ('Rights', RightsSchema, 'rights');