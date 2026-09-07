import { VoucherItem, Company, Customer, Supplier } from '@/types';

export interface CalculatedVoucherTotals {
  items: VoucherItem[];
  subtotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  isInterstate: boolean;
}

/**
 * Checks if supply is interstate based on state codes or names
 */
export function isInterstateSupply(
  companyStateCode?: string,
  partyStateCode?: string,
  placeOfSupply?: string
): boolean {
  if (companyStateCode && partyStateCode) {
    return companyStateCode.trim().toLowerCase() !== partyStateCode.trim().toLowerCase();
  }
  if (companyStateCode && placeOfSupply) {
    return companyStateCode.trim().toLowerCase() !== placeOfSupply.trim().toLowerCase();
  }
  return false;
}

/**
 * Calculates line-level taxes and line total for a voucher item
 */
export function calculateItemTaxes(
  item: {
    quantity: number;
    rate: number;
    discount?: number;
    gstPercent: number;
  },
  isInterstate: boolean
): {
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
} {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discount = Number(item.discount) || 0;
  const taxable = Math.max(0, qty * rate - discount);
  const gstPercent = Number(item.gstPercent) || 0;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = Number(((taxable * gstPercent) / 100).toFixed(2));
  } else {
    const halfRate = gstPercent / 2;
    cgst = Number(((taxable * halfRate) / 100).toFixed(2));
    sgst = Number(((taxable * halfRate) / 100).toFixed(2));
  }

  const total = Number((taxable + cgst + sgst + igst).toFixed(2));

  return {
    taxableAmount: Number(taxable.toFixed(2)),
    cgst,
    sgst,
    igst,
    total,
  };
}

/**
 * Recalculates full voucher items list and overall tax breakdown
 */
export function calculateVoucherTotals(
  rawItems: VoucherItem[],
  company?: Partial<Company> | null,
  party?: Partial<Customer | Supplier> | null,
  placeOfSupply?: string
): CalculatedVoucherTotals {
  const isInterstate = isInterstateSupply(
    company?.stateCode,
    party?.stateCode,
    placeOfSupply
  );

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const calculatedItems = rawItems.map((it) => {
    const taxes = calculateItemTaxes(it, isInterstate);
    subtotal += taxes.taxableAmount;
    cgstTotal += taxes.cgst;
    sgstTotal += taxes.sgst;
    igstTotal += taxes.igst;

    return {
      ...it,
      taxableAmount: taxes.taxableAmount,
      cgst: taxes.cgst,
      sgst: taxes.sgst,
      igst: taxes.igst,
      total: taxes.total,
    };
  });

  const taxTotal = Number((cgstTotal + sgstTotal + igstTotal).toFixed(2));
  const unrounded = Number((subtotal + taxTotal).toFixed(2));
  const grandTotal = Math.round(unrounded);
  const roundOff = Number((grandTotal - unrounded).toFixed(2));

  return {
    items: calculatedItems,
    subtotal: Number(subtotal.toFixed(2)),
    taxableAmount: Number(subtotal.toFixed(2)),
    cgstTotal: Number(cgstTotal.toFixed(2)),
    sgstTotal: Number(sgstTotal.toFixed(2)),
    igstTotal: Number(igstTotal.toFixed(2)),
    taxTotal,
    roundOff,
    grandTotal,
    isInterstate,
  };
}
