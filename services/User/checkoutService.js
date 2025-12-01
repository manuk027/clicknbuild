import User from "../../models/userSchema.js";
import Category from "../../models/categorySchema.js";
import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js"
import Order from '../../models/ordersSchema.js';
import mongoose from "mongoose";
import { generateSKU } from "../../helpers/skugenerator.js";
import Product from '../../models/productSchema.js';
import Coupon from '../../models/couponSchema.js';
import CouponUsage from '../../models/couponUsage.js';
import { razorpay } from "../../config/razorPay.js";
import crypto from 'crypto';
import Wallet from '../../models/walletSchema.js';
import { v4 as uuidv4 } from "uuid";
import { HttpStatus } from "../../helpers/statusCodes.js";
// import Wallet from '../../models/walletSchema.js';



const transactionId = uuidv4();



export const loadCheckoutService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;

    try {
        const user = await User.findById(userId);

        let appliedCoupon = req.body?.couponId || '';

        const peripheral = await Category.find({ isPeripheral: true, isListed: true });
        const component = await Category.find({ isComponent: true, isListed: true });

        let address = await Address.findOne({ userId });
        address = address ? address.address : [];

        const cart = await Cart.findOne({ userId })
            .populate({
                path: "items.productId",
                model: "Product",
                populate: [
                    { path: "brand", model: "Brand", select: "name" },
                    { path: "category", model: "Category" }
                ]
            })
            .lean();

        if (!cart || !cart.items.length) {
            return res.redirect("/cart");
        }

        const unUsedCoupons = await CouponUsage.find({ userId, used: false }).populate("couponId");
        let filteredItem = [];
        let totalOriginalPrice = 0;
        let totalAmount = 0;

        for (const item of cart.items) {
            const product = item.productId;
            if (!product || !product.variants) continue;

            const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
            if (!variant || variant.quantity <= 0) continue;

            const variantPrice = variant.price;
            const variantOfferPrice = variant.offer || null;

            // PRODUCT OFFER
            let finalVariantPrice = variantPrice;
            let variantDiscount = 0;
            if (variantOfferPrice && variantOfferPrice < variantPrice) {
                finalVariantPrice = variantOfferPrice;
                variantDiscount = variantPrice - variantOfferPrice;
            }

            // CATEGORY OFFER
            let categoryDiscount = 0;
            let finalCategoryPrice = variantPrice;
            if (product.category?.maxOffer) {
                categoryDiscount = (variantPrice * product.category.maxOffer) / 100;
                finalCategoryPrice = variantPrice - categoryDiscount;
            }

            // Final chosen offer price
            let finalPrice = variantPrice;
            if (variantDiscount > categoryDiscount) {
                finalPrice = finalVariantPrice;
            } else if (categoryDiscount > variantDiscount) {
                finalPrice = finalCategoryPrice;
            }

            totalOriginalPrice += variantPrice * item.quantity;
            totalAmount += finalPrice * item.quantity;

            filteredItem.push({
                ...item,
                productId: {
                    ...product,
                    selectedVariant: variant
                },
                originalPrice: Number(variantPrice.toFixed(2)),
                offerPrice: Number(finalPrice.toFixed(2)),
                subTotal: Number((finalPrice * item.quantity).toFixed(2))
            });
        }

        if (!filteredItem.length) return res.redirect("/cart");

        const noCPNAmount = Number(totalAmount.toFixed(2));
        let deliveryCharge = totalAmount >= 50000 ? 0 : 199;
        let coupon;
        let couponOffer = 0;
        if (appliedCoupon) {
            coupon = await Coupon.findById(appliedCoupon);

            if (!coupon) {
                return res.json({ success: false, message: "Invalid coupon selected." });
            }

            if (totalOriginalPrice < coupon.minimumPurchase) {
                return res.json({ success: false, message: "Cannot apply coupon — minimum amount not met." });
            }

            couponOffer = (totalAmount * coupon.discount) / 100;
            totalAmount -= couponOffer;
        }
        couponOffer = Number(couponOffer.toFixed(2));
        totalAmount = Number(totalAmount.toFixed(2));
        deliveryCharge = Number(deliveryCharge.toFixed(2));
        const finalPayable = Number((totalAmount + deliveryCharge).toFixed(2));

        const wallet = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
        return res.render("checkout", {
            user,
            peripheral,
            component,
            cart: filteredItem,
            address,
            totalprice: Number(totalOriginalPrice.toFixed(2)),
            totalAmount: finalPayable,
            deliveryCharge,
            coupon: unUsedCoupons,
            appliedCoupon: coupon || null,
            couponOffer,
            noCPNAmount,
            walletBalance: wallet.currentBalance,
        });
    } catch (error) {
        console.error("Error loading checkout:", error);
        return res.redirect("/pageNotFound");
    }
};



