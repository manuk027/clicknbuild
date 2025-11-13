import express from "express";
import { downloadInvoice } from "../../controller/user/invoiceController.js";

const invoiceRouter = express.Router();

invoiceRouter.get("/invoice/:orderId", downloadInvoice);

export default invoiceRouter;
