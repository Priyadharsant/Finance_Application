import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { addLoan, getLoans, getLoan, getDashboard, recordEmiPayment } from "../controllers/loanController.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/dashboard", getDashboard);
router.get("/", getLoans);
router.post("/", addLoan);
router.get("/:id", getLoan);
router.post("/pay-emi", recordEmiPayment);

export default router;
