import { getDashboardDataService, downloadPDFService, downloadExcelService } from '../../services/admin/dashboardService.js'


const getDashboardData = async (req, res) => {
    await getDashboardDataService(req, res);
}

const downloadPDF = async (req, res) => {
    await downloadPDFService(req, res);
}

const downloadExcel = async (req, res) => {
    await downloadExcelService(req, res);
}

export default { getDashboardData, downloadPDF, downloadExcel };