'use client';

import React from 'react';
import { Voucher } from '@/types';
import { formatCurrency } from '@/lib/utils/currencyFormatter';
import { formatDateDisplay } from '@/lib/utils/dateUtils';
import { numberToWords } from '@/lib/utils/numberToWords';

interface PrintableGstInvoiceProps {
  voucher: Voucher | null;
}

export function PrintableGstInvoice({ voucher }: PrintableGstInvoiceProps) {
  if (!voucher) return null;

  const company = voucher.companySnapshot || {};
  const customer = voucher.customerSnapshot || {};
  const supplier = voucher.supplierSnapshot || {};
  const items = voucher.items || [];
  const grandTotal = voucher.grandTotal || voucher.amount || 0;
  const isSales = voucher.voucherType === 'sales';
  const isPurchase = voucher.voucherType === 'purchase';
  const isReceipt = voucher.voucherType === 'receipt';
  const isPayment = voucher.voucherType === 'payment';

  const titleMap: Record<string, string> = {
    sales: 'TAX INVOICE',
    purchase: 'PURCHASE BILL / INWARD VOUCHER',
    receipt: 'PAYMENT RECEIPT VOUCHER',
    payment: 'PAYMENT DISBURSEMENT VOUCHER',
  };

  const title = titleMap[voucher.voucherType] || 'GST INVOICE';
  const party = isSales || isReceipt ? customer : supplier;
  const partyLabel = isSales ? 'Buyer / Bill To' : isReceipt ? 'Received From (Customer)' : isPurchase ? 'Supplier / Bill From' : 'Paid To (Supplier)';

  const shipTo = voucher.shipTo || {
    name: customer.name,
    address: customer.shippingAddress?.address || customer.address,
    city: customer.shippingAddress?.city || customer.city,
    state: customer.shippingAddress?.state || customer.state,
    stateCode: customer.shippingAddress?.stateCode || customer.stateCode,
    pincode: customer.shippingAddress?.pincode || customer.pincode,
    gstin: customer.gstin,
  };

  return (
    <div id="printable-gst-invoice" className="hidden print:block print:w-full bg-white text-black p-6 font-sans text-xs leading-normal">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-gst-invoice,
          #printable-gst-invoice * {
            visibility: visible;
          }
          #printable-gst-invoice {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 12mm 15mm;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          .no-break {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Main Container Border */}
      <div className="border-2 border-black w-full">
        {/* Top Header Title */}
        <div className="text-center border-b-2 border-black py-1.5 bg-gray-100 font-bold text-sm tracking-wider uppercase">
          {title}
        </div>

        {/* Header: Company Details & Invoice Metadata */}
        <div className="grid grid-cols-2 border-b border-black">
          {/* Company Details (Left) */}
          <div className="p-3 border-r border-black space-y-1">
            <h1 className="text-base font-extrabold uppercase tracking-tight">{company.name || 'Company Name'}</h1>
            <p className="text-[11px] text-gray-800">{company.address}</p>
            <p className="text-[11px] text-gray-800">
              {company.city}{company.state ? `, ${company.state}` : ''}{company.pincode ? ` - ${company.pincode}` : ''}
            </p>
            <p className="text-[11px] font-bold">GSTIN / UIN: <span className="font-mono">{company.gstin || 'N/A'}</span></p>
            {company.pan && <p className="text-[11px]">PAN: <span className="font-mono">{company.pan}</span></p>}
            <p className="text-[10px] text-gray-600">
              State: {company.state || 'N/A'} {company.stateCode ? `(Code: ${company.stateCode})` : ''} • Phone: {company.phone || 'N/A'} • Email: {company.email || 'N/A'}
            </p>
          </div>

          {/* Invoice Specifics (Right) */}
          <div className="p-3 space-y-1 bg-gray-50/50">
            <div className="flex justify-between border-b border-gray-300 pb-1">
              <span className="font-bold">Voucher / Invoice No:</span>
              <span className="font-mono font-bold text-sm">{voucher.voucherNumber}</span>
            </div>
            <div className="flex justify-between border-b border-gray-300 pb-1">
              <span className="font-bold">Date:</span>
              <span className="font-mono">{formatDateDisplay(voucher.date)}</span>
            </div>
            {isSales && (
              <>
                <div className="flex justify-between border-b border-gray-300 pb-1">
                  <span>Place of Supply:</span>
                  <span className="font-semibold">{voucher.placeOfSupply || company.state || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 pb-1">
                  <span>Reverse Charge:</span>
                  <span>{voucher.reverseCharge ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}
            {isPurchase && (
              <>
                <div className="flex justify-between border-b border-gray-300 pb-1">
                  <span>Supplier Invoice No:</span>
                  <span className="font-mono font-bold">{voucher.supplierInvoiceNumber || 'N/A'}</span>
                </div>
                {voucher.supplierInvoiceDate && (
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span>Supplier Invoice Date:</span>
                    <span>{formatDateDisplay(voucher.supplierInvoiceDate)}</span>
                  </div>
                )}
              </>
            )}
            {(isReceipt || isPayment) && (
              <>
                <div className="flex justify-between border-b border-gray-300 pb-1">
                  <span>Payment Mode:</span>
                  <span className="font-bold">{voucher.paymentMode || 'Cash'}</span>
                </div>
                {voucher.referenceInvoiceNumber && (
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span>Against Ref / Inv No:</span>
                    <span className="font-mono font-bold">{voucher.referenceInvoiceNumber}</span>
                  </div>
                )}
                {voucher.referenceTransactionNumber && (
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span>UTR / Cheque No:</span>
                    <span className="font-mono">{voucher.referenceTransactionNumber}</span>
                  </div>
                )}
                {voucher.bankName && (
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span>Bank Name:</span>
                    <span>{voucher.bankName}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Bill To & Ship To Sections (for Sales / Purchase) */}
        {(isSales || isPurchase) && (
          <div className="grid grid-cols-2 border-b border-black">
            {/* Bill To */}
            <div className="p-3 border-r border-black space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-gray-600 block mb-1">{partyLabel}</span>
              <p className="font-bold text-sm">{party.name || 'Cash Customer'}</p>
              <p className="text-[11px] text-gray-800">{party.address || 'Address not provided'}</p>
              <p className="text-[11px] text-gray-800">
                {party.city}{party.state ? `, ${party.state}` : ''}{party.pincode ? ` - ${party.pincode}` : ''}
              </p>
              <p className="text-[11px]">GSTIN / UIN: <span className="font-mono font-bold">{party.gstin || 'Unregistered'}</span></p>
              <p className="text-[10px] text-gray-600">
                State: {party.state || 'N/A'} {party.stateCode ? `(Code: ${party.stateCode})` : ''} • Phone: {party.phone || 'N/A'}
              </p>
            </div>

            {/* Ship To */}
            <div className="p-3 space-y-0.5 bg-gray-50/30">
              <span className="text-[10px] font-bold uppercase text-gray-600 block mb-1">
                {isSales ? 'Ship To / Consignee' : 'Delivery Destination'}
              </span>
              <p className="font-bold text-sm">{shipTo.name || party.name || company.name}</p>
              <p className="text-[11px] text-gray-800">{shipTo.address || party.address || company.address}</p>
              <p className="text-[11px] text-gray-800">
                {shipTo.city || party.city}{shipTo.state || party.state ? `, ${shipTo.state || party.state}` : ''}{shipTo.pincode || party.pincode ? ` - ${shipTo.pincode || party.pincode}` : ''}
              </p>
              <p className="text-[11px]">GSTIN / UIN: <span className="font-mono">{shipTo.gstin || party.gstin || 'N/A'}</span></p>
              <p className="text-[10px] text-gray-600">
                State: {shipTo.state || party.state || 'N/A'} {shipTo.stateCode || party.stateCode ? `(Code: ${shipTo.stateCode || party.stateCode})` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Receipt / Payment Party Banner (for Receipt / Payment) */}
        {(isReceipt || isPayment) && (
          <div className="p-3 border-b border-black space-y-1">
            <span className="text-[10px] font-bold uppercase text-gray-600 block">{partyLabel}</span>
            <p className="font-bold text-sm">{party.name || (isReceipt ? 'Cash Customer' : 'Supplier')}</p>
            <p className="text-[11px] text-gray-800">{party.address}</p>
            <p className="text-[11px] text-gray-800">
              {party.city}{party.state ? `, ${party.state}` : ''}{party.pincode ? ` - ${party.pincode}` : ''} • Phone: {party.phone || 'N/A'}
            </p>
            {party.gstin && <p className="text-[11px]">GSTIN: <span className="font-mono">{party.gstin}</span></p>}
          </div>
        )}

        {/* Items Table for Sales / Purchase */}
        {(isSales || isPurchase) && (
          <div>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100 font-bold text-center">
                  <th className="p-1.5 border-r border-black w-8">Sr.</th>
                  <th className="p-1.5 border-r border-black text-left">Item Description</th>
                  <th className="p-1.5 border-r border-black w-14">HSN</th>
                  <th className="p-1.5 border-r border-black w-12">Qty</th>
                  <th className="p-1.5 border-r border-black w-10">Unit</th>
                  <th className="p-1.5 border-r border-black w-16 text-right">Rate</th>
                  <th className="p-1.5 border-r border-black w-14 text-right">Disc</th>
                  <th className="p-1.5 border-r border-black w-18 text-right">Taxable</th>
                  <th className="p-1.5 border-r border-black w-10">GST%</th>
                  <th className="p-1.5 border-r border-black w-14 text-right">CGST</th>
                  <th className="p-1.5 border-r border-black w-14 text-right">SGST</th>
                  <th className="p-1.5 border-r border-black w-14 text-right">IGST</th>
                  <th className="p-1.5 w-20 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id || idx} className="border-b border-gray-300">
                    <td className="p-1.5 border-r border-black text-center">{idx + 1}</td>
                    <td className="p-1.5 border-r border-black font-medium">{it.itemName}</td>
                    <td className="p-1.5 border-r border-black font-mono text-center">{it.hsnCode || '-'}</td>
                    <td className="p-1.5 border-r border-black text-center font-bold">{it.quantity}</td>
                    <td className="p-1.5 border-r border-black text-center">{it.unit}</td>
                    <td className="p-1.5 border-r border-black text-right font-mono">{formatCurrency(it.rate)}</td>
                    <td className="p-1.5 border-r border-black text-right font-mono">{it.discount ? formatCurrency(it.discount) : '-'}</td>
                    <td className="p-1.5 border-r border-black text-right font-mono font-medium">{formatCurrency(it.taxableAmount)}</td>
                    <td className="p-1.5 border-r border-black text-center">{it.gstPercent}%</td>
                    <td className="p-1.5 border-r border-black text-right font-mono">{it.cgst ? formatCurrency(it.cgst) : '-'}</td>
                    <td className="p-1.5 border-r border-black text-right font-mono">{it.sgst ? formatCurrency(it.sgst) : '-'}</td>
                    <td className="p-1.5 border-r border-black text-right font-mono">{it.igst ? formatCurrency(it.igst) : '-'}</td>
                    <td className="p-1.5 text-right font-mono font-bold">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations & Summary Section */}
            <div className="grid grid-cols-12 border-t-2 border-black">
              {/* Left Column: Amount in words & Bank Details */}
              <div className="col-span-7 p-3 border-r border-black space-y-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-gray-600 block">Total Amount in Words:</span>
                  <p className="font-bold text-xs italic">{numberToWords(voucher.grandTotal)}</p>
                </div>

                {company.bankDetails && (
                  <div className="border border-gray-300 p-2 rounded bg-gray-50/50 space-y-0.5 text-[10px]">
                    <span className="font-bold block uppercase text-gray-700">Company Bank Details for Remittance:</span>
                    <p>Bank: <span className="font-semibold">{company.bankDetails.bankName || 'N/A'}</span></p>
                    <p>A/C Name: <span className="font-semibold">{company.bankDetails.accountName || company.name}</span></p>
                    <p>A/C No: <span className="font-mono font-bold">{company.bankDetails.accountNumber || 'N/A'}</span></p>
                    <p>IFSC: <span className="font-mono font-bold">{company.bankDetails.ifsc || 'N/A'}</span></p>
                    {company.bankDetails.branch && <p>Branch: {company.bankDetails.branch}</p>}
                  </div>
                )}

                {voucher.termsAndConditions && (
                  <div className="text-[9px] text-gray-600 pt-1">
                    <span className="font-bold block uppercase">Terms &amp; Conditions:</span>
                    <p className="whitespace-pre-line">{voucher.termsAndConditions}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Tax Breakdown & Grand Total */}
              <div className="col-span-5 p-3 space-y-1.5 bg-gray-50/30">
                <div className="flex justify-between text-[11px] pb-1 border-b border-gray-300">
                  <span>Taxable Amount (Subtotal):</span>
                  <span className="font-mono font-bold">{formatCurrency(voucher.taxableAmount || voucher.subtotal || 0)}</span>
                </div>
                {(voucher.cgstTotal || 0) > 0 && (
                  <div className="flex justify-between text-[11px] pb-1 border-b border-gray-300">
                    <span>CGST Total:</span>
                    <span className="font-mono font-semibold">{formatCurrency(voucher.cgstTotal || 0)}</span>
                  </div>
                )}
                {(voucher.sgstTotal || 0) > 0 && (
                  <div className="flex justify-between text-[11px] pb-1 border-b border-gray-300">
                    <span>SGST Total:</span>
                    <span className="font-mono font-semibold">{formatCurrency(voucher.sgstTotal || 0)}</span>
                  </div>
                )}
                {(voucher.igstTotal || 0) > 0 && (
                  <div className="flex justify-between text-[11px] pb-1 border-b border-gray-300">
                    <span>IGST Total:</span>
                    <span className="font-mono font-semibold">{formatCurrency(voucher.igstTotal || 0)}</span>
                  </div>
                )}
                {voucher.roundOff !== undefined && voucher.roundOff !== 0 && (
                  <div className="flex justify-between text-[11px] pb-1 border-b border-gray-300 text-gray-600">
                    <span>Round-off:</span>
                    <span className="font-mono">{voucher.roundOff > 0 ? `+${voucher.roundOff}` : voucher.roundOff}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-extrabold pt-1.5 border-t-2 border-black">
                  <span>GRAND TOTAL:</span>
                  <span className="font-mono text-base">{formatCurrency(voucher.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Receipt / Payment Voucher Body */}
        {(isReceipt || isPayment) && (
          <div className="p-4 space-y-4">
            <div className="p-4 border-2 border-black rounded bg-gray-50/50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-gray-600 block">
                  {isReceipt ? 'Total Amount Received:' : 'Total Amount Paid:'}
                </span>
                <span className="text-2xl font-black font-mono">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase text-gray-600 block">Payment Mode:</span>
                <span className="text-sm font-bold uppercase px-2.5 py-1 bg-black text-white rounded">
                  {voucher.paymentMode || 'Cash'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-gray-600 block">Amount in Words:</span>
              <p className="font-bold text-sm italic">{numberToWords(grandTotal)}</p>
            </div>

            {voucher.narration && (
              <div className="border border-gray-300 p-2.5 rounded">
                <span className="text-[10px] font-bold uppercase text-gray-600 block">Narration / Notes:</span>
                <p className="text-xs text-gray-800 mt-0.5">{voucher.narration}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer: Signatures */}
        <div className="grid grid-cols-2 border-t-2 border-black p-4 no-break">
          <div className="space-y-8">
            <p className="text-[10px] text-gray-600">
              * This is a computer generated invoice and accounting document.
            </p>
            <div className="pt-8">
              <span className="border-t border-black pt-1 block w-40 text-center text-[10px]">
                Receiver's Signature
              </span>
            </div>
          </div>

          <div className="text-right space-y-8">
            <p className="text-xs font-bold uppercase">For {company.name || 'Company'}</p>
            <div className="pt-8 flex justify-end">
              <span className="border-t border-black pt-1 block w-48 text-center text-[10px] font-bold">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
