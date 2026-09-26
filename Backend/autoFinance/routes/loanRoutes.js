import express from "express";
import multer from "multer";
import os from "os";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { 
  addLoan, getLoans, getLoan, getDashboard, recordEmiPayment, getMonthlyReport, closeLoanEarly,
  updateVehicle, uploadDocument, getDocuments, serveDocument, deleteDocument 
} from "../controllers/loanController.js";

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

router.use(authenticateToken);

router.get("/dashboard", getDashboard);
router.get("/", getLoans);
router.post("/", addLoan);
router.get("/:id", getLoan);
router.post("/:id/close", closeLoanEarly);
router.get("/reports/monthly", getMonthlyReport);
router.post("/pay-emi", recordEmiPayment);

// Vehicle and Document Routes
router.put("/:id/vehicle", updateVehicle);
router.post("/:id/documents", upload.single("file"), uploadDocument);
router.get("/:id/documents", getDocuments);
router.get("/:id/documents/:filename", serveDocument);
router.delete("/:id/documents/:filename", deleteDocument);

export default router;
