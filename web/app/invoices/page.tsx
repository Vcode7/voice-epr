'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Building2,
  Truck,
  Users,
  Box,
  Landmark,
  Receipt,
  Mic,
} from 'lucide-react';
import { Company, Customer, Supplier, Item } from '@/types';
import { VoucherTab } from '@/components/invoice/VoucherTab';
import { CompanyMasterTab } from '@/components/invoice/CompanyMasterTab';
import { SupplierMasterTab } from '@/components/invoice/SupplierMasterTab';
import { CustomerMasterTab } from '@/components/invoice/CustomerMasterTab';
import { ItemMasterTab } from '@/components/invoice/ItemMasterTab';
import { AccountLedgerTab } from '@/components/invoice/AccountLedgerTab';

type InvoiceSubTab = 'voucher' | 'company' | 'supplier' | 'customer' | 'item' | 'account';

export default function VoiceInvoicePage() {
  const [activeTab, setActiveTab] = useState<InvoiceSubTab>('voucher');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMasters = useCallback(async () => {
    try {
      const [compRes, custRes, suppRes, itemRes] = await Promise.all([
        fetch('/api/invoice/companies'),
        fetch('/api/invoice/customers'),
        fetch('/api/invoice/suppliers'),
        fetch('/api/invoice/items'),
      ]);

      const compData = await compRes.json();
      const custData = await custRes.json();
      const suppData = await suppRes.json();
      const itemData = await itemRes.json();

      if (Array.isArray(compData)) setCompanies(compData);
      if (Array.isArray(custData)) setCustomers(custData);
      if (Array.isArray(suppData)) setSuppliers(suppData);
      if (Array.isArray(itemData)) setItems(itemData);
    } catch (e) {
      console.error('Failed to load masters:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  const tabsConfig: Array<{ id: InvoiceSubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'voucher', label: 'Voucher', icon: Receipt },
    { id: 'company', label: 'Company', icon: Building2 },
    { id: 'supplier', label: 'Supplier', icon: Truck },
    { id: 'customer', label: 'Customer', icon: Users },
    { id: 'item', label: 'Item', icon: Box },
    { id: 'account', label: 'Account', icon: Landmark },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            Voice Invoice &amp; Voucher Studio
          </h1>
          <p className="text-xs text-textMuted mt-0.5">
            Voice-powered GST invoicing, strict master data management, and automatic double-entry ledger.
          </p>
        </div>

        {/* Master stats pills */}
        <div className="flex items-center gap-2 text-[11px] text-textMuted flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-surface border border-cardBorder font-semibold">
            🏢 {companies.length} Companies
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface border border-cardBorder font-semibold">
            👥 {customers.length} Customers
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-surface border border-cardBorder font-semibold">
            📦 {items.length} Items
          </span>
        </div>
      </div>

      {/* TOP NAVIGATION TABS (Strictly inside Voice Invoice page: Voucher, Company, Supplier, Customer, Item, Account) */}
      <div className="bg-card border border-cardBorder p-1.5 rounded-2xl shadow-sm no-print">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  fetchMasters();
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 font-extrabold scale-[1.01]'
                    : 'text-textMuted hover:text-text hover:bg-surfaceMuted'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-textSubtle'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Rendering */}
      <div>
        {activeTab === 'voucher' && (
          <VoucherTab
            companies={companies}
            customers={customers}
            suppliers={suppliers}
            items={items}
            onRefreshMasters={fetchMasters}
          />
        )}

        {activeTab === 'company' && <CompanyMasterTab />}

        {activeTab === 'supplier' && <SupplierMasterTab />}

        {activeTab === 'customer' && <CustomerMasterTab />}

        {activeTab === 'item' && <ItemMasterTab />}

        {activeTab === 'account' && (
          <AccountLedgerTab
            companies={companies}
            customers={customers}
            suppliers={suppliers}
          />
        )}
      </div>
    </div>
  );
}
