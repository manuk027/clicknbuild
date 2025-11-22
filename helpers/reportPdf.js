import PDFDocument from "pdfkit";

export function generatePDFBuffer(summary, orders) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const chunks = [];
            doc.on("data", chunks.push.bind(chunks));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.fontSize(20).text("Sales Report", { align: "center" });
            doc.moveDown();
            doc.fontSize(12).text(`Total Orders: ${summary.orderCount}`);
            doc.text(`Total Sales: ₹${summary.totalSales}`);
            doc.text(`Total Discount: ₹${summary.totalDiscount}`);
            doc.moveDown();
            doc.fontSize(14).text("Orders List:");
            doc.moveDown();
            orders.forEach(o => {
                doc.fontSize(12).text(`Order ID: ${o.orderId}`);
                doc.text(`Date: ${new Date(o.createdAt).toLocaleString()}`);
                doc.text(`Total: ₹${o.totalAmount}`);
                doc.moveDown();
            });
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}
