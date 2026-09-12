import React from "react";
import { X } from "lucide-react";

export default function AddPartnerModal({
  show,
  close,
  partnerFormData,
  setPartnerFormData,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div className="modalOverlay" onClick={close}>
      <div
        className="modalContent"
        style={{ width: "min(580px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">CAPITAL NETWORK</span>
            <h3>Register Business Partner</h3>
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
            <div className="formGroup">
              <label>Partner Full Name *</label>
              <input
                required
                type="text"
                placeholder="e.g. Alice Founder"
                value={partnerFormData.name}
                onChange={(e) =>
                  setPartnerFormData({
                    ...partnerFormData,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={partnerFormData.phone}
                  onChange={(e) =>
                    setPartnerFormData({
                      ...partnerFormData,
                      phone: e.target.value,
                    })
                  }
                />
              </div>
              <div className="formGroup" style={{ flex: 1 }}>
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. partner@example.com"
                  value={partnerFormData.email}
                  onChange={(e) =>
                    setPartnerFormData({
                      ...partnerFormData,
                      email: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div className="formGroup" style={{ flex: 1 }}>
                <label>PAN / Tax ID</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={partnerFormData.pan_number}
                  onChange={(e) =>
                    setPartnerFormData({
                      ...partnerFormData,
                      pan_number: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
              <div className="formGroup" style={{ flex: 1 }}>
                <label>Address / City</label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, Tamil Nadu"
                  value={partnerFormData.address}
                  onChange={(e) =>
                    setPartnerFormData({
                      ...partnerFormData,
                      address: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Optional Initial Capital Contribution */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #bbf7d0",
                borderRadius: "10px",
                padding: "14px",
                margin: "6px 0 14px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#166534",
                  textTransform: "uppercase",
                  letterSpacing: ".4px",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                💰 Initial Capital Deposit (Optional)
              </span>
              <div style={{ display: "flex", gap: "12px" }}>
                <div className="formGroup" style={{ flex: 1.2, margin: 0 }}>
                  <label style={{ color: "#166534" }}>Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 500000"
                    style={{ background: "#ffffff", fontWeight: "700" }}
                    value={partnerFormData.initialContribution}
                    onChange={(e) =>
                      setPartnerFormData({
                        ...partnerFormData,
                        initialContribution: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="formGroup" style={{ flex: 1, margin: 0 }}>
                  <label style={{ color: "#166534" }}>Deposit Date</label>
                  <input
                    type="date"
                    style={{ background: "#ffffff" }}
                    value={partnerFormData.effectiveDate}
                    onChange={(e) =>
                      setPartnerFormData({
                        ...partnerFormData,
                        effectiveDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="formGroup">
              <label>Notes / Terms</label>
              <input
                type="text"
                placeholder="e.g. Co-founder equity terms or partnership remarks"
                value={partnerFormData.notes}
                onChange={(e) =>
                  setPartnerFormData({
                    ...partnerFormData,
                    notes: e.target.value,
                  })
                }
              />
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
              Save Partner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
