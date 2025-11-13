import { loadSummaryService } from '../../services/User/orderService.js';



export const loadSummary = async (req, res) => {
    await loadSummaryService(req, res);
}