export const addAddressService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { fullName, phoneNumber, address, district, pincode, city, state, landmark } = req.body;
        if (!req.body || !userId) {
            return res.json({ success: false, message: "Address was not added." });
        }
        let userAddress = await Address.findOne({ userId });
        const newAddress = {
            fullName,
            phoneNumber,
            address,
            district,
            state,
            city,
            pincode,
            landmark,
        };
        if (!userAddress) {
            userAddress = new Address({
                userId,
                address: [newAddress],
            });
        } else {
            userAddress.address.push(newAddress);
        }
        await userAddress.save();
        return res.json({ success: true, message: "Address was added." });
    } catch (error) {
        console.error("Error adding address at checkout : ", error);
        return res.json({ success: false, message: "Server error while adding address." });
    }
};



export const loadSummaryService = async (req, res) => {
    const userId = req.user?._id || req.session?.user;
    try {
        const { address, products, paymentMethod, couponId, transaction } = req.body;
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const lastOrder = await Order.findOne({ orderId: { $regex: `^ORD${datePart}` } }).sort({ createdAt: -1 }).lean();
        let nextSequence = 1;
        if (lastOrder?.orderId) {
            const lastSeq = parseInt(lastOrder.orderId.split("-")[1], 10);
            nextSequence = lastSeq + 1;
        }
        const orderId = `ORD${datePart}-${String(nextSequence).padStart(4, "0")}`;
        const items = [];
        for (const prod of products) {
            const productDoc = await Product.findById(prod.productId).populate("brand category").lean();
            if (!productDoc) {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Product out of stock" });
            }
            const brand = productDoc.brand?.name;
            const category = productDoc.category?.name;
            const model = productDoc.model;
            const variantData = productDoc.variants.find((v) => v._id.toString() === prod.variantId.toString());
            if (!variantData) {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: "Variant out of stock" });
            }
            if (variantData.quantity < prod.quantity) {
                return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: `Insufficient stock for ${prod.name}. Available: ${variantData.quantity}`, });
            }
            const variantName = variantData.variant;
            const sku = generateSKU(brand, model, variantName, category);
            const variantPrice = variantData.price;
            const variantOfferPrice = variantData.offer || null;
            let finalVariantPrice = variantPrice;
            if (variantOfferPrice && variantOfferPrice < variantPrice) {
                finalVariantPrice = variantOfferPrice;
            }
            const variantDiscount = variantPrice - finalVariantPrice;
            let categoryDiscount = 0;
            let finalCategoryPrice = variantPrice;
            if (productDoc.category?.maxOffer) {
                const catOffer = productDoc.category.maxOffer;
                categoryDiscount = (variantPrice * catOffer) / 100;
                finalCategoryPrice = variantPrice - categoryDiscount;
            }
            let finalPrice = variantPrice;
            let appliedOffer = "None";
            if (variantDiscount > categoryDiscount) {
                finalPrice = finalVariantPrice;
                appliedOffer = "Product Offer"
            } else if (categoryDiscount > variantDiscount) {
                finalPrice = finalCategoryPrice;
                appliedOffer = "Category Offer"
            }
            items.push({
                productId: new mongoose.Types.ObjectId(prod.productId),
                variantId: prod.variantId,
                name: prod.name,
                sku,
                price: variantPrice,
                salePrice: finalPrice,
                quantity: prod.quantity,
                subTotal: finalPrice * prod.quantity,
                appliedOffer: appliedOffer,
                category: category,
                coverImage: prod.image,
                status: "Pending",
                refundAmount: 0,
                cancelReason: "none",
                returnReason: "none",
                returnApprove: false,
            });
        }
        const today = new Date();
        const deliveryDate = new Date(today);
        deliveryDate.setDate(today.getDate() + 7);
        const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-CA");
        let totalAmount = items.reduce((sum, i) => sum + i.subTotal, 0);
        const coupon = await Coupon.findById(couponId);
        if (coupon) {
            const discountAmount = (totalAmount * coupon.discount) / 100;
            totalAmount = totalAmount - discountAmount;
            const couponUsed = await CouponUsage.findOneAndUpdate({ userId, couponId }, { $set: { used: true } });
        }
        let deliveryFee = totalAmount > 50000 ? 0 : 199;
        let transactionDetails;
        if (paymentMethod === "Online") {
            transactionDetails = {
                amount: transaction.amount / 100,
                paymentMethod: transaction.paymentMethod,
                paymentType: transaction.method,
                status: "Paid",
                transactionId: transaction.acquirer_data?.upi_transaction_id || transaction.acquirer_data?.rrn || transaction.id,
                time: Date.now(),
            }
        } else if (paymentMethod === "COD") {
            transactionDetails = {
                amount: totalAmount,
                paymentMethod: "COD",
                paymentType: null,
                status: "Pending",
                transactionId: null,
                time: Date.now(),
            }
        } else if (paymentMethod === 'Wallet') {
            const lastBalance = await Wallet.findOne({ userId }).sort({ createdAt: -1 });
            if (!lastBalance || lastBalance.currentBalance < totalAmount) {
                return res.json({ success: false, message: "No enough balance in the wallet!" });
            }
            transactionDetails = {
                amount: totalAmount,
                paymentMethod: 'Wallet',
                paymentType: null,
                status: "Pending",
                transactionId: uuidv4(),
                time: Date.now(),
            }
            await Wallet.create({
                transactionId: transactionDetails.transactionId,
                userId: userId,
                type: "DEBIT",
                amount: totalAmount + deliveryFee,
                orderId: orderId,
                previousBalance: lastBalance.currentBalance,
                currentBalance: lastBalance.currentBalance - totalAmount,
                createdAt: Date.now(),
            })
        }
        const newOrder = new Order({
            userId,
            orderId,
            address: {
                fullName: address.fullName,
                phoneNumber: address.phoneNumber,
                address: address.address,
                district: address.district,
                state: address.state,
                city: address.city,
                pincode: address.pincode,
                landmark: address.landmark || " ",
            },
            items,
            deliveryFee,
            totalAmount: totalAmount + deliveryFee,
            paymentMethod: paymentMethod,
            deliveryDate: formattedDeliveryDate,
            appliedOffer: couponId,
            transaction: transactionDetails,
            orderStatus: "Pending",
        });
        await newOrder.save();
        for (const item of items) {
            const updateResult = await Product.updateOne({ _id: item.productId, "variants._id": item.variantId }, { $inc: { "variants.$.quantity": -item.quantity } }
            );
            if (updateResult.modifiedCount === 0) {
                console.warn(`Failed to update stock for product ${item.productId}`);
            }
        }
        const updatedCart = await Cart.findOneAndDelete({ userId });
        if (req.xhr || req.headers["content-type"]?.includes("application/json")) {
            return res.status(HttpStatus.OK).json({ success: true, message: "Order placed successfully!", received: newOrder, });
        }
    } catch (error) {
        console.error("Error loading the order Summary:", error);
        return res.redirect("/pageNotFound");
    }
};



export const createOrderService = async (req, res) => {
    try {
        const amount = Number(req.body.amount);
        if (!amount || amount <= 0) {
            return res.json({ success: false, message: "Invalid amount" });
        }
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: "order_" + Date.now()
        };
        const order = await razorpay.orders.create(options);
        return res.json({ success: true, order });
    } catch (error) {
        console.error("Razorpay create order error:", error);
        return res.json({ success: false, message: "Failed to create order" });
    }
}



export const verifyPaymentService = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RZP_TEST_SECRET)
            .update(sign)
            .digest("hex");
        if (expectedSignature === razorpay_signature) {
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: "Signature mismatch" });
        }
    } catch (error) {
        console.error("Payment verify error:", error);
        return res.json({ success: false, message: "Something went wrong" });
    }
}



export const getTransactionDetailsService = async (req, res) => {
    try {
        const { paymentId } = req.body;

        if (!paymentId) {
            return res.json({ success: false, message: "Payment ID missing" });
        }

        const payment = await razorpay.payments.fetch(paymentId);

        res.json({ success: true, payment });
    } catch (err) {
        console.error("Transaction fetch error:", err);
        res.json({ success: false, message: err.message });
    }
}

