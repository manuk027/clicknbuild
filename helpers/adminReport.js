import dayjs from 'dayjs';
import Order from '../models/ordersSchema.js';

export async function getFilteredOrders(query) {
    const { range, from, to } = query;
    let match = {};
    if (range === "daily") {
        match.createdAt = { $gte: dayjs().startOf("day").toDate(), $lte: dayjs().endOf("day").toDate(), };
    }
    if (range === "weekly") {
        match.createdAt = { $gte: dayjs().startOf("week").toDate(), $lte: dayjs().endOf("week").toDate(), };
    }
    if (range === "monthly") {
        match.createdAt = { $gte: dayjs().startOf("month").toDate(), $lte: dayjs().endOf("month").toDate(), };
    }
    if (range === "yearly") {
        match.createdAt = { $gte: dayjs().startOf("year").toDate(), $lte: dayjs().endOf("year").toDate(), };
    }
    if (range === "custom") {
        match.createdAt = { $gte: new Date(from), $lte: new Date(to), };
    }
    return Order.find(match).populate("appliedOffer").sort({ createdAt: -1 }).lean();
}