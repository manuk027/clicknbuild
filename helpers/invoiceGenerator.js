import PDFDocument from "pdfkit";
import axios from "axios";

export const generateInvoiceBuffer = async (
  order,
  company,
  logoUrl
) => {
  let logoBuffer = null;
  try {
    const resp = await axios.get(logoUrl, { responseType: "arraybuffer", timeout: 5000 });
    logoBuffer = Buffer.from(resp.data, "binary");
  } catch (err) { }
  let watermarkBuffer = null;
  const watermarkUrl = "https://res.cloudinary.com/dmx7sia5q/image/upload/v1762177534/do7hdqd5snvtmeqmnoa7.jpg";
  try {
    const resp = await axios.get(watermarkUrl, { responseType: "arraybuffer", timeout: 5000 });
    watermarkBuffer = Buffer.from(resp.data, "binary");
  } catch (err) { }
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];

      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      const INR = "₹";
      const startX = doc.page.margins.left;
      const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const tableLeft = startX;
      const tableRight = startX + usableWidth;
      const tableWidth = usableWidth;
      const drawLine = (y) => {
        doc.moveTo(tableLeft, y).lineTo(tableRight, y).stroke();
      };
      const drawWatermark = () => {
        if (watermarkBuffer) {
          try {
            doc.save();
            doc.opacity(0.08);
            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const wmWidth = pageWidth * 0.7;
            const wmX = (pageWidth - wmWidth) / 2;
            const wmY = pageHeight * 0.20;
            doc.image(watermarkBuffer, wmX, wmY, { width: wmWidth });
            doc.restore();
          } catch (err) { }
        }
      };
      drawWatermark();
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, startX, 40, { fit: [110, 60] });
        } catch (err) { }
      }
      const compX = startX + (logoBuffer ? 120 : 0);
      doc.fontSize(18).text(company.name || "ClickNBuild", compX, 40);
      doc.fontSize(9);
      let compY = 68;
      (company.addressLines || []).forEach((l) => {
        doc.text(l, compX, compY);
        compY += 12;
      });

      if (company.phone) doc.text(`Phone: ${company.phone}`, compX, compY), (compY += 12);
      if (company.email) doc.text(`Email: ${company.email}`, compX, compY), (compY += 12);
      if (company.gst) doc.text(`GST: ${company.gst}`, compX, compY), (compY += 12);
      doc.moveTo(startX, compY + 6).lineTo(tableRight, compY + 6).stroke();
      let y = compY + 20;
      const rightColX = startX + usableWidth * 0.55;
      doc.fontSize(10).text("Bill To:", startX, y, { underline: true });
      let addrY = y + 16;
      (order.addressLines || []).forEach((line) => {
        doc.text(line, startX, addrY);
        addrY += 12;
      });
      doc.text("Invoice Details:", rightColX, y, { underline: true });
      let metaY = y + 16;
      doc.fontSize(9);
      doc.text(`Order ID: ${order.orderId}`, rightColX, metaY); metaY += 12;
      doc.text(`Order Date: ${order.orderDate}`, rightColX, metaY); metaY += 12;
      doc.text(`Delivery Date: ${order.deliveryDate}`, rightColX, metaY); metaY += 12;
      doc.text(`Payment Method: ${order.paymentMethod}`, rightColX, metaY); metaY += 12;
      y = Math.max(addrY, metaY) + 10;
      drawLine(y);
      y += 10;
      doc.fontSize(10).font("Helvetica-Bold");
      const colDefs = [
        { key: "description", width: tableWidth * 0.45 },
        { key: "sku", width: tableWidth * 0.18 },
        { key: "qty", width: tableWidth * 0.09, align: "right" },
        { key: "price", width: tableWidth * 0.14, align: "right" },
        { key: "subtotal", width: tableWidth * 0.14, align: "right" },
      ];
      let x = tableLeft;
      colDefs.forEach((col) => {
        doc.text(
          col.key === "description"
            ? "Description"
            : col.key === "sku"
              ? "SKU"
              : col.key === "qty"
                ? "Qty"
                : col.key === "price"
                  ? "Price"
                  : "Subtotal",
          x + 4,
          y,
          { width: col.width - 8, align: col.align || "left" }
        );
        x += col.width;
      });
      y += 20;
      drawLine(y - 4);
      doc.font("Helvetica").fontSize(9);
      let rowY = y;
      const rowHeight = 22;
      const cellPadding = 6;
      const bottomMargin = 60;
      const ensureSpace = (needed = 100) => {
        if (rowY + needed > doc.page.height - bottomMargin) {
          doc.addPage();
          drawWatermark();
          rowY = 40;
          doc.font("Helvetica-Bold").fontSize(10);
          let rx = startX;
          colDefs.forEach((col) => {
            doc.text(
              col.key === "description"
                ? "Description"
                : col.key === "sku"
                  ? "SKU"
                  : col.key === "qty"
                    ? "Qty"
                    : col.key === "price"
                      ? "Price"
                      : "Subtotal",
              rx + 4,
              rowY,
              { width: col.width - 8, align: col.align || "left" }
            );
            rx += col.width;
          });
          rowY += 20;
          drawLine(rowY - 4);
          doc.font("Helvetica").fontSize(9);
        }
      };
      let computedTotal = 0;
      for (const item of order.items) {
        ensureSpace(40);
        drawLine(rowY);
        const textY = rowY + cellPadding;
        let ix = tableLeft;
        doc.text(item.name || "", ix + 4, textY, { width: colDefs[0].width - 8 });
        ix += colDefs[0].width;
        doc.text(item.sku || "-", ix + 4, textY, { width: colDefs[1].width - 8 });
        ix += colDefs[1].width;
        doc.text(String(item.quantity || 1), ix, textY, { width: colDefs[2].width - 8, align: "right" });
        ix += colDefs[2].width;
        doc.text(`${INR}${(item.salePrice || item.price || 0).toLocaleString()}`, ix - 4, textY, {
          width: colDefs[3].width - 8,
          align: "right",
        });
        ix += colDefs[3].width;
        const sub = item.subTotal ?? item.quantity * (item.salePrice ?? item.price ?? 0);
        computedTotal += sub;
        doc.text(`${INR}${sub.toLocaleString()}`, ix - 4, textY, {
          width: colDefs[4].width - 8,
          align: "right",
        });
        rowY = textY + rowHeight;
        drawLine(rowY);
      }
      if (rowY + 120 > doc.page.height - bottomMargin) {
        doc.addPage();
        drawWatermark();
        rowY = 40;
      }
      const totalsX = startX + tableWidth * 0.55;
      let totalsY = rowY + 15;
      const boxW = tableWidth * 0.4;
      const boxH = 85;
      doc.roundedRect(totalsX, totalsY, boxW, boxH, 6).stroke();
      const subtotalValue = order.totalAmount ?? computedTotal;
      const deliveryFee = order.deliveryFee ?? 0;
      const grandTotal = subtotalValue + deliveryFee;

      let ty = totalsY + 10;
      const lineGap = 18;

      doc.fontSize(10).text("Subtotal:", totalsX + 10, ty);
      doc.text(`${INR}${subtotalValue.toLocaleString()}`, totalsX + 10, ty, {
        width: boxW - 20,
        align: "right",
      });
      ty += lineGap;
      doc.text("Delivery Fee:", totalsX + 10, ty);
      doc.text(`${INR}${deliveryFee.toLocaleString()}`, totalsX + 10, ty, {
        width: boxW - 20,
        align: "right",
      });
      ty += lineGap;
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text("Grand Total:", totalsX + 10, ty);
      doc.text(`${INR}${grandTotal.toLocaleString()}`, totalsX + 10, ty, {
        width: boxW - 20,
        align: "right",
      });
      let footY = totalsY + boxH + 40;
      if (footY > doc.page.height - bottomMargin) {
        doc.addPage();
        drawWatermark();
        footY = 60;
      }
      doc.font("Helvetica").fontSize(9).text("Notes:", startX, footY);
      doc.fontSize(8).text(
        order.notes || "This is an electronically generated invoice.",
        startX,
        footY + 16,
        { width: usableWidth }
      );
      doc.fontSize(7).text(
        "© ClickNBuild – Original & Authenticated Document",
        startX,
        footY + 32,
        { width: usableWidth }
      );
      doc.fontSize(8).text(
        `Generated by ClickNBuild • ${new Date().toLocaleString()}`,
        startX,
        doc.page.height - 40,
        { width: usableWidth, align: "center" }
      );
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
