import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Receipt, UserSettings, DataEntryRecord, DataTemplate } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatDateDisplay } from '../../utils/dateUtils';
import { settingsRepository } from '../../repositories';
import { numberToWords } from '../../utils/numberToWords';

export class PdfGeneratorService {
  public static async generateReceiptPdf(receipt: Receipt): Promise<string> {
    const settings: UserSettings = await settingsRepository.getSettings();
    const symbol = receipt.currency === 'INR' ? '₹' : settings.currencySymbol;
    const format = receipt.format || settings.invoiceFormat || 'standard';
    const bank = settings.bankDetails;

    let htmlContent = '';

    if (format === 'basic_tax') {
      // Clean, professional, Black & White A4 Tax Invoice
      const itemsRowsHtml = receipt.items
        .map(
          (item, index) => `
          <tr style="border-bottom: 1px solid #000000;">
            <td style="padding: 6px 4px; text-align: center; border-right: 1px solid #000000;">${index + 1}</td>
            <td style="padding: 6px 6px; font-weight: bold; border-right: 1px solid #000000;">${item.name}</td>
            <td style="padding: 6px 4px; text-align: center; font-family: monospace; border-right: 1px solid #000000;">${item.hsnCode || '-'}</td>
            <td style="padding: 6px 4px; text-align: center; border-right: 1px solid #000000;">${item.quantity} ${item.unit}</td>
            <td style="padding: 6px 6px; text-align: right; border-right: 1px solid #000000;">${formatCurrency(item.unitPrice, symbol)}</td>
            <td style="padding: 6px 6px; text-align: right; font-weight: bold;">${formatCurrency(item.lineTotal, symbol)}</td>
          </tr>
        `
        )
        .join('');

      htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Tax Invoice ${receipt.receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #000000;
              background-color: #FFFFFF;
              font-size: 11px;
            }
            .invoice-box {
              border: 2px solid #000000;
              padding: 16px;
            }
            .banner {
              text-align: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 8px;
              margin-bottom: 10px;
            }
            .banner-sub {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #444444;
            }
            .company-name {
              font-size: 20px;
              font-weight: 900;
              text-transform: uppercase;
              margin: 4px 0;
            }
            .info-grid {
              display: flex;
              border-bottom: 2px solid #000000;
              margin-bottom: 12px;
            }
            .info-left {
              flex: 1;
              border-right: 2px solid #000000;
              padding-right: 10px;
              padding-bottom: 8px;
            }
            .info-right {
              flex: 1;
              padding-left: 10px;
              padding-bottom: 8px;
            }
            .section-label {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              color: #555555;
              margin-bottom: 4px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000000;
              margin-bottom: 12px;
            }
            th {
              background-color: #EEEEEE;
              border: 1px solid #000000;
              padding: 6px 4px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .calc-grid {
              display: flex;
              border: 1px solid #000000;
              margin-bottom: 12px;
            }
            .calc-left {
              flex: 1.2;
              padding: 10px;
              border-right: 1px solid #000000;
            }
            .calc-right {
              flex: 1;
              padding: 0;
            }
            .calc-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 8px;
              border-bottom: 1px solid #DDDDDD;
            }
            .calc-total {
              display: flex;
              justify-content: space-between;
              padding: 8px;
              background-color: #EEEEEE;
              font-size: 13px;
              font-weight: 900;
              border-top: 1px solid #000000;
            }
            .terms-grid {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="banner">
              <div class="banner-sub">GST TAX INVOICE • ORIGINAL FOR RECIPIENT</div>
              <div class="company-name">${settings.businessName}</div>
              <div>${settings.businessAddress}</div>
              <div style="margin-top: 4px;"><strong>GSTIN:</strong> ${settings.gstin} | <strong>Phone:</strong> ${settings.businessPhone}</div>
            </div>

            <div class="info-grid">
              <div class="info-left">
                <div class="section-label">Buyer (Bill To):</div>
                <div style="font-size: 13px; font-weight: bold;">${receipt.customerName || 'Cash Customer'}</div>
                ${receipt.customerPhone ? `<div>Phone: ${receipt.customerPhone}</div>` : ''}
                ${receipt.customerAddress ? `<div>Address: ${receipt.customerAddress}</div>` : ''}
                <div><strong>GSTIN / UIN:</strong> ${receipt.customerGstin || 'Unregistered'}</div>
              </div>

              <div class="info-right">
                <div class="meta-row"><span><strong>Invoice No:</strong></span><span style="font-family: monospace; font-weight: bold;">${receipt.receiptNumber}</span></div>
                <div class="meta-row"><span><strong>Invoice Date:</strong></span><span>${formatDateDisplay(receipt.date)}</span></div>
                <div class="meta-row"><span><strong>Place of Supply:</strong></span><span>${receipt.taxType === 'igst' ? 'Inter-State' : 'Intra-State'}</span></div>
                <div class="meta-row"><span><strong>Reverse Charge:</strong></span><span>No</span></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">S.N.</th>
                  <th style="text-align: left;">Description of Goods / Services</th>
                  <th style="width: 70px; text-align: center;">HSN/SAC</th>
                  <th style="width: 60px; text-align: center;">Qty / Unit</th>
                  <th style="width: 75px; text-align: right;">Rate (${symbol})</th>
                  <th style="width: 80px; text-align: right;">Amount (${symbol})</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>

            <div class="calc-grid">
              <div class="calc-left">
                <div class="section-label">Total in Words:</div>
                <div style="font-weight: bold; font-style: italic; margin-bottom: 10px;">${numberToWords(receipt.grandTotal)}</div>

                ${
                  bank && bank.accountNumber
                    ? `
                <div style="border-top: 1px dashed #666666; padding-top: 6px;">
                  <div class="section-label">Bank Details for NEFT / RTGS:</div>
                  <div><strong>Bank:</strong> ${bank.bankName} | <strong>A/c:</strong> ${bank.accountHolder}</div>
                  <div><strong>A/c No:</strong> ${bank.accountNumber} | <strong>IFSC:</strong> ${bank.ifsc} (${bank.branch})</div>
                </div>`
                    : ''
                }
              </div>

              <div class="calc-right">
                <div class="calc-row"><span>Sub Total:</span><span>${formatCurrency(receipt.subtotal, symbol)}</span></div>
                ${receipt.discount > 0 ? `<div class="calc-row"><span>Discount:</span><span>-${formatCurrency(receipt.discount, symbol)}</span></div>` : ''}
                ${
                  receipt.taxType === 'gst' && receipt.taxPercent > 0
                    ? `
                  <div class="calc-row"><span>CGST (${receipt.taxPercent / 2}%):</span><span>+${formatCurrency(receipt.cgst, symbol)}</span></div>
                  <div class="calc-row"><span>SGST (${receipt.taxPercent / 2}%):</span><span>+${formatCurrency(receipt.sgst, symbol)}</span></div>`
                    : ''
                }
                ${
                  receipt.taxType === 'igst' && receipt.taxPercent > 0
                    ? `<div class="calc-row"><span>IGST (${receipt.taxPercent}%):</span><span>+${formatCurrency(receipt.igst, symbol)}</span></div>`
                    : ''
                }
                <div class="calc-total">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(receipt.grandTotal, symbol)}</span>
                </div>
              </div>
            </div>

            <div class="terms-grid">
              <div>
                <div class="section-label">Terms & Conditions:</div>
                <div>1. Goods once sold will not be taken back.</div>
                <div>2. Subject to local state jurisdiction.</div>
              </div>

              <div style="text-align: right;">
                <div style="font-weight: bold; margin-bottom: 30px;">For ${settings.businessName}</div>
                <div style="border-top: 1px dashed #000000; padding-top: 4px; display: inline-block;">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </body>
      </html>
      `;
    } else {
      // Standard Modern Invoice Format
      const itemsHtml = receipt.items
        .map(
          (item, index) => `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 6px; color: #1E293B; font-weight: 500;">${index + 1}. ${item.name}</td>
            <td style="padding: 10px 6px; text-align: center; font-family: monospace; color: #64748B;">${item.hsnCode || '-'}</td>
            <td style="padding: 10px 6px; text-align: center; color: #475569;">${item.quantity} ${item.unit}</td>
            <td style="padding: 10px 6px; text-align: right; color: #475569;">${formatCurrency(item.unitPrice, symbol)}</td>
            <td style="padding: 10px 6px; text-align: right; font-weight: 600; color: #0F172A;">${formatCurrency(item.lineTotal, symbol)}</td>
          </tr>
        `
        )
        .join('');

      htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt ${receipt.receiptNumber}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 30px;
              color: #0F172A;
              background-color: #FFFFFF;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #6366F1;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .company-title {
              font-size: 24px;
              font-weight: 800;
              color: #4F46E5;
              margin: 0 0 4px 0;
            }
            .sub-text {
              font-size: 12px;
              color: #64748B;
              margin: 2px 0;
            }
            .receipt-badge {
              text-align: right;
            }
            .receipt-title {
              font-size: 20px;
              font-weight: 700;
              color: #0F172A;
              margin: 0;
            }
            .receipt-num {
              font-size: 13px;
              color: #6366F1;
              font-weight: 600;
              margin-top: 4px;
            }
            .info-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              background: #F8FAFC;
              padding: 16px;
              border-radius: 8px;
            }
            .info-col {
              flex: 1;
            }
            .info-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748B;
              margin-bottom: 4px;
              font-weight: 600;
            }
            .info-val {
              font-size: 14px;
              color: #0F172A;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            th {
              background-color: #F1F5F9;
              color: #475569;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 10px 6px;
              text-align: left;
            }
            th.right, td.right {
              text-align: right;
            }
            th.center, td.center {
              text-align: center;
            }
            .summary-box {
              width: 280px;
              margin-left: auto;
              background: #F8FAFC;
              padding: 16px;
              border-radius: 8px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 13px;
              color: #475569;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0 0 0;
              border-top: 2px solid #CBD5E1;
              font-size: 16px;
              font-weight: 800;
              color: #4F46E5;
            }
            .bank-box {
              margin-top: 20px;
              padding: 12px;
              background: #F8FAFC;
              border-radius: 8px;
              font-size: 12px;
              color: #475569;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #94A3B8;
              border-top: 1px solid #E2E8F0;
              padding-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-title">${settings.businessName}</div>
              <div class="sub-text">${settings.businessAddress}</div>
              <div class="sub-text">Phone: ${settings.businessPhone} | GSTIN: ${settings.gstin}</div>
            </div>
            <div class="receipt-badge">
              <div class="receipt-title">TAX INVOICE</div>
              <div class="receipt-num">${receipt.receiptNumber}</div>
              <div class="sub-text">${formatDateDisplay(receipt.date)}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <div class="info-label">Billed To</div>
              <div class="info-val">${receipt.customerName || 'Cash Customer'}</div>
              ${receipt.customerPhone ? `<div class="sub-text">${receipt.customerPhone}</div>` : ''}
              ${receipt.customerAddress ? `<div class="sub-text">${receipt.customerAddress}</div>` : ''}
              ${receipt.customerGstin ? `<div class="sub-text"><strong>GSTIN:</strong> ${receipt.customerGstin}</div>` : ''}
            </div>
            <div class="info-col" style="text-align: right;">
              <div class="info-label">Tax Split</div>
              <div class="info-val">${receipt.taxType === 'gst' ? 'GST (CGST + SGST)' : receipt.taxType === 'igst' ? 'IGST' : 'None'}</div>
              <div class="sub-text">Rate: ${receipt.taxPercent || 0}%</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th class="center">HSN/SAC</th>
                <th class="center">Qty / Unit</th>
                <th class="right">Unit Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${formatCurrency(receipt.subtotal, symbol)}</span>
            </div>
            ${
              receipt.discount > 0
                ? `
            <div class="summary-row" style="color: #059669;">
              <span>Discount</span>
              <span>-${formatCurrency(receipt.discount, symbol)}</span>
            </div>`
                : ''
            }
            ${
              receipt.taxType === 'gst' && receipt.taxPercent > 0
                ? `
              <div class="summary-row">
                <span>CGST (${receipt.taxPercent / 2}%)</span>
                <span>+${formatCurrency(receipt.cgst, symbol)}</span>
              </div>
              <div class="summary-row">
                <span>SGST (${receipt.taxPercent / 2}%)</span>
                <span>+${formatCurrency(receipt.sgst, symbol)}</span>
              </div>`
                : ''
            }
            ${
              receipt.taxType === 'igst' && receipt.taxPercent > 0
                ? `
              <div class="summary-row">
                <span>IGST (${receipt.taxPercent}%)</span>
                <span>+${formatCurrency(receipt.igst, symbol)}</span>
              </div>`
                : ''
            }
            <div class="total-row">
              <span>GRAND TOTAL</span>
              <span>${formatCurrency(receipt.grandTotal, symbol)}</span>
            </div>
          </div>

          <div style="font-size: 11px; margin-top: 15px; color: #475569;">
            <strong>Amount in Words:</strong> <em>${numberToWords(receipt.grandTotal)}</em>
          </div>

          ${
            bank && bank.accountNumber
              ? `
          <div class="bank-box">
            <strong>Bank Transfer Details:</strong> ${bank.bankName} | A/c Name: ${bank.accountHolder} | A/c No: ${bank.accountNumber} | IFSC: ${bank.ifsc} (${bank.branch})
          </div>`
              : ''
          }

          <div class="footer">
            Thank you for your business! Generated with Voice Finance Assistant.
          </div>
        </body>
      </html>
      `;
    }

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return uri;
  }

