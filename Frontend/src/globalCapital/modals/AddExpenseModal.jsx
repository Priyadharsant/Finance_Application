import React from "react";
import { X, Building, CarFront, Activity, AlertCircle } from "lucide-react";

export default function AddExpenseModal({
  show,
  close,
  expenseFormData,
  setExpenseFormData,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div
      className="modalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modalContent"
        style={{ width: "min(560px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">EXPENSE CONTROL</span>
            <h3>Record New Expense</h3>
          </div>
          <button
            type="button"
            className="iconBtn"
            onClick={close}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modalBody">
            {/* How much */}
            <div className="formGroup">
              <label>Amount (How much) *</label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: "700",
                    color: "#0f766e",
                  }}
                >
                  ₹
                </span>
                <input
                  required
                  type="number"
                  step="any"
                  min="1"
                  placeholder="e.g. 1500"
                  style={{ paddingLeft: "32px", fontSize: "16px", fontWeight: "700" }}
                  value={expenseFormData.amount}
                  onChange={(e) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      amount: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Why */}
            <div className="formGroup">
              <label>Reason / Description (Why) *</label>
              <input
                required
                type="text"
                placeholder="e.g. Office tea and refreshments, Broadband internet bill..."
                value={expenseFormData.description}
                onChange={(e) =>
                  setExpenseFormData({
                    ...expenseFormData,
                    description: e.target.value,
                  })
                }
              />
              <div className="quickTagsContainer">
                {[
                  "Tea & Snacks",
                  "Office Rent",
                  "Electricity Bill",
                  "Internet & Phone",
                  "Stationery & Printing",
                  "Staff Salary",
                  "Fuel & Travel",
                  "Legal & CA Charges",
                  "Brokerage Cash Payout",
                ].map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className="quickTagBtn"
                    onClick={() =>
                      setExpenseFormData({
                        ...expenseFormData,
                        description: tag,
                        expenseType:
                          tag === "Brokerage Cash Payout"
                            ? "BROKERAGE_HAND"
                            : tag === "Tea & Snacks"
                              ? "TEA_SNACKS"
                              : tag === "Staff Salary"
                                ? "SALARY"
                                : tag === "Fuel & Travel"
                                  ? "TRAVEL"
                                  : tag === "Electricity Bill" || tag === "Internet & Phone"
                                    ? "UTILITY"
                                    : "OFFICE_EXPENSE",
                        category:
                          tag === "Brokerage Cash Payout"
                            ? "AUTO"
                            : expenseFormData.category,
                      })
                    }
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div className="formGroup">
              <label>Expense Category *</label>
              <div className="categoryOptionGrid">
                <div
                  className={`categoryOptionCard ${
                    expenseFormData.category === "GENERAL" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setExpenseFormData({ ...expenseFormData, category: "GENERAL" })
                  }
                >
                  <Building size={20} color="#7c3aed" />
                  <span>General</span>
                  <small>Office, rent, tea, utilities</small>
                </div>

                <div
                  className={`categoryOptionCard ${
                    expenseFormData.category === "AUTO" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setExpenseFormData({ ...expenseFormData, category: "AUTO" })
                  }
                >
                  <CarFront size={20} color="#2563eb" />
                  <span>Auto Finance</span>
                  <small>Brokerage, vehicle overheads</small>
                </div>

                <div
                  className={`categoryOptionCard ${
                    expenseFormData.category === "DAILY" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setExpenseFormData({ ...expenseFormData, category: "DAILY" })
                  }
                >
                  <Activity size={20} color="#059669" />
                  <span>Daily Finance</span>
                  <small>Field & daily operations</small>
                </div>
              </div>
            </div>

            {/* Expense Type & Date */}
            <div style={{ display: "flex", gap: "12px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label>Expense Type</label>
                <select
                  value={expenseFormData.expenseType}
                  onChange={(e) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      expenseType: e.target.value,
                    })
                  }
                >
                  <option value="OFFICE_EXPENSE">Office & Administrative</option>
                  <option value="TEA_SNACKS">Tea, Snacks & Refreshments</option>
                  <option value="UTILITY">Utility & Internet Bills</option>
                  <option value="SALARY">Salary & Staff Dues</option>
                  <option value="TRAVEL">Travel & Fuel</option>
                  <option value="BROKERAGE_HAND">Brokerage Hand</option>
                  <option value="MAINTENANCE">Repairs & Maintenance</option>
                  <option value="MISCELLANEOUS">Miscellaneous</option>
                </select>
              </div>

              <div className="formGroup" style={{ flex: 1 }}>
                <label>Expense Date *</label>
                <input
                  required
                  type="date"
                  value={expenseFormData.expenseDate}
                  onChange={(e) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      expenseDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: "9px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={15} color="#16a34a" />
              <span>
                This expense is recorded in the unified expenses table and will immediately reflect on the Global Dashboard.
              </span>
            </div>
          </div>

          <div className="modalActions">
            <button
              type="button"
              className="secondaryBtn"
              onClick={close}
            >
              Cancel
            </button>
            <button type="submit" className="primaryBtn">
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
