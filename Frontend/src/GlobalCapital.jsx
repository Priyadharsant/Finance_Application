import { useEffect, useState } from "react";
import {
  Globe,
  Users,
  Landmark,
  FileText,
  Plus,
  ArrowRightCircle,
  ArrowDownCircle,
  TrendingUp,
  AlertCircle,
  X,
} from "lucide-react";
import "./Finance.css";

const API =
  import.meta.env.VITE_GLOBAL_API_URL ||
  "http://localhost:3000/api/global-cash";

export default function GlobalCapitalView({ activeMenu, setNotice }) {
  const [loading, setLoading] = useState(false);

  // Dashboard State
  const [ledgerData, setLedgerData] = useState({
    availableCapital: 0,
    ledger: [],
  });

  // Partners State
  const [partners, setPartners] = useState([]);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [txData, setTxData] = useState({
    partnerId: "",
    amount: "",
    effectiveDate: "",
    notes: "",
  });

  // Closings State
  const [closings, setClosings] = useState([]);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftData, setDraftData] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [currentDraft, setCurrentDraft] = useState(null);
  const [manualAdjustment, setManualAdjustment] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const totalCredits =
    ledgerData.ledger
      ?.filter((tx) => tx.direction === "CREDIT")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0;
  const totalDebits =
    ledgerData.ledger
      ?.filter((tx) => tx.direction === "DEBIT")
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0) || 0;

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/ledger`);
      if (res.ok) setLedgerData(await res.json());
    } catch (e) {
      setNotice({ type: "error", text: "Failed to fetch ledger" });
    }
    setLoading(false);
  };

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/partners`);
      if (res.ok) setPartners(await res.json());
    } catch (e) {
      setNotice({ type: "error", text: "Failed to fetch partners" });
    }
    setLoading(false);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/partner-transactions`);
      if (res.ok) setTransactions(await res.json());
    } catch (e) {
      setNotice({ type: "error", text: "Failed to fetch transactions" });
    }
    setLoading(false);
  };

  const fetchClosings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/monthly-closings`);
      if (res.ok) setClosings(await res.json());
    } catch (e) {
      setNotice({ type: "error", text: "Failed to fetch closings" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeMenu === "Ledger Overview") fetchLedger();
    if (activeMenu === "Partner Management") fetchPartners();
    if (activeMenu === "Capital Transactions") {
      fetchTransactions();
      fetchPartners(); // needed for dropdown
    }
    if (activeMenu === "Monthly Closing") fetchClosings();
  }, [activeMenu]);

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPartnerName }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Partner added successfully!" });
        setShowAddPartner(false);
        setNewPartnerName("");
        fetchPartners();
      } else throw new Error(await res.text());
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Failed to add partner",
      });
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/partner-transactions/contribution`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txData),
      });
      if (res.ok) {
        setNotice({
          type: "success",
          text: "Transaction added successfully!",
        });
        setShowAddTransaction(false);
        setTxData({ partnerId: "", amount: "", effectiveDate: "", notes: "" });
        fetchTransactions();
      } else throw new Error(await res.text());
    } catch (e) {
      setNotice({
        type: "error",
        text: e.message || "Failed to add transaction",
      });
    }
  };

  const handleRunDraft = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/monthly-closings/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: draftData.year, month: draftData.month }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentDraft(data);
        setShowDraftModal(false);
        fetchClosings();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Failed to run draft" });
    }
  };

  const handleFinalize = async (id) => {
    try {
      const res = await fetch(`${API}/monthly-closings/${id}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualAdjustment: Number(manualAdjustment),
          adjustmentReason,
        }),
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Closing finalized!" });
        setCurrentDraft(null);
        setManualAdjustment(0);
        setAdjustmentReason("");
        fetchClosings();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (e) {
      setNotice({ type: "error", text: e.message || "Failed to finalize" });
    }
  };

  return (
    <div className="autoFinanceContainer">
      {/* ---------------- LEDGER OVERVIEW ---------------- */}
      {activeMenu === "Ledger Overview" && (
        <div className="financeFadeIn globalCapitalView">
          <div className="globalCapitalHero">
            <div className="analyticsBannerHead">
              <h4>
                <Globe size={18} /> Available Company Capital
              </h4>
            </div>
            <strong>
              ₹
              {Number(ledgerData.availableCapital || 0).toLocaleString(
                "en-IN",
                { minimumFractionDigits: 2 },
              )}
            </strong>
            <p>
              Real-time balance derived from the immutable global cash ledger.
            </p>
          </div>

          <div className="globalCapitalStats">
            <div>
              <span>Capital in</span>
              <strong>₹{totalCredits.toLocaleString("en-IN")}</strong>
              <small>Partner contributions</small>
            </div>
            <div>
              <span>Capital deployed</span>
              <strong>₹{totalDebits.toLocaleString("en-IN")}</strong>
              <small>Finance disbursements</small>
            </div>
            <div>
              <span>Ledger entries</span>
              <strong>{ledgerData.ledger?.length || 0}</strong>
              <small>Auditable transactions</small>
            </div>
          </div>

          <div className="financeCard globalCapitalCard mt-20">
            <div className="cardHead">
              <h3>
                <Landmark size={18} /> Global Cash Ledger
              </h3>
            </div>
            <div className="tableResponsive">
              <table className="financeTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Module</th>
                    <th>Direction</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.ledger?.map((tx) => (
                    <tr
                      className="clickable globalClickableRow"
                      key={tx.id}
                      onClick={() =>
                        setSelectedRecord({ type: "ledger", record: tx })
                      }
                    >
                      <td>
                        {new Date(tx.effective_date).toLocaleDateString()}
                      </td>
                      <td>
                        <span
                          className="analyticsPill"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td>{tx.source_module}</td>
                      <td>
                        {tx.direction === "CREDIT" ? (
                          <span
                            style={{
                              color: "#10b981",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <ArrowDownCircle size={14} /> IN
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "#ef4444",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <ArrowRightCircle size={14} /> OUT
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "600" }}>
                        ₹{Number(tx.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {ledgerData.ledger?.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        style={{ textAlign: "center", color: "#64748b" }}
                      >
                        No ledger transactions yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- PARTNER MANAGEMENT ---------------- */}
      {activeMenu === "Partner Management" && (
        <div className="financeFadeIn globalCapitalView">
          <div className="financeHeader">
            <div>
              <span className="overline autoBadgeTag">CAPITAL NETWORK</span>
              <h2>Business Partners</h2>
              <p className="globalSectionDescription">
                Track capital ownership and partner balances in one place.
              </p>
            </div>
            <button
              className="primaryBtn"
              onClick={() => setShowAddPartner(true)}
            >
              <Plus size={16} /> Add Partner
            </button>
          </div>

          <div className="globalCapitalStats compact">
            <div>
              <span>Active partners</span>
              <strong>{partners.length}</strong>
              <small>Capital contributors</small>
            </div>
            <div>
              <span>Total partner capital</span>
              <strong>
                ₹
                {partners
                  .reduce(
                    (sum, partner) =>
                      sum + Number(partner.current_capital || 0),
                    0,
                  )
                  .toLocaleString("en-IN")}
              </strong>
              <small>Current balances</small>
            </div>
            <div>
              <span>Average balance</span>
              <strong>
                ₹
                {partners.length
                  ? Math.round(
                      partners.reduce(
                        (sum, partner) =>
                          sum + Number(partner.current_capital || 0),
                        0,
                      ) / partners.length,
                    ).toLocaleString("en-IN")
                  : "0"}
              </strong>
              <small>Across active partners</small>
            </div>
          </div>

          <div className="financeCard globalCapitalCard mt-20">
            <div className="tableResponsive">
              <table className="financeTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{ textAlign: "right" }}>Current Capital</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => (
                    <tr
                      className="clickable globalClickableRow"
                      key={p.id}
                      onClick={() =>
                        setSelectedRecord({ type: "partner", record: p })
                      }
                    >
                      <td style={{ fontWeight: "500" }}>{p.name}</td>
                      <td>
                        <span className="statusPill active">{p.status}</span>
                      </td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "600",
                          color: "#0f172a",
                        }}
                      >
                        ₹{Number(p.current_capital).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {partners.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        No partners found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- CAPITAL TRANSACTIONS ---------------- */}
      {activeMenu === "Capital Transactions" && (
        <div className="financeFadeIn globalCapitalView">
          <div className="financeHeader">
            <div>
              <span className="overline autoBadgeTag">CAPITAL ACTIVITY</span>
              <h2>Capital Transactions</h2>
              <p className="globalSectionDescription">
                Review every contribution recorded against the company capital
                ledger.
              </p>
            </div>
            <button
              className="primaryBtn"
              onClick={() => setShowAddTransaction(true)}
            >
              <Plus size={16} /> Record Contribution
            </button>
          </div>

          <div className="globalCapitalStats compact">
            <div>
              <span>Total contributions</span>
              <strong>{transactions.length}</strong>
              <small>Recorded entries</small>
            </div>
            <div>
              <span>Capital added</span>
              <strong>
                ₹
                {transactions
                  .reduce(
                    (sum, transaction) => sum + Number(transaction.amount || 0),
                    0,
                  )
                  .toLocaleString("en-IN")}
              </strong>
              <small>Contribution value</small>
            </div>
            <div>
              <span>Completed</span>
              <strong>
                {
                  transactions.filter(
                    (transaction) => transaction.status === "COMPLETED",
                  ).length
                }
              </strong>
              <small>Settled transactions</small>
            </div>
          </div>

          <div className="financeCard globalCapitalCard mt-20">
            <div className="tableResponsive">
              <table className="financeTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Partner</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr
                      className="clickable globalClickableRow"
                      key={t.id}
                      onClick={() =>
                        setSelectedRecord({ type: "transaction", record: t })
                      }
                    >
                      <td>{new Date(t.effective_date).toLocaleDateString()}</td>
                      <td style={{ fontWeight: "500" }}>{t.partner_name}</td>
                      <td>
                        <span
                          className="analyticsPill"
                          style={{ background: "#e0e7ff", color: "#4338ca" }}
                        >
                          {t.transaction_type}
                        </span>
                      </td>
                      <td>
                        <span className="statusPill active">{t.status}</span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "600",
                          color: "#10b981",
                        }}
                      >
                        ₹{Number(t.amount).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center" }}>
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MONTHLY CLOSING ---------------- */}
      {activeMenu === "Monthly Closing" && (
        <div className="financeFadeIn globalCapitalView">
          <div className="financeHeader">
            <div>
              <span className="overline autoBadgeTag">PERIOD CONTROL</span>
              <h2>Monthly Closings</h2>
              <p className="globalSectionDescription">
                Prepare, review, and lock monthly profit allocations for every
                partner.
              </p>
            </div>
            <button
              className="primaryBtn"
              onClick={() => setShowDraftModal(true)}
            >
              <TrendingUp size={16} /> Run Draft Close
            </button>
          </div>

          <div className="globalCapitalStats compact">
            <div>
              <span>Closed periods</span>
              <strong>
                {
                  closings.filter((closing) => closing.status === "CLOSED")
                    .length
                }
              </strong>
              <small>Finalized months</small>
            </div>
            <div>
              <span>Draft periods</span>
              <strong>
                {
                  closings.filter((closing) => closing.status !== "CLOSED")
                    .length
                }
              </strong>
              <small>Awaiting review</small>
            </div>
            <div>
              <span>Latest period</span>
              <strong>{closings[0]?.period_label || "Not available"}</strong>
              <small>Most recent closing</small>
            </div>
          </div>

          {currentDraft && (
            <div
              className="financeCard mt-20"
              style={{
                border: "1px solid #10b981",
                boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.1)",
              }}
            >
              <div
                className="cardHead"
                style={{
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "15px",
                }}
              >
                <h3 style={{ color: "#047857" }}>
                  <AlertCircle size={18} /> Draft Review:{" "}
                  {currentDraft.closing.period_label}
                </h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "15px",
                    borderRadius: "8px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 5px",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    Calculated Net Profit
                  </p>
                  <h2 style={{ margin: 0 }}>
                    ₹
                    {Number(
                      currentDraft.closing.calculated_company_profit,
                    ).toLocaleString("en-IN")}
                  </h2>
                </div>
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "15px",
                    borderRadius: "8px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 5px",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    Final Profit (incl. adjustments)
                  </p>
                  <h2 style={{ margin: 0, color: "#10b981" }}>
                    ₹
                    {(
                      Number(currentDraft.closing.calculated_company_profit) +
                      Number(manualAdjustment)
                    ).toLocaleString("en-IN")}
                  </h2>
                </div>
              </div>

              <div style={{ marginTop: "20px", display: "flex", gap: "15px" }}>
                <div className="formGroup" style={{ flex: 1 }}>
                  <label>Manual Adjustment (Optional)</label>
                  <input
                    type="number"
                    value={manualAdjustment}
                    onChange={(e) => setManualAdjustment(e.target.value)}
                  />
                </div>
                <div className="formGroup" style={{ flex: 2 }}>
                  <label>Adjustment Reason</label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="e.g. Audit correction"
                  />
                </div>
              </div>

              <h4 style={{ marginTop: "30px", marginBottom: "15px" }}>
                Partner Profit Allocations (Live Preview)
              </h4>
              <div className="tableResponsive">
                <table className="financeTable">
                  <thead>
                    <tr>
                      <th>Partner</th>
                      <th>Weighted Capital</th>
                      <th>Ownership Ratio</th>
                      <th style={{ textAlign: "right" }}>Profit Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDraft.allocations.map((a) => {
                      const ratio = Number(a.ownership_ratio);
                      const finalProfit =
                        Number(currentDraft.closing.calculated_company_profit) +
                        Number(manualAdjustment);
                      const allocated = ratio * finalProfit;
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: "500" }}>
                            {a.partner_name}
                          </td>
                          <td>
                            ₹
                            {Number(a.weighted_capital).toLocaleString(
                              "en-IN",
                              { maximumFractionDigits: 0 },
                            )}{" "}
                            days
                          </td>
                          <td>{(ratio * 100).toFixed(4)}%</td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: "600",
                              color: "#10b981",
                            }}
                          >
                            ₹
                            {allocated.toLocaleString("en-IN", {
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  className="secondaryBtn"
                  onClick={() => setCurrentDraft(null)}
                >
                  Discard Draft
                </button>
                <button
                  className="primaryBtn"
                  onClick={() => handleFinalize(currentDraft.closing.id)}
                >
                  Finalize & Lock Month
                </button>
              </div>
            </div>
          )}

          <div className="financeCard mt-20">
            <div className="tableResponsive">
              <table className="financeTable">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Calculated Profit</th>
                    <th style={{ textAlign: "right" }}>Final Profit</th>
                    <th>Closed At</th>
                  </tr>
                </thead>
                <tbody>
                  {closings.map((c) => (
                    <tr
                      className="clickable globalClickableRow"
                      key={c.id}
                      onClick={() =>
                        setSelectedRecord({ type: "closing", record: c })
                      }
                    >
                      <td style={{ fontWeight: "600" }}>{c.period_label}</td>
                      <td>
                        <span
                          className={`statusPill ${c.status === "CLOSED" ? "completed" : "active"}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        ₹
                        {Number(c.calculated_company_profit).toLocaleString(
                          "en-IN",
                        )}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "600",
                          color: "#0f172a",
                        }}
                      >
                        ₹
                        {Number(c.final_company_profit).toLocaleString("en-IN")}
                      </td>
                      <td>
                        {c.closed_at
                          ? new Date(c.closed_at).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {closings.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center" }}>
                        No closings found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {showAddPartner && (
        <div className="modalOverlay" onClick={() => setShowAddPartner(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Add Business Partner</h3>
              <button
                className="iconBtn"
                onClick={() => setShowAddPartner(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPartner} className="modalBody">
              <div className="formGroup">
                <label>Partner Name</label>
                <input
                  required
                  type="text"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                />
              </div>
              <div className="modalActions">
                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={() => setShowAddPartner(false)}
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
      )}

      {showAddTransaction && (
        <div
          className="modalOverlay"
          onClick={() => setShowAddTransaction(false)}
        >
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Record Capital Contribution</h3>
              <button
                className="iconBtn"
                onClick={() => setShowAddTransaction(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="modalBody">
              <div className="formGroup">
                <label>Select Partner</label>
                <select
                  required
                  value={txData.partnerId}
                  onChange={(e) =>
                    setTxData({ ...txData, partnerId: e.target.value })
                  }
                >
                  <option value="">-- Select --</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Amount</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="1"
                  value={txData.amount}
                  onChange={(e) =>
                    setTxData({ ...txData, amount: e.target.value })
                  }
                />
              </div>
              <div className="formGroup">
                <label>Effective Date</label>
                <input
                  required
                  type="date"
                  value={txData.effectiveDate}
                  onChange={(e) =>
                    setTxData({ ...txData, effectiveDate: e.target.value })
                  }
                />
              </div>
              <div className="formGroup">
                <label>Notes</label>
                <input
                  type="text"
                  value={txData.notes}
                  onChange={(e) =>
                    setTxData({ ...txData, notes: e.target.value })
                  }
                />
              </div>
              <div className="modalActions">
                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={() => setShowAddTransaction(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primaryBtn">
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDraftModal && (
        <div className="modalOverlay" onClick={() => setShowDraftModal(false)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Run Draft Closing</h3>
              <button
                className="iconBtn"
                onClick={() => setShowDraftModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRunDraft} className="modalBody">
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
                  onClick={() => setShowDraftModal(false)}
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
      )}
      {selectedRecord && (
        <GlobalRecordDetails
          type={selectedRecord.type}
          record={selectedRecord.record}
          close={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}

function GlobalRecordDetails({ type, record, close }) {
  const titles = {
    ledger: "Ledger entry details",
    partner: "Partner details",
    transaction: "Capital transaction details",
    closing: "Monthly closing details",
  };
  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Not available";
  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const fields =
    type === "ledger"
      ? [
          ["Entry type", record.type],
          ["Source module", record.source_module],
          ["Direction", record.direction],
          ["Amount", money(record.amount)],
          ["Effective date", formatDate(record.effective_date)],
          ["Reference type", record.reference_type || "Not available"],
          ["Notes", record.notes || "No notes"],
        ]
      : type === "partner"
        ? [
            ["Partner name", record.name],
            ["Status", record.status],
            ["Joined", formatDate(record.created_at)],
            ["Current capital", money(record.current_capital)],
          ]
        : type === "transaction"
          ? [
              ["Partner", record.partner_name],
              ["Transaction type", record.transaction_type],
              ["Status", record.status],
              ["Amount", money(record.amount)],
              ["Effective date", formatDate(record.effective_date)],
              ["Notes", record.notes || "No notes"],
            ]
          : [
              ["Period", record.period_label],
              ["Status", record.status],
              ["Calculated profit", money(record.calculated_company_profit)],
              ["Final profit", money(record.final_company_profit)],
              ["Closed at", formatDate(record.closed_at)],
              [
                "Adjustment reason",
                record.adjustment_reason || "No adjustment",
              ],
            ];
  return (
    <div
      className="modalOverlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="modalContent globalRecordModal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modalHeader">
          <div>
            <span className="overline autoBadgeTag">GLOBAL CAPITAL</span>
            <h3>{titles[type]}</h3>
          </div>
          <button
            className="iconBtn"
            onClick={close}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>
        <div className="globalRecordGrid">
          {fields.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
