import * as customerService from "../services/customerService.js";

export async function addCustomer(req, res) {
  try {
    const { firstName, phone } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ success: false, message: "First name and phone are required." });
    }

    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({ success: true, message: "Customer created successfully", data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCustomers(req, res) {
  try {
    const customers = await customerService.getAllCustomers();
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCustomer(req, res) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateCustomerRecord(req, res) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }
    res.status(200).json({ success: true, message: "Customer updated successfully", data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
