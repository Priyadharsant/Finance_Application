import * as loanTypeService from "../services/loanTypeService.js";

export async function addLoanType(req, res) {
  try {
    const { name, interestType, category } = req.body;
    if (!name || !interestType || !category) {
      return res.status(400).json({ success: false, message: "Name, interestType, and category are required." });
    }

    const loanType = await loanTypeService.createLoanType(req.body);
    res.status(201).json({ success: true, message: "Loan type created", data: loanType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getLoanTypes(req, res) {
  try {
    const loanTypes = await loanTypeService.getAllLoanTypes();
    res.status(200).json({ success: true, data: loanTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateLoanType(req, res) {
  try {
    const loanType = await loanTypeService.updateLoanType(req.params.id, req.body);
    if (!loanType) {
      return res.status(404).json({ success: false, message: "Loan type not found." });
    }
    res.status(200).json({ success: true, message: "Loan type updated", data: loanType });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteLoanType(req, res) {
  try {
    const loanType = await loanTypeService.deleteLoanType(req.params.id);
    if (!loanType) {
      return res.status(404).json({ success: false, message: "Loan type not found." });
    }
    res.status(200).json({ success: true, message: "Loan type deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
