import mongoose from "mongoose";

const faceDescriptorSchema = new mongoose.Schema({
    descriptor: { type: [mongoose.Schema.Types.Number], required: true },
    snapshot: { type: String, required: true },
    createdAt : { type: Date, default: Date.now },
});

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    faceDescriptors: [faceDescriptorSchema],
    createdAt: { type: Date, default: Date.now },
    lastSessionDate: { type: Date, default: Date.now },
    sessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }]
}); 

export const Client = mongoose.model("Client", clientSchema);