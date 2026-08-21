/**
 * Excel / Spreadsheet Exporter for Voice-to-Data EPR Records
 * Generates an Excel-compatible XML Spreadsheet (.xls/.xlsx) with multiple sheets, styled headers, and data formatting.
 */

export interface ExportableEntry {
  entryNumber: number;
  mode?: 'template' | 'flexible';
  templateName?: string;
  title?: string;
  fieldValues: Record<string, any>;
  flexibleFields?: Array<{ name: string; value: string | number }>;
  tableTitle?: string;
  tableHeaders?: string[];
  tableRows?: Array<Record<string, any>> | Array<any[]>;
  rawTranscript?: string | null;
  createdAt: string;
}

/**
 * Escapes XML special characters for Excel XML format
 */
function escapeXml(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exports multiple Voice-to-Data entries into an Excel (.xls/.xlsx compatible) file
 */
export function exportEntriesToExcel(entries: ExportableEntry[], sessionTitle = 'Voice_EPR_Report') {
  if (!entries || entries.length === 0) {
    alert('No entries to export.');
    return;
  }

  // 1. Check if any entry has repeated table rows
  const hasAnyTableRows = entries.some((e) => e.tableRows && e.tableRows.length > 0);

  // 2. Gather all unique field names across entries
  const allFieldKeys = new Set<string>();
  entries.forEach((e) => {
    if (e.flexibleFields && e.flexibleFields.length > 0) {
      e.flexibleFields.forEach((f) => allFieldKeys.add(f.name));
    } else if (e.fieldValues) {
      Object.keys(e.fieldValues).forEach((k) => allFieldKeys.add(k));
    }
  });
  const fieldNamesList = Array.from(allFieldKeys);

  // 3. Build Summary Sheet Rows (only essential fields, no Voice Transcript, and Table Count only if table exists)
  let summaryRowsXml = `
    <Row ss:StyleID="HeaderStyle">
      <Cell><Data ss:Type="String">Entry #</Data></Cell>
      <Cell><Data ss:Type="String">Date &amp; Time</Data></Cell>
      ${fieldNamesList.map((f) => `<Cell><Data ss:Type="String">${escapeXml(f)}</Data></Cell>`).join('')}
      ${hasAnyTableRows ? '<Cell><Data ss:Type="String">Table Rows Count</Data></Cell>' : ''}
    </Row>
  `;

  entries.forEach((e) => {
    const formattedDate = new Date(e.createdAt).toLocaleString();
    const tableRowCount = e.tableRows ? e.tableRows.length : 0;

    let fieldCellsXml = '';
    fieldNamesList.forEach((fieldName) => {
      let val = '';
      if (e.flexibleFields && e.flexibleFields.length > 0) {
        const found = e.flexibleFields.find((f) => f.name.toLowerCase() === fieldName.toLowerCase());
        val = found ? String(found.value) : '';
      } else if (e.fieldValues) {
        val = e.fieldValues[fieldName] !== undefined ? String(e.fieldValues[fieldName]) : '';
      }

      const isNum = !isNaN(Number(val)) && val.trim() !== '';
      if (isNum) {
        fieldCellsXml += `<Cell><Data ss:Type="Number">${val}</Data></Cell>`;
      } else {
        fieldCellsXml += `<Cell><Data ss:Type="String">${escapeXml(val)}</Data></Cell>`;
      }
    });

    summaryRowsXml += `
      <Row>
        <Cell><Data ss:Type="Number">${e.entryNumber}</Data></Cell>
        <Cell><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
        ${fieldCellsXml}
        ${hasAnyTableRows ? `<Cell><Data ss:Type="Number">${tableRowCount}</Data></Cell>` : ''}
      </Row>
    `;
  });

  // 4. Build Detailed Table Rows (if any entry has repeated table rows)
  let tableRowsXml = `
    <Row ss:StyleID="HeaderStyle">
      <Cell><Data ss:Type="String">Entry #</Data></Cell>
      <Cell><Data ss:Type="String">Row #</Data></Cell>
      <Cell><Data ss:Type="String">Table Title</Data></Cell>
      <Cell><Data ss:Type="String">Column / Key</Data></Cell>
      <Cell><Data ss:Type="String">Value</Data></Cell>
    </Row>
  `;

  if (hasAnyTableRows) {
    entries.forEach((e) => {
      if (e.tableRows && e.tableRows.length > 0) {
        e.tableRows.forEach((row, rowIdx) => {
          if (Array.isArray(row)) {
            // Array of cells (flexible table)
            const headers = e.tableHeaders || [];
            row.forEach((cellVal, colIdx) => {
              const headerName = headers[colIdx] || `Column ${colIdx + 1}`;
              tableRowsXml += `
                <Row>
                  <Cell><Data ss:Type="Number">${e.entryNumber}</Data></Cell>
                  <Cell><Data ss:Type="Number">${rowIdx + 1}</Data></Cell>
                  <Cell><Data ss:Type="String">${escapeXml(e.tableTitle || 'Table')}</Data></Cell>
                  <Cell><Data ss:Type="String">${escapeXml(headerName)}</Data></Cell>
                  <Cell><Data ss:Type="String">${escapeXml(cellVal)}</Data></Cell>
                </Row>
              `;
            });
          } else if (typeof row === 'object' && row !== null) {
            // Object key-values (template table)
            Object.entries(row).forEach(([colKey, cellVal]) => {
              tableRowsXml += `
                <Row>
                  <Cell><Data ss:Type="Number">${e.entryNumber}</Data></Cell>
                  <Cell><Data ss:Type="Number">${rowIdx + 1}</Data></Cell>
                  <Cell><Data ss:Type="String">${escapeXml(e.tableTitle || 'Table')}</Data></Cell>
                  <Cell><Data ss:Type="String">${escapeXml(colKey)}</Data></Cell>
                  <Cell><Data ss:Type="String">${escapeXml(cellVal)}</Data></Cell>
                </Row>
              `;
            });
          }
        });
      }
    });
  }

  // 5. Construct the XML Workbook
  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#0284C7" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="EPR_Entries_Summary">
  <Table>
   ${summaryRowsXml}
  </Table>
 </Worksheet>
 ${
   hasAnyTableRows
     ? `
 <Worksheet ss:Name="Table_Row_Details">
  <Table>
   ${tableRowsXml}
  </Table>
 </Worksheet>
 `
     : ''
 }
</Workbook>`;

  // 6. Trigger download in browser
  const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = `${now.getHours()}${now.getMinutes()}`;
  const filename = `${sessionTitle}_${dateStr}_${timeStr}.xls`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
