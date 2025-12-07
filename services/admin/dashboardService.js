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
        let productMap = {};
        let categoryMap = {};
        let brandMap = {};
        orders.forEach(order => {
            let discount = 0;
            order.items.forEach(item => {
                const itemDiscount = (item.price - item.salePrice) * item.quantity;
                const qty = item.quantity || 0;
                const pName = item.name || item.productName || (item.productId && item.productId.name) || "Unknown Product";
                productMap[pName] = (productMap[pName] || 0) + qty;
                const catRaw = item.category || (item.productId && item.productId.category);
                const cName = (catRaw && catRaw.name) ? catRaw.name : (catRaw || "Uncategorized");
                categoryMap[cName] = (categoryMap[cName] || 0) + qty;
                const bName = pName.split(' ')[0] || "No Brand";
                brandMap[bName] = (brandMap[bName] || 0) + qty;
            });
            order.computedDiscount = discount;
        });
        const getTop5 = (map) => {
            return Object.entries(map)
                .map(([name, totalSold]) => ({ name, totalSold }))
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 10);
        };
        const bestSelling = {
            products: getTop5(productMap),
            categories: getTop5(categoryMap),
            brands: getTop5(brandMap)
        };
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
        return res.json({ success: true, orders, summary, bestSelling });
    } catch (error) {
        console.error("Dashboard Service Error:", error);
        return res.json({ success: false, message: "Server error" });
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
