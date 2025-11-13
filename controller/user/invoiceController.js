import { generateInvoiceBuffer } from "../../helpers/invoiceGenerator.js";
import Order from "../../models/ordersSchema.js";

const COMPANY = {
    name: "clickNbuild",
    addressLines: [
        "ClickNBuild Pvt Ltd",
        "MG Road, Kochi, Kerala - 682001",
        "India"
    ],
    phone: "+918281337927",
    email: "support@clicknbuild.in",
    gst: "NOGSTIDASOFNOW"
};
const LOGO_URL = "https://res.cloudinary.com/dmx7sia5q/image/upload/v1762177534/do7hdqd5snvtmeqmnoa7.jpg";
export const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findOne({ orderId }).lean();
        if (!order) {
            return res.status(404).send("Order not found");
        }
        const invoiceData = {
            orderId: order.orderId,
            orderDate: order.orderDate ? order.orderDate.toDateString() : (order.orderDateStr || new Date().toDateString()),
            deliveryDate: order.deliveryDate ? order.deliveryDate.toDateString() : (order.deliveryDateStr || ""),
            paymentMethod: order.paymentMethod || "Unknown",
            addressLines: [
                order.address?.fullName || "",
                order.address?.phoneNumber || "",
                order.address?.address || "",
                order.address?.district || "",
                order.address?.state || "",
                order.address?.city || "",
                order.address?.pincode || "",
                order.address?.landmark || ""
            ],
            items: (order.items || []).map((it) => ({
                name: it.name,
                sku: it.sku || "-",
                quantity: it.quantity || 1,
                price: it.price || it.salePrice,
                salePrice: it.salePrice || it.price,
                subTotal: it.subTotal || ((it.quantity || 1) * (it.salePrice || it.price || 0))
            })),
            deliveryFee: order.deliveryFee || 0,
            totalAmount: order.totalAmount || undefined,
            notes: order.notes || ""
        };
        const pdfBuffer = await generateInvoiceBuffer(invoiceData, COMPANY, LOGO_URL);
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${orderId}.pdf"`,
            "Content-Length": pdfBuffer.length
        });
        return res.send(pdfBuffer);
    } catch (err) {
        console.error("Invoice generation error:", err);
        return res.status(500).send("Failed to generate invoice");
    }
};

