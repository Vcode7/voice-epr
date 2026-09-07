import { NextRequest, NextResponse } from 'next/server';
import { dbVouchers, dbCompanies, dbCustomers, dbSuppliers, dbItems } from '@/lib/db/models';
import { VoucherType } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const voucherType = searchParams.get('voucherType') as VoucherType | 'all' | null;
    const companyId = searchParams.get('companyId') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const supplierId = searchParams.get('supplierId') || undefined;
    const date = searchParams.get('date') || undefined;
    const search = searchParams.get('search') || undefined;

    const vouchers = await dbVouchers.getAll({
      voucherType: voucherType || 'all',
      companyId,
      customerId,
      supplierId,
      date,
      search,
    });

    return NextResponse.json(vouchers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch vouchers.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { voucherType, companyId, customerId, supplierId, items, amount } = body;

    if (!voucherType || !companyId) {
      return NextResponse.json(
        { error: 'Voucher Type and Company are strictly required.' },
        { status: 400 }
      );
    }

    // 1. Validate Company
    const company = await dbCompanies.getById(companyId);
    if (!company) {
      return NextResponse.json(
        { error: `Company not found in Company master. Please select a valid company.` },
        { status: 400 }
      );
    }

    // 2. Validate Voucher Type Specifics
    if (voucherType === 'sales') {
      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer is strictly required for Sales vouchers.' },
          { status: 400 }
        );
      }
      const customer = await dbCustomers.getById(customerId);
      if (!customer) {
        return NextResponse.json(
          { error: `Customer not found in Customer master. Please select or add the customer first.` },
          { status: 400 }
        );
      }
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: 'At least one item from Item master is required for Sales voucher.' },
          { status: 400 }
        );
      }
      // Validate all items exist in Item master
      for (const it of items) {
        if (!it.itemId) {
          return NextResponse.json(
            { error: `Item "${it.itemName || 'Unknown'}" must be selected strictly from Item master.` },
            { status: 400 }
          );
        }
        const masterItem = await dbItems.getById(it.itemId);
        if (!masterItem) {
          return NextResponse.json(
            { error: `Item "${it.itemName || it.itemId}" not found in Item master.` },
            { status: 400 }
          );
        }
      }
    } else if (voucherType === 'purchase') {
      if (!supplierId) {
        return NextResponse.json(
          { error: 'Supplier is strictly required for Purchase vouchers.' },
          { status: 400 }
        );
      }
      const supplier = await dbSuppliers.getById(supplierId);
      if (!supplier) {
        return NextResponse.json(
          { error: `Supplier not found in Supplier master. Please select or add the supplier first.` },
          { status: 400 }
        );
      }
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
          { error: 'At least one item from Item master is required for Purchase voucher.' },
          { status: 400 }
        );
      }
      for (const it of items) {
        if (!it.itemId) {
          return NextResponse.json(
            { error: `Item "${it.itemName || 'Unknown'}" must be selected strictly from Item master.` },
            { status: 400 }
          );
        }
        const masterItem = await dbItems.getById(it.itemId);
        if (!masterItem) {
          return NextResponse.json(
            { error: `Item "${it.itemName || it.itemId}" not found in Item master.` },
            { status: 400 }
          );
        }
      }
    } else if (voucherType === 'receipt') {
      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer is strictly required for Receipt vouchers.' },
          { status: 400 }
        );
      }
      const customer = await dbCustomers.getById(customerId);
      if (!customer) {
        return NextResponse.json(
          { error: `Customer not found in Customer master. Please select or add the customer first.` },
          { status: 400 }
        );
      }
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json(
          { error: 'Valid receipt amount greater than 0 is required.' },
          { status: 400 }
        );
      }
    } else if (voucherType === 'payment') {
      if (!supplierId) {
        return NextResponse.json(
          { error: 'Supplier is strictly required for Payment vouchers.' },
          { status: 400 }
        );
      }
      const supplier = await dbSuppliers.getById(supplierId);
      if (!supplier) {
        return NextResponse.json(
          { error: `Supplier not found in Supplier master. Please select or add the supplier first.` },
          { status: 400 }
        );
      }
      if (!amount || Number(amount) <= 0) {
        return NextResponse.json(
          { error: 'Valid payment amount greater than 0 is required.' },
          { status: 400 }
        );
      }
    }

    const created = await dbVouchers.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create voucher.' }, { status: 500 });
  }
}
