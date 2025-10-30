//importing necessary modules and functions
import mongoose from 'mongoose';



const { Schema, model } = Schema;



//defining banner schema for the admin
const bannerSchema = new Schema({
    title: { type: String, required: true, },
    image: { type: String, required: true, },
    link: { type: String, required: true, },
    startDate: { type: Date, required: true, },
    endingDate: { type: Date, required: true, },
});



//creating model for Banner
const Banner = model('Banner', bannerSchema);
export default Banner;