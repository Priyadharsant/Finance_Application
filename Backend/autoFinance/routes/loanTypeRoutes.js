import express from "express";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";
import { addLoanType, getLoanTypes, updateLoanType, deleteLoanType } from "../controllers/loanTypeController.js";

const router = express.Router();

router.use(authenticateToken);

// Depending on your requirements, modifying loan types should likely be restricted to admin/staff
router.post("/", addLoanType);
router.get("/", getLoanTypes);
router.put("/:id", updateLoanType);
router.delete("/:id", deleteLoanType);

export default router;
