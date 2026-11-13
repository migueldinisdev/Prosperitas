import React, { useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import { Link } from "react-router-dom";
import type { TransferFee, TransferWalletTx } from "../core/schema-types";
import { deriveWalletState } from "../core/finance/deriveWalletState";
import { nextLedgerSequence, quantitySum } from "../core/finance/walletLedger";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { saveWalletTransfer } from "../store/thunks/walletThunks";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { formatCurrency } from "../utils/formatters";

interface Props { walletId: string; transfer?: TransferWalletTx; onClose: () => void }
const inputClass = "w-full bg-app-surface border border-app-border rounded-lg px-3 py-2 text-app-foreground focus:outline-none focus:ring-1 focus:ring-app-primary";
const labelClass = "block text-xs font-medium text-app-muted mb-1";
const parse = (value: string) => Number(value.replace(/,/g, ".").trim());
const today = (timezone: string) => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: timezone === "GMT+0" ? "Europe/Lisbon" : timezone }); }
    catch { return new Date().toLocaleDateString("en-CA"); }
};

/** Mounted afresh on open so an old draft never leaks into another transfer. */
export function WalletTransferModal({ walletId, transfer, onClose }: Props) {
    const state = useAppSelector((s) => ({ walletTx: s.walletTx, wallets: s.wallets, walletPositions: s.walletPositions, assets: s.assets, pies: s.pies, settings: s.settings }), shallowEqual);
    const dispatch = useAppDispatch();
    const outgoing = transfer?.direction === "in"
        ? Object.values(state.walletTx).find((tx): tx is TransferWalletTx => tx.type === "transfer" && tx.transferId === transfer.transferId && tx.direction === "out")
        : transfer;
    const [from, setFrom] = useState(outgoing?.walletId ?? walletId);
    const [to, setTo] = useState(outgoing?.counterpartWalletId ?? "");
    const [assetId, setAssetId] = useState(outgoing?.assetId ?? "");
    const [quantity, setQuantity] = useState(outgoing?.quantity.toString() ?? "");
    const [date, setDate] = useState(outgoing?.date ?? today(state.settings.timezone));
    const [feeAmount, setFeeAmount] = useState(outgoing?.fee ? (outgoing.fee.kind === "cash" ? outgoing.fee.amount.value : outgoing.fee.quantity).toString() : "");
    const [feeAsset, setFeeAsset] = useState(outgoing?.fee?.kind === "asset" ? `asset:${outgoing.fee.assetId}` : `cash:${outgoing?.fee?.kind === "cash" ? outgoing.fee.amount.currency : "EUR"}`);
    const [reference, setReference] = useState(outgoing?.reference ?? "");
    const [saveError, setSaveError] = useState("");
    const fee: TransferFee | undefined = feeAmount.trim() ? feeAsset.startsWith("asset:")
        ? { kind: "asset", assetId: feeAsset.slice(6), quantity: parse(feeAmount) }
        : { kind: "cash", amount: { value: parse(feeAmount), currency: feeAsset.slice(5) as "EUR" | "USD" | "GBP" } }
        : undefined;
    const input = { walletId: from, counterpartWalletId: to, assetId, quantity: parse(quantity), date, fee, reference: reference.trim() || undefined };
    const preview = useMemo(() => {
        if (!from || !to || !assetId || !quantity.trim() || !date) return null;
        const id = outgoing?.transferId ?? "transfer_preview";
        const createdAt = outgoing?.createdAt ?? new Date().toISOString();
        const tx: TransferWalletTx = { ...input, id: `${id}_out`, transferId: id, direction: "out", type: "transfer", createdAt, sequence: outgoing?.sequence ?? nextLedgerSequence(state.walletTx), lots: [] };
        const incoming: TransferWalletTx = { ...tx, id: `${id}_in`, direction: "in", walletId: to, counterpartWalletId: from, fee: undefined };
        const transactions = Object.fromEntries(Object.entries(state.walletTx).filter(([, tx]) => tx.type !== "transfer" || tx.transferId !== id));
        transactions[tx.id] = tx;
        transactions[incoming.id] = incoming;
        const result = deriveWalletState(state, transactions);
        return { ...result, tx: result.value?.walletTx[tx.id] as TransferWalletTx | undefined };
    }, [state.walletTx, state.walletPositions, state.wallets, state.assets, state.pies, from, to, assetId, quantity, date, feeAmount, feeAsset, reference, outgoing]);
    const sourceAssetIds = new Set(Object.entries(state.walletPositions[from] ?? {}).filter(([, p]) => p.amount > 0).map(([id]) => id));
    // Editing an outgoing transfer must still offer fully transferred positions.
    if (outgoing?.walletId === from) {
        sourceAssetIds.add(outgoing.assetId);
        if (outgoing.fee?.kind === "asset") sourceAssetIds.add(outgoing.fee.assetId);
    }
    const assets = [...sourceAssetIds].map((id) => state.assets[id]).filter(Boolean).sort((a, b) => a.ticker.localeCompare(b.ticker));
    const asset = state.assets[assetId];
    const hasAssetFee = fee?.kind === "asset" && fee.assetId === assetId;
    const totalDebit = quantitySum(parse(quantity) || 0, hasAssetFee ? fee.quantity || 0 : 0);
    const valid = preview?.value && !preview.violation;
    return <Modal isOpen onClose={onClose} title={transfer ? "Edit Transfer" : "Transfer"}>
        <form className="space-y-4" onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            if (dispatch(saveWalletTransfer(input, outgoing?.transferId))) onClose();
            else setSaveError("Transfer could not be saved. Check the wallet history and balances.");
        }}>
            <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass} htmlFor="transfer-from">From wallet</label>
                <select id="transfer-from" className={inputClass} value={from} onChange={(e) => { setFrom(e.target.value); setAssetId(""); }}>
                    {Object.values(state.wallets).map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                </select></div>
            <div><label className={labelClass} htmlFor="transfer-to">To wallet</label>
                <select id="transfer-to" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)}>
                    <option value="">Select destination</option>
                    {Object.values(state.wallets).filter((w) => w.id !== from).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select></div>
            </div>
            <div><label className={labelClass} htmlFor="transfer-asset">Asset</label>
                <select id="transfer-asset" className={inputClass} value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                    <option value="">Select asset</option>
                    {assets.map((a) => <option key={a.id} value={a.id}>{a.ticker} • {a.name}</option>)}
                </select>
                {!assets.length && <p className="text-xs text-app-muted mt-1">No assets available in this wallet.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass} htmlFor="transfer-quantity">Quantity to receive</label>
                <input id="transfer-quantity" className={inputClass} inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
                <p className="text-xs text-app-muted mt-1">Fees are charged in addition in the source wallet.</p>
            </div>
            <div><label className={labelClass} htmlFor="transfer-date">Date</label><input id="transfer-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass} htmlFor="transfer-fee">Fee (optional)</label><input id="transfer-fee" className={inputClass} inputMode="decimal" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} /></div>
                <div><label className={labelClass} htmlFor="transfer-fee-asset">Fee paid in</label><select id="transfer-fee-asset" className={inputClass} value={feeAsset} onChange={(e) => setFeeAsset(e.target.value)}>
                    {["EUR", "USD", "GBP"].map((currency) => <option key={currency} value={`cash:${currency}`}>{currency} cash</option>)}
                    {assets.map((a) => <option key={a.id} value={`asset:${a.id}`}>{a.ticker}</option>)}
                </select></div>
            </div>
            <div><label className={labelClass} htmlFor="transfer-reference">Exchange / blockchain reference (optional)</label><input id="transfer-reference" className={inputClass} value={reference} onChange={(e) => setReference(e.target.value)} /></div>
            {preview?.violation && <p role="alert" className="text-sm text-app-danger">{preview.violation.message} ({preview.violation.tx.date})</p>}
            {valid && <div className="rounded-lg border border-app-border p-3 space-y-2 text-sm">
                <p>{state.wallets[from]?.name}: −{totalDebit.toLocaleString(undefined, { maximumFractionDigits: 15 })} {asset?.ticker}</p>
                <p>{state.wallets[to]?.name}: +{parse(quantity).toLocaleString(undefined, { maximumFractionDigits: 15 })} {asset?.ticker}</p>
                {fee && !hasAssetFee && <p className="text-app-muted">Additional fee: {fee.kind === "cash" ? formatCurrency(fee.amount.value, fee.amount.currency) : `${fee.quantity} ${state.assets[fee.assetId]?.ticker}`}</p>}
                <p className="font-medium pt-1">Original purchase lots (FIFO)</p>
                {preview.tx?.lots.map((lot, i) => <div key={`${lot.sourceTxId}-${i}`} className="text-xs text-app-muted break-words">
                    {lot.quantity} {asset?.ticker} · {lot.acquiredAt.slice(0, 10)} · {formatCurrency(lot.price.value, lot.price.currency)}/unit
                    <div>Purchase <Link className="text-app-primary underline" to={`/wallets/${state.walletTx[lot.sourceTxId]?.walletId}?transaction=${encodeURIComponent(lot.sourceTxId)}`} onClick={onClose}>{lot.sourceTxId}</Link></div>
                    {!!lot.transferIds.length && <div>Previous transfers: {lot.transferIds.map((id, index) => {
                        const leg = Object.values(state.walletTx).find((tx) => tx.type === "transfer" && tx.transferId === id && tx.direction === "out");
                        return <React.Fragment key={id}>{index > 0 && " → "}{leg ? <Link className="text-app-primary underline" onClick={onClose} to={`/wallets/${leg.walletId}?transaction=${encodeURIComponent(leg.id)}`}>{id}</Link> : id}</React.Fragment>;
                    })}</div>}
                </div>)}
            </div>}
            {saveError && <p role="alert" className="text-sm text-app-danger">{saveError}</p>}
            <Button className="w-full" disabled={!valid}>{transfer ? "Save Transfer" : "Transfer"}</Button>
        </form>
    </Modal>;
}
