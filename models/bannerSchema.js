import mongoose from 'mongoose';
const { Schema, model } = Schema;

const bannerSchema = new Schema({
    title: { type: String, required: true, },
    image: { type: String, required: true, },
    link: { type: String, required: true, },
    startDate: { type: Date, required: true, },
    endingDate: { type: Date, required: true, },
});

const Banner = model('Banner', bannerSchema);
export default Banner;