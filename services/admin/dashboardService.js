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
        let deliveredOrders = [];

        orders.forEach(order => {
            const deliveredItems = order.items.filter(
                item => item.status === "Delivered"
            );

            if (deliveredItems.length > 0) {
                deliveredOrders.push({ ...order, items: deliveredItems });
            }

            deliveredItems.forEach(item => {
                const qty = item.quantity || 0;

                const pName =
                    item.name ||
                    item.productName ||
                    (item.productId && item.productId.name) ||
                    "Unknown Product";

                productMap[pName] = (productMap[pName] || 0) + qty;

                const catRaw = item.category || (item.productId && item.productId.category);
                const cName = catRaw?.name || catRaw || "Uncategorized";
                categoryMap[cName] = (categoryMap[cName] || 0) + qty;

                const bName = pName.split(" ")[0] || "No Brand";
                brandMap[bName] = (brandMap[bName] || 0) + qty;
            });
        });

        const getTop10 = (map) =>
            Object.entries(map)
                .map(([name, totalSold]) => ({ name, totalSold }))
                .sort((a, b) => b.totalSold - a.totalSold)
                .slice(0, 10);

        const bestSelling = {
            products: getTop10(productMap),
            categories: getTop10(categoryMap),
            brands: getTop10(brandMap)
        };

        const summary = {
            orderCount: deliveredOrders.length,

            totalSales: deliveredOrders.reduce((sum, o) => {
                return sum + o.items.reduce(
                    (s, i) => s + (i.salePrice * i.quantity), 0
                );
            }, 0),

            totalDiscount: deliveredOrders.reduce((sum, o) => {
                return sum + o.items.reduce(
                    (s, i) => s + ((i.price - i.salePrice) * i.quantity), 0
                );
            }, 0)
        };

        return res.json({
            success: true,
            orders: deliveredOrders,
            summary,
            bestSelling
        });

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

    const deliveredOrders = orders
        .map(order => ({
            ...order.toObject(),
            items: order.items.filter(item => item.status === "Delivered")
        }))
        .filter(order => order.items.length > 0);

    const summary = {
        orderCount: deliveredOrders.length,

        totalSales: deliveredOrders.reduce((sum, o) => {
            return sum + o.items.reduce((s, i) => s + (i.salePrice * i.quantity), 0);
        }, 0),

        totalDiscount: deliveredOrders.reduce((sum, o) => {
            return sum + o.items.reduce(
                (s, i) => s + ((i.price - i.salePrice) * i.quantity),
                0
            );
        }, 0)
    };

    const pdfBuffer = await generatePDFBuffer(summary, deliveredOrders);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");
    return res.send(pdfBuffer);
};



export const downloadExcelService = async (req, res) => {
    try {
        const { range, from, to } = req.query;

        const orders = await getFilteredOrders({ range, from, to });

        const deliveredOrders = orders
            .map(order => ({
                ...order.toObject(),
                items: order.items.filter(item => item.status === "Delivered")
            }))
            .filter(order => order.items.length > 0);

        const excelBuffer = await generateExcelBuffer(deliveredOrders);

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
        res
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .json({ message: "Failed to download Excel" });
    }
};

