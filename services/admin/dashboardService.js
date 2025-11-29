import { getFilteredOrders } from "../../helpers/adminReport.js";
import { generatePDFBuffer } from "../../helpers/reportPdf.js";
import { generateExcelBuffer } from "../../helpers/reportExcel.js";
import { HttpStatus } from '../../helpers/statusCodes.js'



export const getDashboardDataService = async (req, res) => {
    try {
        const range = req.query.range || "monthly";
        const from = req.query.from;
        const to = req.query.to;
        const orders = await getFilteredOrders({ range, from, to });
        orders.forEach(order => {
            let discount = 0;

            order.items.forEach(item => {
                const itemDiscount = (item.price - item.salePrice) * item.quantity;
                discount += itemDiscount;
            });
            order.computedDiscount = discount;
        });
        const summary = {
            orderCount: orders.length,
            totalSales: orders.reduce((sum, o) => {
                const itemsSubtotal = o.items.reduce((s, i) => s + (i.price * i.quantity), 0);
                return sum + itemsSubtotal;
            }, 0),
            totalDiscount: orders.reduce((sum, o) => {
                const discount = o.items.reduce((s, i) =>
                    s + ((i.price - i.salePrice) * i.quantity), 0);
                return sum + discount;
            }, 0),
        };
        return res.json({ success: true, orders, summary });
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: "Server error" });
    }
};



export const loadDashboardService = async (req, res) => {
    try {
        if (req.session.admin) {
            return res.render('dashboard');
        }
    } catch (error) {
        console.error("Error loading the dashboard: ", error);
        return res.redirect('/pageNotFound');
    }
};



export const downloadPDFService = async (req, res) => {
    const range = req.query.range || "monthly";
    const from = req.query.from;
    const to = req.query.to;
    const orders = await getFilteredOrders({ range, from, to });
    const summary = {
        orderCount: orders.length,
        totalSales: orders.reduce((s, o) => s + o.totalAmount, 0),
        totalDiscount: orders.reduce((s, o) => s + o.discountAmount, 0),
    };
    const pdfBuffer = await generatePDFBuffer(summary, orders);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");
    return res.send(pdfBuffer);
};



export const downloadExcelService = async (req, res) => {
    try {
        const { range, from, to } = req.query;
        const orders = await getFilteredOrders({ range, from, to });
        const excelBuffer = await generateExcelBuffer(orders);
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=sales-report.xlsx"
        );
        res.send(excelBuffer);
    } catch (error) {
        console.error("Excel download error:", error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to download Excel" });
    }
};
