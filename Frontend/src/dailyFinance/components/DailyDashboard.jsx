import React, { useState, useMemo } from "react";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { Metric, Empty, PhoneLink } from "./CommonComponents.jsx";
import { money, dateLabel } from "../services/dailyFinanceApi.js";
import { exportDailyCategoryReport } from "../../globalCapital/services/globalCapitalExportUtils.js";
import { globalCapitalApi } from "../../globalCapital/services/globalCapitalApi.js";

export default function DailyDashboard({
  position = {},
  customers = [],
  recent = [],
  setPage,
  openDetails,
  loadingDetailsId,
}) {
  const [downloadingReport, setDownloadingReport] = useState(false);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const da = new Date(a.finance_date || 0).getTime();
      const db = new Date(b.finance_date || 0).getTime();
      if (da !== db) return da - db;
      const ca = new Date(a.created_at || a.account_created_at || 0).getTime();
      const cb = new Date(b.created_at || b.account_created_at || 0).getTime();
      return ca - cb;
    });
  }, [customers]);

  const handleExportDailyReport = async () => {
    try {
      setDownloadingReport(true);
      const reportData = await globalCapitalApi.getMasterBusinessLedger();
      exportDailyCategoryReport(reportData, { customers });
    } catch (e) {
      console.error(e);
      alert("Failed to export Daily Finance Report: " + e.message);
    } finally {
      setDownloadingReport(false);
    }
  };

  const actualCapitalInvested =
    position.net_capital_invested !== undefined
      ? position.net_capital_invested
      : Math.max(0, Number(position.disbursed || 0) - Number(position.collected || 0));

  return (
    <section className="content">
      <div className="intro">
        <div>
          <span className="overline">OVERVIEW</span>
          <h2>Business Overview</h2>
          <p>Summary of collections, active loans, and cash balance.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="unifiedReportBtn"
            onClick={handleExportDailyReport}
            disabled={downloadingReport}
            title="Download complete Daily Finance Report (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            <span>{downloadingReport ? "Compiling..." : "Download Report (.xlsx)"}</span>
          </button>
        </div>
      </div>
      <div className="metricGroupHeading">
        <h3>Loan portfolio &amp; returns</h3>
        <p>Principal issued, agreed return, and interest deductions.</p>
      </div>
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <Metric
          title="Total customers"
          value={customers.length || position.total_accounts || position.active_accounts || 0}
          tone="blue"
          count
          explanation="Number of customer loan accounts included in the loaded dashboard data."
          formula="Count of displayed account records; falls back to the API account count."
          period="All non-cancelled accounts in the current dashboard snapshot."
          source="daily_finance_customers and daily_finance_accounts."
        />
        <Metric
          title="Capital Invested (Principal)"
          value={actualCapitalInvested}
          tone="blue"
          explanation="Net principal still outside the business after collections."
          formula="max(0, net amount disbursed - all collections)."
          period="All non-cancelled accounts, lifetime to date."
          source="Daily Finance dashboard position: net_capital_invested."
        />
        <Metric
          title="Total Finance Given (Gross)"
          value={position.total_finance_amount}
          explanation="Total gross principal recorded for daily finance accounts."
          formula="Sum of gross_finance_amount."
          period="All non-cancelled accounts, lifetime to date."
          source="daily_finance_accounts."
        />
        <Metric
          title="Interest"
          value={position.profit}
          explanation="Upfront interest deductions recorded on daily finance accounts."
          formula="Sum of initial_deduction."
          period="All non-cancelled accounts, lifetime to date."
          source="daily_finance_accounts.initial_deduction."
        />
        <Metric
          title="Amount Given"
          value={position.disbursed}
          explanation="Net amount disbursed to borrowers after upfront deductions."
          formula="Sum of gross finance amount minus initial deduction."
          period="All non-cancelled accounts, lifetime to date."
          source="daily_finance_accounts.gross_finance_amount and initial_deduction."
        />
        <Metric
          title="Total Return"
          value={position.total_agreed_return ?? position.total_finance_amount}
          explanation="Total amount borrowers agreed to repay across their accounts."
          formula="Sum of agreed_total_payable."
          period="All non-cancelled accounts, lifetime to date."
          source="daily_finance_accounts.agreed_total_payable."
        />
        <Metric
          title="Profit"
          value={position.profit}
          tone="green"
          explanation="The dashboard reports the same upfront deduction total as the Interest card."
          formula="Sum of initial_deduction; this duplicates the Interest card value."
          period="All non-cancelled accounts, lifetime to date."
          source="daily_finance_accounts.initial_deduction."
        />
      </div>
      <div className="metricGroupHeading">
        <h3>Collections &amp; cash outlook</h3>
        <p>Amounts collected, remaining receivable, and the current estimate.</p>
      </div>
      <div className="metricGrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <Metric
          title="Loan Balance Reductions"
          value={position.collected}
          tone="green"
          explanation="Total payments recorded against daily finance accounts."
          formula="Sum of payment amounts excluding VOID records."
          period="All dates, lifetime to date."
          source="daily_finance_payments."
        />
        <Metric
          title="Remaining"
          value={position.receivable}
          tone="orange"
          explanation="Agreed repayment balance still receivable from borrowers."
          formula="Sum of agreed_total_payable minus all non-void payments."
          period="All non-cancelled accounts, lifetime to date."
          source="daily_finance_accounts and daily_finance_payments."
        />
        <Metric
          title="Cash Received (Non-transfer)"
          value={position.cash_collected}
          tone="green"
          explanation="Payments counted as cash receipts by the dashboard."
          formula="Sum of non-void payments whose payment method is not TRANSFER."
          period="All dates, lifetime to date."
          source="daily_finance_payments.amount and payment_method."
        />
        <Metric
          title="Next Month Projected Amount"
          value={Number(position.cash_collected || 0) + Math.round(Number(position.receivable || 0) * 0.5)}
          tone="orange"
          explanation="A simple estimate that adds half of the current receivable to non-transfer cash collections."
          formula="cash_collected + round(receivable × 50%)."
          period="Projection for the next month, based on the current dashboard totals."
          source="Daily Finance dashboard position; it is a fixed-ratio estimate, not an EMI schedule."
        />
      </div>
      <div className="dashboardGrid" style={{ gridTemplateColumns: "1fr" }}>
        <div className="card tableWrap">
          <div className="cardHead">
            <div>
              <h3>Customer Accounts ({customers.length || position.total_accounts || position.active_accounts || 0})</h3>
              <p>Active and completed daily loans.</p>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style={{ width: "50px" }}>S.No</th>
                <th style={{ textAlign: "center" }}>Finance date</th>
                <th>Customer</th>
                <th>Finance amount</th>
                <th>Interest</th>
                <th>Amount given</th>
                <th>Total return</th>
                <th>Collected</th>
                <th>Remaining</th>
                <th>Profit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer, idx) => {
                const isThisLoading = loadingDetailsId === customer.customer_id;
                return (
                  <tr
                    key={customer.finance_id}
                    onClick={() => openDetails(customer.customer_id, customer)}
                    className={`clickable ${isThisLoading ? "rowLoading" : ""}`}
                  >
                    <td style={{ color: "#64748b", fontWeight: "600", width: "50px" }}>{idx + 1}</td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{dateLabel(customer.finance_date)}</td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <b>{customer.customer_name}</b>
                        {isThisLoading && (
                          <Loader2
                            size={13}
                            style={{
                              color: "#0d9488",
                              animation: "autoSpin 0.75s linear infinite",
                            }}
                          />
                        )}
                      </div>
                      <small>
                        {customer.mobile_number ? (
                          <PhoneLink phone={customer.mobile_number} />
                        ) : (
                          customer.address || "No contact details"
                        )}
                      </small>
                    </td>
                    <td>{money(customer.gross_finance_amount)}</td>
                    <td>
                      {money(customer.initial_deduction)}{" "}
                      {customer.interest_type === "PERCENT" && (
                        <small>({customer.interest_value}%)</small>
                      )}
                    </td>
                    <td>{money(customer.net_disbursement)}</td>
                    <td>{money(customer.agreed_total_payable)}</td>
                    <td>{money(customer.total_collected)}</td>
                    <td className="redText">
                      {money(customer.outstanding_receivable)}
                    </td>
                    <td className="greenText">
                      {money(customer.initial_deduction)}
                    </td>
                    <td>
                      <span className={`tag ${customer.status.toLowerCase()}`}>
                        {customer.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!customers.length && <Empty text="No customers yet." />}
        </div>
      </div>
    </section>
  );
}
