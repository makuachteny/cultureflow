"use client";

import { useState } from "react";

type Account = {
  id:          string;
  provider:    "MPESA_TILL" | "MOMO_MERCHANT" | "MGURUSH_MERCHANT";
  externalId:  string;
  payeeMsisdn: string | null;
  label:       string | null;
  verifiedAt:  string | null;
  isDefault:   boolean;
};

const PROVIDER_LABEL: Record<Account["provider"], string> = {
  MPESA_TILL:        "M-Pesa till / paybill",
  MOMO_MERCHANT:     "MTN MoMo merchant code",
  MGURUSH_MERCHANT:  "m-Gurush merchant code"
};

export default function MobileMoneyAccountsCard({
  initialAccounts
}: {
  initialAccounts: Account[];
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [provider,   setProvider]   = useState<Account["provider"]>("MPESA_TILL");
  const [externalId, setExternalId] = useState("");
  const [payeeMsisdn, setPayeeMsisdn] = useState("");
  const [label,      setLabel]      = useState("");
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/connect/mobile-money", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider,
        externalId,
        payeeMsisdn: payeeMsisdn || undefined,
        label:       label || undefined,
        isDefault:   accounts.filter((a) => a.provider === provider).length === 0
      })
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "Could not save the account.");
      return;
    }
    setAccounts((prev) => {
      const without = prev.filter((a) => a.id !== data.account.id);
      return [...without, { ...data.account, verifiedAt: data.account.verifiedAt ?? null }];
    });
    setExternalId(""); setPayeeMsisdn(""); setLabel("");
  }

  return (
    <section className="card p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-700" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="2" width="12" height="20" rx="2" />
            <path d="M11 18h2" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[18px] font-bold text-nile-900">Mobile-money payouts</h2>
          <p className="mt-1 text-[13.5px] text-ink-600 leading-relaxed">
            For M-Pesa (KES), MTN MoMo (UGX/RWF/SSP), or m-Gurush (SSP) payouts.
            Add your till / paybill / merchant code below — the CultureFlow team
            verifies it within one business day before it goes live.
          </p>

          {accounts.length > 0 && (
            <ul className="mt-5 divide-y divide-[color:var(--border-hairline)] rounded-md ring-1 ring-[color:var(--border-hairline)] bg-white">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold text-nile-900">
                      {a.label || PROVIDER_LABEL[a.provider]}
                    </div>
                    <div className="text-[12px] text-ink-600 font-mono">
                      {PROVIDER_LABEL[a.provider]} · {a.externalId}
                      {a.payeeMsisdn ? ` · ${a.payeeMsisdn}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {a.isDefault && <span className="chip chip-nile">Default</span>}
                    {a.verifiedAt
                      ? <span className="chip chip-acacia">Verified</span>
                      : <span className="chip chip-gold">Pending verification</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={onSubmit} className="mt-5 grid sm:grid-cols-2 gap-3">
            <label className="text-[12px] font-semibold text-ink-700">
              Rail
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Account["provider"])}
                className="input mt-1"
              >
                <option value="MPESA_TILL">M-Pesa till / paybill (KES)</option>
                <option value="MOMO_MERCHANT">MTN MoMo merchant code</option>
                <option value="MGURUSH_MERCHANT">m-Gurush merchant code (SSP)</option>
              </select>
            </label>
            <label className="text-[12px] font-semibold text-ink-700">
              Till / merchant code
              <input
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                required
                placeholder="174379"
                className="input mt-1"
              />
            </label>
            <label className="text-[12px] font-semibold text-ink-700">
              Payee phone (optional)
              <input
                value={payeeMsisdn}
                onChange={(e) => setPayeeMsisdn(e.target.value)}
                placeholder="+254712345678"
                className="input mt-1"
              />
            </label>
            <label className="text-[12px] font-semibold text-ink-700">
              Label (optional)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="My Safaricom till"
                className="input mt-1"
              />
            </label>
            {err && (
              <div role="alert" className="sm:col-span-2 text-[13px] text-hibiscus font-semibold">
                {err}
              </div>
            )}
            <div className="sm:col-span-2">
              <button disabled={busy || !externalId} className="btn btn-primary">
                {busy ? "Saving…" : "Add account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
