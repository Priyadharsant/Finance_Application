import React, { useState } from "react";
import { X, Save, AlertCircle, LoaderCircle, UserRound } from "lucide-react";

export default function EditAutoCustomerModal({
  customer,
  onSave,
  onClose,
  busy,
}) {
  if (!customer) return null;

  const [form, setForm] = useState({
    firstName: customer.first_name || "",
    lastName: customer.last_name || "",
    phone: customer.phone || "",
    alternatePhone: customer.alternate_phone || "",
    email: customer.email || "",
    address: customer.address || "",
    city: customer.city || "",
    state: customer.state || "",
    pincode: customer.pincode || "",
    notes: customer.notes || "",
  });

  const [error, setError] = useState("");

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    try {
      await onSave(customer.id, form);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update customer.");
    }
  };

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="formCard modalForm"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{ width: "min(680px, 94vw)" }}
      >
        <button
          type="button"
          className="close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="formTitle">
          <span className="overline autoBadgeTag">CUSTOMER PROFILE</span>
          <h2>Edit Customer Details</h2>
          <p>
            {customer.customer_code
              ? `Account Code: ${customer.customer_code} · Update personal details and contact numbers.`
              : "Update personal details and contact numbers."}
          </p>
        </div>

        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "10px",
              color: "#b91c1c",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="formGrid">
          <label>
            First Name *
            <input
              type="text"
              required
              disabled={busy}
              value={form.firstName}
              onChange={handleChange("firstName")}
              placeholder="e.g. Ramesh"
            />
          </label>

          <label>
            Last Name
            <input
              type="text"
              disabled={busy}
              value={form.lastName}
              onChange={handleChange("lastName")}
              placeholder="e.g. Kumar"
            />
          </label>

          <label>
            Primary Phone *
            <input
              type="tel"
              required
              disabled={busy}
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="e.g. 9876543210"
            />
          </label>

          <label>
            Alternate Phone
            <input
              type="tel"
              disabled={busy}
              value={form.alternatePhone}
              onChange={handleChange("alternatePhone")}
              placeholder="e.g. 9123456780"
            />
          </label>

          <label className="wide">
            Email Address
            <input
              type="email"
              disabled={busy}
              value={form.email}
              onChange={handleChange("email")}
              placeholder="e.g. customer@example.com"
            />
          </label>

          <label className="wide">
            Street Address
            <textarea
              rows={2}
              disabled={busy}
              value={form.address}
              onChange={handleChange("address")}
              placeholder="House / flat no, street name, area"
            />
          </label>

          <label>
            City
            <input
              type="text"
              disabled={busy}
              value={form.city}
              onChange={handleChange("city")}
              placeholder="e.g. Pudukkottai"
            />
          </label>

          <label>
            State
            <input
              type="text"
              disabled={busy}
              value={form.state}
              onChange={handleChange("state")}
              placeholder="e.g. Tamil Nadu"
            />
          </label>

          <label>
            Pincode
            <input
              type="text"
              disabled={busy}
              value={form.pincode}
              onChange={handleChange("pincode")}
              placeholder="e.g. 622001"
            />
          </label>

          <label>
            Notes / Remarks
            <input
              type="text"
              disabled={busy}
              value={form.notes}
              onChange={handleChange("notes")}
              placeholder="Any special remarks or references"
            />
          </label>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <button
            type="button"
            className="cancelButton"
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "10px 22px",
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              color: "#475569",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="autoBtn"
            disabled={busy}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              fontSize: "13.5px",
              fontWeight: "700",
              borderRadius: "10px",
            }}
          >
            {busy ? (
              <>
                <LoaderCircle size={16} className="spinner" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
