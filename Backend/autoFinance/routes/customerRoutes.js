import express from "express";
import { authenticateToken, requireRole } from "../middleware/authMiddleware.js";
import { addCustomer, getCustomers, getCustomer, updateCustomerRecord } from "../controllers/customerController.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/", addCustomer);
router.get("/", getCustomers);
router.get("/:id", getCustomer);
router.put("/:id", updateCustomerRecord);

export default router;
