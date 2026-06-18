import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { api } from './helpers.js'

describe('Excel Import/Export', () => {
  async function makeXlsx(
    sheetName: string,
    _columns: string[],
    rows: string[][],
  ): Promise<string> {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(sheetName)
    ws.addRow(_columns)
    for (const row of rows) {
      ws.addRow(row)
    }
    const buf = await wb.xlsx.writeBuffer()
    return Buffer.from(buf).toString('base64')
  }

  it('downloads customer template', async () => {
    const { get } = await api()
    const res = await get('/api/excel/templates/customers')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml')
  })

  it('downloads supplier template', async () => {
    const { get } = await api()
    const res = await get('/api/excel/templates/suppliers')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml')
  })

  it('downloads item template', async () => {
    const { get } = await api()
    const res = await get('/api/excel/templates/items')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml')
  })

  it('creates unit for item import', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/units', { code: 'PCS6', name: 'Pieces', symbol: 'pcs' })
    expect(res.status).toBe(201)
  })

  it('imports customers from xlsx', async () => {
    const { post } = await api()
    const file = await makeXlsx(
      'Customer',
      ['Code', 'Name', 'Phone', 'Email', 'Address', 'Tax Number (NPWP)', 'Credit Limit', 'Payment Term'],
      [
        ['XLS-CUST1', 'PT Customer Satu', '0211111', 'c1@test.com', 'Jakarta', '', '50000000', 'NET30'],
        ['XLS-CUST2', 'PT Customer Dua', '0212222', 'c2@test.com', 'Bandung', '', '100000000', 'NET60'],
      ],
    )
    const res = await post('/api/excel/import/customers', { file })
    expect(res.status).toBe(201)
    expect(res.body.data.parsed).toBe(2)
    expect(res.body.data.imported).toBe(2)
    expect(res.body.data.errors).toHaveLength(0)
  })

  it('verifies imported customers', async () => {
    const { get } = await api()
    const res = await get('/api/customers?search=XLS-CUST1')
    expect(res.status).toBe(200)
    expect(res.body.data.items.length).toBeGreaterThan(0)
    expect(res.body.data.items[0].code).toBe('XLS-CUST1')
  })

  it('imports suppliers from xlsx', async () => {
    const { post } = await api()
    const file = await makeXlsx(
      'Supplier',
      ['Code', 'Name', 'Phone', 'Email', 'Address', 'Tax Number (NPWP)', 'Credit Limit', 'Payment Term'],
      [
        ['XLS-SUPP1', 'PT Supplier Satu', '0311111', 's1@test.com', 'Surabaya', '', '75000000', 'NET30'],
      ],
    )
    const res = await post('/api/excel/import/suppliers', { file })
    expect(res.status).toBe(201)
    expect(res.body.data.parsed).toBe(1)
    expect(res.body.data.imported).toBe(1)
    expect(res.body.data.errors).toHaveLength(0)
  })

  it('verifies imported supplier', async () => {
    const { get } = await api()
    const res = await get('/api/suppliers?search=XLS-SUPP1')
    expect(res.status).toBe(200)
    expect(res.body.data.items[0].code).toBe('XLS-SUPP1')
  })

  it('imports items from xlsx', async () => {
    const { post } = await api()
    const file = await makeXlsx(
      'Item',
      ['SKU', 'Name', 'Category Code', 'Base Unit Code', 'Barcode', 'Item Type', 'Description', 'Min Stock'],
      [
        ['XLS-BRG1', 'Barang Import 1', '', 'PCS6', '8990001', 'STOCK', 'Test item', '5'],
      ],
    )
    const res = await post('/api/excel/import/items', { file })
    expect(res.status).toBe(201)
    expect(res.body.data.parsed).toBe(1)
    expect(res.body.data.imported).toBe(1)
  })

  it('verifies imported item', async () => {
    const { get } = await api()
    const res = await get('/api/inventory/items?search=XLS-BRG1')
    expect(res.status).toBe(200)
    expect(res.body.data.items[0].sku).toBe('XLS-BRG1')
  })
})
