import React from "react";
import { X } from "lucide-react";

export default function DraftClosingModal({
  show,
  close,
  draftData,
  setDraftData,
  onSubmit,
}) {
  if (!show) return null;

  return (
    <div className="modalOverlay" onClick={close}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>Run Draft Closing</h3>
          <button
            type="button"
            className="iconBtn"
            onClick={close}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="modalBody">
          <p
            style={{
              marginBottom: "15px",
              color: "#475569",
              fontSize: "14px",
            }}
          >
            Generate a draft to preview the company's net profit and partner
            allocations for a specific month.
          </p>
          <div style={{ display: "flex", gap: "15px" }}>
            <div className="formGroup" style={{ flex: 1 }}>
              <label>Year</label>
              <input
                required
                type="number"
                value={draftData.year}
                onChange={(e) =>
                  setDraftData({ ...draftData, year: e.target.value })
                }
              />
            </div>
            <div className="formGroup" style={{ flex: 1 }}>
              <label>Month (1-12)</label>
              <input
                required
                type="number"
                min="1"
                max="12"
                value={draftData.month}
                onChange={(e) =>
                  setDraftData({ ...draftData, month: e.target.value })
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
              Generate Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
