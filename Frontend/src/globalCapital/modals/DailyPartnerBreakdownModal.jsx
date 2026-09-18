import React from "react";
import { X, Calendar } from "lucide-react";
import { money } from "../utils/formatters.js";

export default function DailyPartnerBreakdownModal({ record, close }) {
  if (!record) return null;

  const isProfit = Number(record.netProfit || 0) >= 0;

  return (
    <div className="modalOverlay" onClick={close}>
      <div
        className="modalContent"
        style={{ width: "min(640px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">
              {isProfit ? "DAILY INCOME ALLOCATION" : "DAILY LOSS ALLOCATION"}
            </span>
            <h3 style={{ margin: "4px 0" }}>
              Allocation for {record.calcDate}
            </h3>
            <small style={{ color: "#64748b" }}>
              Net {isProfit ? "Income" : "Loss"}:{" "}
              <strong style={{ color: isProfit ? "#059669" : "#e11d48" }}>
                {isProfit ? "+" : ""}
                {money(record.netProfit)}
              </strong>{" "}
              • Total Active Capital: {money(record.totalActiveCapital)}
            </small>
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
        <div className="modalBody" style={{ padding: "16px 24px" }}>
          <table className="financeTable">
            <thead>
              <tr>
                <th>Partner</th>
                <th style={{ textAlign: "right" }}>Capital Balance</th>
                <th style={{ textAlign: "center" }}>Share %</th>
                <th style={{ textAlign: "right" }}>Today's Share</th>
              </tr>
            </thead>
            <tbody>
              {(record.allocations || []).map((alloc) => {
                const isItemProfit = Number(alloc.dailyShare || 0) >= 0;
                return (
                  <tr key={alloc.partnerId}>
                    <td>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {alloc.partnerName}
                      </strong>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      {money(alloc.capitalBalance)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="profitRatioPill">
                        {alloc.capitalSharePercent}%
                      </span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: "700",
                        color: isItemProfit ? "#059669" : "#e11d48",
                      }}
                    >
                      {isItemProfit ? "+" : ""}
                      {money(alloc.dailyShare)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div
          className="modalFooter"
          style={{ display: "flex", justifyContent: "flex-end", padding: "14px 24px" }}
        >
          <button type="button" className="secondaryBtn" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