  public static async shareReceiptPdf(receipt: Receipt): Promise<void> {
    const pdfUri = await this.generateReceiptPdf(receipt);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Receipt ${receipt.receiptNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }

  /**
   * Generate clean, structured PDF for Custom Voice-to-Data Entry Record
   */
  public static async generateDataEntryPdf(record: DataEntryRecord, template: DataTemplate): Promise<string> {
    const settings: UserSettings = await settingsRepository.getSettings();

    // Group top fields into grid items
    let fieldsHtml = '';
    if (record.isFlexible && record.flexibleFields && record.flexibleFields.length > 0) {
      fieldsHtml = record.flexibleFields
        .map((f) => {
          const val = f.value;
          const displayVal = val !== null && val !== undefined && val !== '' ? String(val) : '<span style="color:#94A3B8;">N/A</span>';
          return `
            <div class="field-card">
              <div class="field-label">${f.name}</div>
              <div class="field-value">${displayVal}</div>
            </div>
          `;
        })
        .join('');
    } else {
      fieldsHtml = template.fields
        .map((f) => {
          const val = record.fieldValues[f.extractionKey] ?? record.fieldValues[f.id] ?? '-';
          const displayVal = val !== null && val !== undefined && val !== '' ? String(val) : '<span style="color:#94A3B8;">N/A</span>';
          return `
            <div class="field-card">
              <div class="field-label">${f.name} <span class="field-key">(${f.extractionKey})</span></div>
              <div class="field-value">${displayVal}</div>
            </div>
          `;
        })
        .join('');
    }

    // Table rows HTML
    let tableHtml = '';
    if (record.isFlexible && record.tableHeaders && record.tableHeaders.length > 0) {
      const headers = record.tableHeaders.map((h) => `<th>${h}</th>`).join('');
      const rows = (record.tableRows || []).map((row, idx) => {
        const cells = record.tableHeaders!
          .map((_, cIdx) => {
            const raw = Array.isArray(row) ? row[cIdx] : (row as Record<string, any>)[_];
            const display = raw !== null && raw !== undefined && raw !== '' ? String(raw) : '-';
            const isNum = !isNaN(Number(raw)) && String(raw).trim() !== '';
            return `<td class="${isNum ? 'right' : ''}">${display}</td>`;
          })
          .join('');
        return `<tr style="border-bottom: 1px solid #E2E8F0; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
      }).join('');

      tableHtml = `
        <div class="section-title">${record.tableTitle || 'Detected Table Data'} (${(record.tableRows || []).length} rows)</div>
        <table class="data-table">
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="' + record.tableHeaders.length + '" style="text-align:center; color:#94A3B8; padding: 16px;">No rows recorded</td></tr>'}
          </tbody>
        </table>
      `;
    } else if (template.hasTable && template.tableFields && template.tableFields.length > 0) {
      const headers = template.tableFields.map((col) => `<th class="${col.type === 'number' ? 'right' : ''}">${col.name}</th>`).join('');

      let totals: Record<string, number> = {};
      template.tableFields.forEach((c) => {
        if (c.type === 'number') totals[c.extractionKey] = 0;
      });

      const rows = (record.tableRows || []).map((row, idx) => {
        const cells = template.tableFields
          .map((col) => {
            const raw = (row as Record<string, any>)[col.extractionKey] ?? (row as Record<string, any>)[col.id] ?? '';
            if (col.type === 'number') {
              const num = parseFloat(raw) || 0;
              totals[col.extractionKey] = (totals[col.extractionKey] || 0) + num;
              return `<td class="right">${raw !== '' ? raw : '-'}</td>`;
            }
            return `<td>${raw !== '' ? raw : '-'}</td>`;
          })
          .join('');
        return `<tr style="border-bottom: 1px solid #E2E8F0; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">${cells}</tr>`;
      }).join('');

      const hasNumericColumns = template.tableFields.some((c) => c.type === 'number');
      let footerRow = '';
      if (hasNumericColumns) {
        const footCells = template.tableFields
          .map((col, idx) => {
            if (idx === 0) {
              return `<td style="font-weight: 700; color: #0891B2;">TOTALS</td>`;
            }
            if (col.type === 'number') {
              return `<td class="right" style="font-weight: 700; color: #0891B2;">${totals[col.extractionKey] || 0}</td>`;
            }
            return `<td></td>`;
          })
          .join('');
        footerRow = `<tfoot><tr style="border-top: 2px solid #0891B2; background-color: #F0FDFA;">${footCells}</tr></tfoot>`;
      }

      tableHtml = `
        <div class="section-title">${template.tableTitle || 'Repeated Entries'} (${(record.tableRows || []).length} rows)</div>
        <table class="data-table">
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="' + template.tableFields.length + '" style="text-align:center; color:#94A3B8; padding: 16px;">No rows recorded</td></tr>'}
          </tbody>
          ${footerRow}
        </table>
      `;
    }


    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${template.name} - ${record.id}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 30px;
            color: #0F172A;
            background-color: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #0891B2;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .company-title {
            font-size: 22px;
            font-weight: 800;
            color: #0891B2;
            margin: 0 0 4px 0;
          }
          .sub-text {
            font-size: 11px;
            color: #64748B;
            margin: 2px 0;
          }
          .report-badge {
            text-align: right;
          }
          .report-title {
            font-size: 18px;
            font-weight: 800;
            color: #0F172A;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .report-id {
            font-size: 12px;
            color: #0891B2;
            font-weight: 700;
            margin-top: 4px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 800;
            color: #1E293B;
            margin: 18px 0 10px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .fields-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .field-card {
            background-color: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 6px;
            padding: 8px 10px;
          }
          .field-label {
            font-size: 10px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            margin-bottom: 4px;
          }
          .field-key {
            font-size: 9px;
            color: #94A3B8;
            font-weight: normal;
          }
          .field-value {
            font-size: 13px;
            font-weight: 700;
            color: #0F172A;
            word-break: break-word;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            margin-bottom: 20px;
          }
          .data-table th {
            background-color: #0891B2;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 8px 6px;
            text-align: left;
          }
          .data-table td {
            padding: 8px 6px;
            font-size: 12px;
            color: #1E293B;
          }
          .data-table th.right, .data-table td.right {
            text-align: right;
          }
          .transcript-box {
            background-color: #F8FAFC;
            border-left: 3px solid #0891B2;
            padding: 10px 14px;
            border-radius: 4px;
            margin-top: 16px;
          }
          .transcript-title {
            font-size: 10px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .transcript-text {
            font-size: 12px;
            color: #334155;
            font-style: italic;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #94A3B8;
            border-top: 1px solid #E2E8F0;
            padding-top: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-title">${settings.businessName}</div>
            <div class="sub-text">${settings.businessAddress}</div>
            <div class="sub-text">Phone: ${settings.businessPhone} | Date: ${formatDateDisplay(record.date)}</div>
          </div>
          <div class="report-badge">
            <div class="report-title">${template.name}</div>
            <div class="report-id">${record.id}</div>
            <div class="sub-text">Created: ${new Date(record.createdAt).toLocaleTimeString()}</div>
          </div>
        </div>

        <div class="section-title">General Specifications & Metrics</div>
        <div class="fields-grid">
          ${fieldsHtml}
        </div>

        ${tableHtml}

        ${
          record.rawTranscript
            ? `
          <div class="transcript-box">
            <div class="transcript-title">Original Spoken Dictation</div>
            <div class="transcript-text">"${record.rawTranscript}"</div>
          </div>
        `
            : ''
        }

        <div class="footer">
          Voice EPR - Electronic Production & Process Record | Generated on ${new Date().toLocaleString()}
        </div>
      </body>
    </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    return uri;
  }

  public static async shareDataEntryPdf(record: DataEntryRecord, template: DataTemplate): Promise<void> {
    const pdfUri = await this.generateDataEntryPdf(record, template);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${template.name} (${record.date})`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }
}

