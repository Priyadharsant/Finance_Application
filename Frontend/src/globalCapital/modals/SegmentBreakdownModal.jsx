import React from "react";
import { X } from "lucide-react";
import { money } from "../utils/formatters.js";

export default function SegmentBreakdownModal({ data, close }) {
  if (!data) return null;
  const { partnerName, periodStart, periodEnd, segments, totalWeight } = data;

  const totalActiveDays = (segments || []).reduce((sum, s) => sum + Number(s.activeDays || 0), 0);

  return (
    <div
      className="modalOverlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="modalContent"
        style={{ width: "min(680px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">TIME-WEIGHTED SEGMENTS</span>
            <h3>{partnerName}</h3>
            <small style={{ color: "#64748b" }}>
              Calculation Period: {periodStart} to {periodEnd}
            </small>
          </div>
          <button className="iconBtn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modalBody" style={{ padding: "16px 20px" }}>
          <p style={{ margin: "0 0 14px", color: "#475569", fontSize: "13px" }}>
            The calculation period is partitioned into segments at each capital transaction date.
            Capital Weight = Effective Balance × Active Days.
          </p>

          <div className="tableResponsive" style={{ maxHeight: "320px", overflowY: "auto" }}>
            <table className="segmentTable">
              <thead>
                <tr>
                  <th>Segment Range</th>
                  <th style={{ textAlign: "right" }}>Effective Balance</th>
                  <th style={{ textAlign: "center" }}>Days</th>
                  <th style={{ textAlign: "right" }}>Segment Capital-Days</th>
                </tr>
              </thead>
              <tbody>
                {(segments || []).map((seg, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>
                        {new Date(seg.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}{" "}
                        –{" "}
                        {new Date(seg.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </strong>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "600", color: "#0f172a" }}>
                      {money(seg.capitalBalance)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="analyticsPill" style={{ background: "#f1f5f9", color: "#334155" }}>
                        {seg.activeDays} days
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: "700", color: "#0f766e" }}>
                      {Number(seg.segmentWeight).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
                {(!segments || segments.length === 0) && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>
                      No activity segments recorded.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                  <td style={{ fontWeight: "700", color: "#0f172a" }}>Total Accumulated</td>
                  <td></td>
                  <td style={{ textAlign: "center", fontWeight: "700" }}>{totalActiveDays} days</td>
                  <td style={{ textAlign: "right", fontWeight: "800", color: "#0f766e", fontFamily: "monospace", fontSize: "14px" }}>
                    {Number(totalWeight || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="modalActions" style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
          <button type="button" className="secondaryBtn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
