import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('Accounting Reports (Trial Balance, P&L, Balance Sheet, Aging)', () => {
  let customerId: string
  let supplierId: string
  let itemId: string
  let unitId: string
  let warehouseId: string
  let paymentMethodId: string
  let revenueAccountId: string
  let inventoryAccountId: string
  let siId: string
  let piId: string

  it('creates unit of measure', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/units', { code: 'PCS4', name: 'Pieces', symbol: 'pcs' })
    expect(res.status).toBe(201)
    unitId = res.body.data.id
  })

  it('creates customer', async () => {
    const { post } = await api()
    const res = await post('/api/customers', { code: 'CUST-RPT', name: 'Customer Report', creditLimit: 10_000_000 })
    expect(res.status).toBe(201)
    customerId = res.body.data.id
  })

  it('creates supplier', async () => {
    const { post } = await api()
    const res = await post('/api/suppliers', { code: 'SUPP-RPT', name: 'Supplier Report' })
    expect(res.status).toBe(201)
    supplierId = res.body.data.id
  })

  it('creates inventory item', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/items', { sku: 'BRG-RPT', name: 'Barang Report', baseUnitId: unitId })
    expect(res.status).toBe(201)
    itemId = res.body.data.id
  })

  it('lists warehouses', async () => {
    const { get } = await api()
    const res = await get('/api/warehouses')
    expect(res.status).toBe(200)
    warehouseId = res.body.data.items[0]?.id
    expect(warehouseId).toBeDefined()
  })

  it('lists payment methods', async () => {
    const { get } = await api()
    const res = await get('/api/payment-methods')
    expect(res.status).toBe(200)
    paymentMethodId = res.body.data.items[0]?.id
    expect(paymentMethodId).toBeDefined()
  })

  it('gets revenue and inventory accounts', async () => {
    const { get } = await api()
    const rev = await get('/api/chart-of-accounts?search=Penjualan%20Barang')
    expect(rev.status).toBe(200)
    revenueAccountId = rev.body.data.items[0]?.id
    expect(revenueAccountId).toBeDefined()
    const inv = await get('/api/chart-of-accounts?search=Persediaan%20Barang')
    expect(inv.status).toBe(200)
    inventoryAccountId = inv.body.data.items[0]?.id
    expect(inventoryAccountId).toBeDefined()
  })

  it('creates product accounting mapping', async () => {
    const { post } = await api()
    const res = await post('/api/product-accounting-mappings', { itemId, revenueAccountId, purchaseAccountId: inventoryAccountId })
    expect(res.status).toBe(201)
  })

  it('adjusts stock in', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/stock-adjustments', { warehouseId, itemId, direction: 'IN', quantity: 50 })
    expect(res.status).toBe(201)
  })

  // --- Complete a sales cycle (SI + CP) for AR aging and revenue ---

  it('completes a sales invoice', async () => {
    const { post, patch } = await api()
    const so = await post('/api/sales-orders', { customerId, subtotal: 500000, grandTotal: 500000, items: [{ itemId, unitId, quantity: 5, unitPrice: 100000, totalPrice: 500000 }] })
    expect(so.status).toBe(201)
    await patch(`/api/sales-orders/${so.body.data.id}/status`, { status: 'COMPLETED' })
    const doRes = await post('/api/delivery-orders', { salesOrderId: so.body.data.id, warehouseId, items: [{ itemId, unitId, quantity: 5 }] })
    expect(doRes.status).toBe(201)
    await patch(`/api/delivery-orders/${doRes.body.data.id}/status`, { status: 'COMPLETED' })
    const si = await post('/api/sales-invoices', { customerId, salesOrderId: so.body.data.id, dueDate: '2026-07-18', subtotal: 500000, grandTotal: 500000, items: [{ itemId, unitId, quantity: 5, unitPrice: 100000, totalPrice: 500000 }] })
    expect(si.status).toBe(201)
    siId = si.body.data.id
    const complete = await patch(`/api/sales-invoices/${siId}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('completes a customer payment against the invoice', async () => {
    const { post, patch } = await api()
    const cp = await post('/api/customer-payments', { customerId, paymentMethodId, amount: 500000, allocations: [{ salesInvoiceId: siId, amount: 500000 }] })
    expect(cp.status).toBe(201)
    const complete = await patch(`/api/customer-payments/${cp.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  // --- Complete a purchase invoice (no payment) for AP aging ---

  it('completes a purchase invoice', async () => {
    const { post, patch } = await api()
    const po = await post('/api/purchase-orders', { supplierId, subtotal: 300000, grandTotal: 300000, items: [{ itemId, unitId, quantity: 15, unitPrice: 20000, totalPrice: 300000 }] })
    expect(po.status).toBe(201)
    const gr = await post('/api/goods-receipts', { purchaseOrderId: po.body.data.id, warehouseId, items: [{ itemId, unitId, quantity: 15 }] })
    expect(gr.status).toBe(201)
    await patch(`/api/goods-receipts/${gr.body.data.id}/status`, { status: 'COMPLETED' })
    const pi = await post('/api/purchase-invoices', { supplierId, purchaseOrderId: po.body.data.id, dueDate: '2026-07-18', subtotal: 300000, grandTotal: 300000, items: [{ itemId, unitId, quantity: 15, unitPrice: 20000, totalPrice: 300000 }] })
    expect(pi.status).toBe(201)
    piId = pi.body.data.id
    const complete = await patch(`/api/purchase-invoices/${piId}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  // --- ACCOUNTING REPORTS ---

  it('trial balance has equal debits and credits', async () => {
    const { get } = await api()
    const res = await get('/api/accounting-reports/trial-balance')
    expect(res.status).toBe(200)
    expect(res.body.data.totalDebit).toBeGreaterThan(0)
    expect(res.body.data.totalCredit).toBeGreaterThan(0)
    expect(res.body.data.totalDebit).toBe(res.body.data.totalCredit)
  })

  it('profit and loss shows revenue from sales invoice', async () => {
    const { get } = await api()
    const res = await get('/api/accounting-reports/profit-loss')
    expect(res.status).toBe(200)
    expect(res.body.data.revenues.total).toBeGreaterThan(0)
    expect(res.body.data.netProfit).toBe(res.body.data.revenues.total - res.body.data.expenses.total)
  })

  it('balance sheet balances (assets = liabilities + equity)', async () => {
    const { get } = await api()
    const res = await get('/api/accounting-reports/balance-sheet')
    expect(res.status).toBe(200)
    expect(res.body.data.assets.total).toBeGreaterThan(0)
    expect(res.body.data.assets.total).toBe(res.body.data.totalLiabilitiesEquity)
  })

  it('ar aging shows completed invoice', async () => {
    const { get } = await api()
    const res = await get('/api/accounting-reports/ar-aging')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    const inv = res.body.data[0]
    expect(inv.grandTotal).toBeGreaterThan(0)
  })

  it('ap aging shows unpaid purchase invoice', async () => {
    const { get } = await api()
    const res = await get('/api/accounting-reports/ap-aging')
    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThan(0)
    const inv = res.body.data[0]
    expect(inv.grandTotal).toBeGreaterThan(0)
    expect(inv.paid).toBe(0)
  })
})
