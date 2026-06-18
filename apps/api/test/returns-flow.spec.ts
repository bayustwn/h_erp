import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('Returns Flow (Sales Return & Purchase Return)', () => {
  let customerId: string
  let supplierId: string
  let itemId: string
  let unitId: string
  let warehouseId: string
  let paymentMethodId: string
  let revenueAccountId: string
  let inventoryAccountId: string
  let soId: string
  let poId: string
  let siId: string
  let piId: string

  it('creates unit of measure', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/units', { code: 'PCS3', name: 'Pieces', symbol: 'pcs' })
    expect(res.status).toBe(201)
    unitId = res.body.data.id
  })

  it('creates customer', async () => {
    const { post } = await api()
    const res = await post('/api/customers', { code: 'CUST-R01', name: 'Customer Return', creditLimit: 10_000_000 })
    expect(res.status).toBe(201)
    customerId = res.body.data.id
  })

  it('creates supplier', async () => {
    const { post } = await api()
    const res = await post('/api/suppliers', { code: 'SUPP-R01', name: 'Supplier Return' })
    expect(res.status).toBe(201)
    supplierId = res.body.data.id
  })

  it('creates inventory item', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/items', { sku: 'BRG-R01', name: 'Barang Return', baseUnitId: unitId })
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

  it('gets revenue account', async () => {
    const { get } = await api()
    const res = await get('/api/chart-of-accounts?search=Penjualan%20Barang')
    expect(res.status).toBe(200)
    revenueAccountId = res.body.data.items[0]?.id
    expect(revenueAccountId).toBeDefined()
  })

  it('gets inventory account', async () => {
    const { get } = await api()
    const res = await get('/api/chart-of-accounts?search=Persediaan%20Barang')
    expect(res.status).toBe(200)
    inventoryAccountId = res.body.data.items[0]?.id
    expect(inventoryAccountId).toBeDefined()
  })

  it('creates product accounting mapping', async () => {
    const { post } = await api()
    const res = await post('/api/product-accounting-mappings', { itemId, revenueAccountId, purchaseAccountId: inventoryAccountId })
    expect(res.status).toBe(201)
  })

  it('adjusts stock in', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/stock-adjustments', { warehouseId, itemId, direction: 'IN', quantity: 20 })
    expect(res.status).toBe(201)
  })

  // --- SALES: SO → DO → SI (completed) ---

  it('creates and completes sales order', async () => {
    const { post, patch } = await api()
    const so = await post('/api/sales-orders', { customerId, subtotal: 100000, grandTotal: 100000, items: [{ itemId, unitId, quantity: 2, unitPrice: 50000, totalPrice: 100000 }] })
    expect(so.status).toBe(201)
    soId = so.body.data.id
    const complete = await patch(`/api/sales-orders/${soId}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('creates and completes delivery order', async () => {
    const { post, patch } = await api()
    const doRes = await post('/api/delivery-orders', { salesOrderId: soId, warehouseId, items: [{ itemId, unitId, quantity: 2 }] })
    expect(doRes.status).toBe(201)
    const complete = await patch(`/api/delivery-orders/${doRes.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('creates and completes sales invoice', async () => {
    const { post, patch } = await api()
    const si = await post('/api/sales-invoices', { customerId, salesOrderId: soId, subtotal: 100000, grandTotal: 100000, items: [{ itemId, unitId, quantity: 2, unitPrice: 50000, totalPrice: 100000 }] })
    expect(si.status).toBe(201)
    siId = si.body.data.id
    const complete = await patch(`/api/sales-invoices/${siId}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  // --- SALES RETURN ---

  it('creates and completes sales return', async () => {
    const { post, patch } = await api()
    const sr = await post('/api/sales-returns', { customerId, salesInvoiceId: siId, warehouseId, totalAmount: 50000, items: [{ itemId, unitId, quantity: 1, unitPrice: 50000, totalPrice: 50000 }] })
    expect(sr.status).toBe(201)
    const complete = await patch(`/api/sales-returns/${sr.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('shows stock movement from sales return', async () => {
    const { get } = await api()
    const res = await get('/api/inventory/stock-movements')
    expect(res.status).toBe(200)
    const movements = res.body.data.items.filter((m: { movementType: string }) => m.movementType === 'RETURN_IN')
    expect(movements.length).toBeGreaterThan(0)
  })

  it('shows journal entry from sales return', async () => {
    const { get } = await api()
    const res = await get('/api/journal-entries')
    expect(res.status).toBe(200)
    const entries = res.body.data.items.filter((e: { referenceType: string }) => e.referenceType === 'SALES_RETURN')
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].totalDebit).toBe('50000')
    expect(entries[0].totalCredit).toBe('50000')
  })

  // --- PURCHASE: PO → GR → PI (completed) ---

  it('creates and completes purchase order', async () => {
    const { post, patch } = await api()
    const po = await post('/api/purchase-orders', { supplierId, subtotal: 200000, grandTotal: 200000, items: [{ itemId, unitId, quantity: 10, unitPrice: 20000, totalPrice: 200000 }] })
    expect(po.status).toBe(201)
    poId = po.body.data.id
    const complete = await patch(`/api/purchase-orders/${poId}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('creates and completes goods receipt', async () => {
    const { post, patch } = await api()
    const gr = await post('/api/goods-receipts', { purchaseOrderId: poId, warehouseId, items: [{ itemId, unitId, quantity: 10 }] })
    expect(gr.status).toBe(201)
    const complete = await patch(`/api/goods-receipts/${gr.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('creates and completes purchase invoice', async () => {
    const { post, patch } = await api()
    const pi = await post('/api/purchase-invoices', { supplierId, purchaseOrderId: poId, subtotal: 200000, grandTotal: 200000, items: [{ itemId, unitId, quantity: 10, unitPrice: 20000, totalPrice: 200000 }] })
    expect(pi.status).toBe(201)
    piId = pi.body.data.id
    const complete = await patch(`/api/purchase-invoices/${piId}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  // --- PURCHASE RETURN ---

  it('creates and completes purchase return', async () => {
    const { post, patch } = await api()
    const pr = await post('/api/purchase-returns', { supplierId, purchaseInvoiceId: piId, warehouseId, totalAmount: 40000, items: [{ itemId, unitId, quantity: 2, unitPrice: 20000, totalPrice: 40000 }] })
    expect(pr.status).toBe(201)
    const complete = await patch(`/api/purchase-returns/${pr.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
  })

  it('shows stock movement from purchase return', async () => {
    const { get } = await api()
    const res = await get('/api/inventory/stock-movements')
    expect(res.status).toBe(200)
    const movements = res.body.data.items.filter((m: { movementType: string }) => m.movementType === 'RETURN_OUT')
    expect(movements.length).toBeGreaterThan(0)
  })

  it('shows journal entry from purchase return', async () => {
    const { get } = await api()
    const res = await get('/api/journal-entries')
    expect(res.status).toBe(200)
    const entries = res.body.data.items.filter((e: { referenceType: string }) => e.referenceType === 'PURCHASE_RETURN')
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].totalDebit).toBe('40000')
    expect(entries[0].totalCredit).toBe('40000')
  })
})
