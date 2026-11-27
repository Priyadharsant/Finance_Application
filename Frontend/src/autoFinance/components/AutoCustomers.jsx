import React, { useState } from "react";
import { UserRound, Calendar, X, RotateCcw, Search, Users, MapPin, Mail, ArrowUpRight, Download, Edit3 } from "lucide-react";
import EditAutoCustomerModal from "../modals/EditAutoCustomerModal";

export default function AutoCustomers({
  filteredCustomers = [],
  customerMonthFilter = "",
  setCustomerMonthFilter,
  search = "",
  setSearch,
  handleExportCustomers,
  setSelectedCustomer,
  onUpdateCustomer,
}) {
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [busy, setBusy] = useState(false);

  const isFiltered = Boolean(customerMonthFilter) || Boolean(search);

  const handleResetFilters = () => {
    setCustomerMonthFilter?.("");
    setSearch("");
  };

  const handleSaveCustomer = async (id, updatedFields) => {
    setBusy(true);
    try {
      if (onUpdateCustomer) {
        await onUpdateCustomer(id, updatedFields);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="content autoCustomersPage">
      <div className="autoCustomersHero">
        <div className="autoCustomersHeroCopy">
          <span className="overline autoBadgeTag">CUSTOMER MANAGEMENT</span>
          <h2>Customer directory</h2>
          <p>Find customer profiles, contact details, and vehicle loan history in one place.</p>
        </div>
        <div className="autoCustomersHeroActions">
          <div className="autoCustomersTotal" aria-label={`${filteredCustomers.length} customers shown`}>
            <span className="autoCustomersTotalIcon"><Users size={18} /></span>
            <span><strong>{filteredCustomers.length}</strong><small>customers shown</small></span>
          </div>
          {handleExportCustomers && <button type="button" className="autoCustomerExport" onClick={handleExportCustomers}><Download size={15} /> Export list</button>}
        </div>
      </div>

      <div className="autoCustomersToolbar">
        <label className="autoCustomerSearch">
          <Search size={17} aria-hidden="true" />
          <input
            placeholder="Search name, phone, code, address or notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search customers"
          />
          {search && <button type="button" onClick={() => setSearch("")} title="Clear search" aria-label="Clear search"><X size={15} /></button>}
        </label>

        <label className="autoCustomerMonth" title="Filter by registration month">
          <Calendar size={16} aria-hidden="true" />
          <span>Joined</span>
          <input
            type="month"
            value={customerMonthFilter}
            onChange={(e) => setCustomerMonthFilter?.(e.target.value)}
            aria-label="Filter customers by registration month"
          />
          {customerMonthFilter && <button type="button" onClick={() => setCustomerMonthFilter?.("")} title="Clear month filter" aria-label="Clear month filter"><X size={14} /></button>}
        </label>

        {isFiltered && <button type="button" className="autoSecondaryBtn" onClick={handleResetFilters}><RotateCcw size={14} /> Clear filters</button>}
      </div>

      <div className="autoCustomersTableCard">
        <div className="autoCustomersTableHeading">
          <div><h3>All customers</h3><p>Select a customer to view their profile and loan history.</p></div>
          <span>{filteredCustomers.length} {filteredCustomers.length === 1 ? "record" : "records"}</span>
        </div>
        <div className="autoCustomersTableScroll">
          <table className="autoCustomersTable">
            <thead><tr><th className="autoCustomerIndex">#</th><th>Customer</th><th>Phone</th><th>Email</th><th>Location</th><th>Address</th><th>Action</th><th aria-label="Open profile" /></tr></thead>
            <tbody>
              {filteredCustomers.map((c, idx) => {
                const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed customer";
                const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
                return (
                  <tr key={c.id} className="autoCustomerRow" onClick={() => setSelectedCustomer(c)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedCustomer(c); } }}>
                    <td className="autoCustomerIndex">{String(idx + 1).padStart(2, "0")}</td>
                    <td><div className="autoCustomerIdentity"><span className="autoCustomerAvatar">{initials || <UserRound size={17} />}</span><span className="autoCustomerName"><strong>{name}</strong><small>{c.customer_code || "Customer profile"}</small></span></div></td>
                    <td>{c.phone ? <a className="phoneLink" href={`tel:${c.phone}`} onClick={(event) => event.stopPropagation()}>{c.phone}</a> : <span className="autoCustomerMuted">—</span>}</td>
                    <td>{c.email ? <span className="autoCustomerInline"><Mail size={14} />{c.email}</span> : <span className="autoCustomerMuted">—</span>}</td>
                    <td>{c.city || c.state ? <span className="autoCustomerInline"><MapPin size={14} />{[c.city, c.state].filter(Boolean).join(", ")}</span> : <span className="autoCustomerMuted">—</span>}</td>
                    <td className="autoCustomerAddress" title={c.address || ""}>{c.address || <span className="autoCustomerMuted">—</span>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="autoSecondaryBtn"
                        style={{ padding: "4px 8px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", borderRadius: "6px" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCustomer(c);
                        }}
                        title="Edit Customer Profile"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    </td>
                    <td><span className="autoCustomerOpen" aria-hidden="true"><ArrowUpRight size={16} /></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredCustomers.length && <div className="autoCustomersEmpty"><span><UserRound size={22} /></span><strong>No customers found</strong><p>Try a different name, contact, or registration month.</p>{isFiltered && <button type="button" className="autoSecondaryBtn" onClick={handleResetFilters}>Clear filters</button>}</div>}
        </div>
      </div>

      {editingCustomer && (
        <EditAutoCustomerModal
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => setEditingCustomer(null)}
          busy={busy}
        />
      )}
    </section>
  );
}
