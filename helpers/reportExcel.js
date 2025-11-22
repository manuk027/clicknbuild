import ExcelJS from "exceljs";

export const generateExcelBuffer = async (orders) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sales Report");
    sheet.columns = [
        { header: "Order ID", key: "orderId", width: 25 },
        { header: "User", key: "user", width: 20 },
        { header: "Total Amount", key: "total", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Date", key: "date", width: 20 },
    ];
    orders.forEach((order) => {
        sheet.addRow({
            orderId: order._id.toString(),
            user: order.user?.name ?? "Unknown",
            total: order.totalAmount,
            status: order.status,
            date: order.createdAt.toLocaleString(),
        });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
};
