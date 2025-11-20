import mongoose from 'mongoose';


const walletSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, },
    type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
    amount: { type: Number, required: true, },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, },
    previousBalance: { type: Number, required: true, },
    currentBalance: { type: Number, required: true, },
    createdAt: { type: Date, default: Date.now },
});

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;