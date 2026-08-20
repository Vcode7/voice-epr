import { Transaction, Receipt, Budget, Debt, DataEntryRecord } from '../types';
import { getTodayString, getYesterdayString } from './dateUtils';
import { transactionRepository, receiptRepository, budgetRepository, debtRepository, dataEntryRepository } from '../repositories';
import { DEFAULT_MONITORING_DETAILS_TEMPLATE } from '../constants';

export const seedDemoData = async (): Promise<{
  transactionsCount: number;
  receiptsCount: number;
  budgetsCount: number;
  debtsCount: number;
  dataEntriesCount: number;
}> => {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  const d = new Date();
  d.setDate(d.getDate() - 3);
  const threeDaysAgo = d.toISOString().split('T')[0];

  const d2 = new Date();
  d2.setDate(d2.getDate() - 5);
  const eightDaysAgo = d2.toISOString().split('T')[0];

  const sampleTransactions: Transaction[] = [
    {
      id: `demo_tx_1`,
      amount: 17500,
      currency: 'INR',
      merchant: 'Company Corp',
      category: 'Salary',
      paymentMethod: 'Bank Transfer',
      transactionType: 'income',
      description: 'Internship Stipend Salary',
      transcript: 'I received 17500 as my internship salary.',
      date: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: `demo_tx_2`,
      amount: 450,
      currency: 'INR',
      merchant: 'Fresh Grocery Supermarket',
      category: 'Groceries',
      paymentMethod: 'Amazon Pay',
      transactionType: 'expense',
      description: 'Paid ₹450 to Grocery Shop',
      transcript: 'I paid 450 rupees to the grocery shop using Amazon Pay.',
      date: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: `demo_tx_3`,
      amount: 250,
      currency: 'INR',
      merchant: 'Burger & Beans Cafe',
      category: 'Food',
      paymentMethod: 'UPI',
      transactionType: 'expense',
      description: 'Lunch at Cafe',
      transcript: 'Spent 250 at cafe for lunch.',
      date: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: `demo_tx_4`,
      amount: 699,
      currency: 'INR',
      merchant: 'Netflix',
      category: 'Subscriptions',
      paymentMethod: 'Credit Card',
      transactionType: 'expense',
      description: 'Monthly Premium Plan',
      transcript: 'Paid 699 for Netflix monthly subscription.',
      date: yesterday,
      createdAt: new Date().toISOString(),
    },
    {
      id: `demo_tx_5`,
      amount: 120,
      currency: 'INR',
      merchant: 'Indian Oil Petrol Pump',
      category: 'Fuel',
      paymentMethod: 'UPI',
      transactionType: 'expense',
      description: 'Bike Petrol Refill',
      transcript: 'Put 120 rupees petrol in bike.',
      date: yesterday,
      createdAt: new Date().toISOString(),
    },
    {
      id: `demo_tx_6`,
      amount: 2450,
      currency: 'INR',
      merchant: 'Trendy Outfitters',
      category: 'Shopping',
      paymentMethod: 'Debit Card',
      transactionType: 'expense',
      description: 'Casual Shirts and Jeans',
      transcript: 'Bought clothes for 2450 at shopping mall.',
      date: threeDaysAgo,
      createdAt: new Date().toISOString(),
    },
    {
      id: `demo_tx_7`,
      amount: 1800,
      currency: 'INR',
      merchant: 'Uber Rides',
      category: 'Transport',
      paymentMethod: 'Paytm',
      transactionType: 'expense',
      description: 'Weekly Taxi Rides',
      transcript: 'Paid 1800 for taxi rides this week.',
      date: eightDaysAgo,
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleReceipts: Receipt[] = [
    {
      id: 'demo_rcpt_1',
      receiptNumber: 'INV-000001',
      date: today,
      customerName: 'Vikram Sharma',
      customerPhone: '+91 98765 12345',
      customerAddress: '45 Industrial Estate, Sector 5, Bengaluru',
      customerGstin: '29ABCDE1234F1Z5',
      items: [
        {
          id: 'item_1',
          name: 'Basmati Rice',
          hsnCode: '1006',
          quantity: 2,
          unit: 'kg',
          unitPrice: 100,
          lineTotal: 200,
        },
        {
          id: 'item_2',
          name: 'Fresh Coconut',
          hsnCode: '0801',
          quantity: 7,
          unit: 'pcs',
          unitPrice: 50,
          lineTotal: 350,
        },
        {
          id: 'item_3',
          name: 'Sunflower Oil',
          hsnCode: '1512',
          quantity: 2,
          unit: 'litres',
          unitPrice: 150,
          lineTotal: 300,
        },
      ],
      subtotal: 850,
      discount: 0,
      tax: 0,
      taxPercent: 0,
      taxType: 'none',
      cgst: 0,
      sgst: 0,
      igst: 0,
      grandTotal: 850,
      currency: 'INR',
      notes: 'Thank you for your business!',
      format: 'basic_tax',
      transcript: 'Rice 2 kg 100 per kg, coconut 7 pieces 50 rupees each, oil 2 litres 150 per litre.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo_rcpt_2',
      receiptNumber: 'INV-000002',
      date: yesterday,
      customerName: 'Anita Roy',
      customerPhone: '+91 91234 56789',
      customerAddress: '12 Green Park, New Delhi',
      customerGstin: '07AAAAA0000A1Z5',
      items: [
        {
          id: 'item_4',
          name: 'Organic Honey',
          hsnCode: '0409',
          quantity: 1,
          unit: 'bottle',
          unitPrice: 350,
          lineTotal: 350,
        },
        {
          id: 'item_5',
          name: 'Almonds',
          hsnCode: '0802',
          quantity: 1,
          unit: 'kg',
          unitPrice: 750,
          lineTotal: 750,
        },
      ],
      subtotal: 1100,
      discount: 100,
      tax: 180,
      taxPercent: 18,
      taxType: 'gst',
      cgst: 90,
      sgst: 90,
      igst: 0,
      grandTotal: 1180,
      currency: 'INR',
      notes: 'Payment received via UPI.',
      format: 'standard',
      transcript: '1 bottle honey 350, 1 kg almonds 750, discount 100, GST 18 percent.',
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleBudgets: Budget[] = [
    {
      id: 'demo_bgt_1',
      category: 'Groceries',
      amount: 5000,
      period: 'monthly',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo_bgt_2',
      category: 'Food',
      amount: 4000,
      period: 'monthly',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo_bgt_3',
      category: 'Shopping',
      amount: 6000,
      period: 'monthly',
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleDebts: Debt[] = [
    {
      id: 'demo_debt_1',
      personName: 'Rahul',
      amount: 2000,
      type: 'given',
      settled: false,
      notes: 'Lent money for movie and dinner',
      date: yesterday,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_debt_2',
      personName: 'Priya',
      amount: 500,
      type: 'borrowed',
      settled: false,
      notes: 'Borrowed for cab fare',
      date: today,
      updatedAt: new Date().toISOString(),
    },
  ];

  const sampleDataEntries: DataEntryRecord[] = [
    {
      id: 'demo_data_entry_1',
      templateId: DEFAULT_MONITORING_DETAILS_TEMPLATE.id,
      templateName: 'Monitoring Details',
      fieldValues: {
        part_no: 'PRT-4029',
        description: 'Gear Housing Cover Mold A',
        raw_material: 'ABS Polymer Resin Grade-1',
        planned_production_date: today,
        batch_no: 'B-2026-08A',
        shift: 'Shift A (Morning)',
        opening_counter: 12450,
        closing_counter: 13250,
        cycle_time: '42 sec',
        startup_time: '08:30 AM',
        operator_no: 'OP-104',
        no_of_cavities: 4,
        purge_weight: 250,
        runner_weight: 45,
      },
      tableRows: [
        {
          start_time: '08:30 AM',
          end_time: '09:30 AM',
          planned_qty: 100,
          produced_qty: 98,
          rejection: 2,
          remarks: 'Startup run smooth',
        },
        {
          start_time: '09:30 AM',
          end_time: '10:30 AM',
          planned_qty: 100,
          produced_qty: 99,
          rejection: 1,
          remarks: 'Normal production',
        },
        {
          start_time: '10:30 AM',
          end_time: '11:30 AM',
          planned_qty: 100,
          produced_qty: 95,
          rejection: 5,
          remarks: 'Minor flash on cavity 3',
        },
      ],
      rawTranscript: 'Part number PRT 4029, description Gear Housing Cover, raw material ABS, shift A, batch B 2026 08A, opening counter 12450 closing 13250, cycle time 42 seconds, startup time 8:30 AM, operator 104, cavities 4, purge weight 250 runner 45, start 8:30 to 9:30 planned 100 produced 98 rejection 2, then 9:30 to 10:30 planned 100 produced 99 rejection 1, then 10:30 to 11:30 planned 100 produced 95 rejection 5 remarks minor flash',
      date: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo_data_entry_2',
      templateId: DEFAULT_MONITORING_DETAILS_TEMPLATE.id,
      templateName: 'Monitoring Details',
      fieldValues: {
        part_no: 'PRT-8114',
        description: 'Control Panel Bezel',
        raw_material: 'Polycarbonate Clear',
        planned_production_date: yesterday,
        batch_no: 'B-2026-07B',
        shift: 'Shift B (Evening)',
        opening_counter: 8500,
        closing_counter: 9100,
        cycle_time: '38 sec',
        startup_time: '04:00 PM',
        operator_no: 'OP-089',
        no_of_cavities: 2,
        purge_weight: 180,
        runner_weight: 35,
      },
      tableRows: [
        {
          start_time: '04:00 PM',
          end_time: '05:00 PM',
          planned_qty: 80,
          produced_qty: 79,
          rejection: 1,
          remarks: 'High clarity pass',
        },
        {
          start_time: '05:00 PM',
          end_time: '06:00 PM',
          planned_qty: 80,
          produced_qty: 80,
          rejection: 0,
          remarks: 'Zero defect run',
        },
      ],
      rawTranscript: 'Part number PRT 8114, Control Panel Bezel, Polycarbonate, batch B 2026 07B, shift B, opening 8500 closing 9100, cycle 38 sec, startup 4 PM, operator 89, cavities 2, purge 180 runner 35, 4 to 5 PM planned 80 produced 79 rejection 1, 5 to 6 PM planned 80 produced 80 rejection 0',
      date: yesterday,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'demo_data_entry_flex_1',

      templateId: 'flexible',
      templateName: 'Flexible Extraction',
      isFlexible: true,
      title: 'Part 1234 Production Log',
      fieldValues: {
        part_no: '1234',
        date: '20 August',
        billing: 'None',
        operator: 'Ravi',
      },
      flexibleFields: [
        { name: 'Part No', value: '1234' },
        { name: 'Date', value: '20 August' },
        { name: 'Billing', value: 'None' },
        { name: 'Operator', value: 'Ravi' },
      ],
      tableTitle: 'Hourly Production Summary',
      tableHeaders: ['Time Slot', 'Planned Qty', 'Produced Qty', 'Rejection', 'Remarks'],
      tableRows: [
        ['09:00 AM - 10:00 AM', '120', '118', '2', 'Initial calibration'],
        ['10:00 AM - 11:00 AM', '120', '120', '0', 'Full speed normal run'],
        ['11:00 AM - 12:00 PM', '120', '115', '5', 'Tool change on Cavity 2'],
      ],
      rawTranscript: 'Part no 1234, date 20 August, billing none, operator Ravi, 9 to 10 AM planned 120 produced 118 rejection 2, 10 to 11 AM planned 120 produced 120 rejection 0, 11 to 12 PM planned 120 produced 115 rejection 5 remarks tool change',
      date: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];


  await transactionRepository.saveMultipleTransactions(sampleTransactions);
  await receiptRepository.saveMultipleReceipts(sampleReceipts);
  await budgetRepository.saveMultipleBudgets(sampleBudgets);
  await debtRepository.saveMultipleDebts(sampleDebts);
  await dataEntryRepository.saveMultipleDataEntries(sampleDataEntries);

  return {
    transactionsCount: sampleTransactions.length,
    receiptsCount: sampleReceipts.length,
    budgetsCount: sampleBudgets.length,
    debtsCount: sampleDebts.length,
    dataEntriesCount: sampleDataEntries.length,
  };
};

