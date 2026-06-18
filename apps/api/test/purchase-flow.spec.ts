import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('Purchase Flow (PO → GR → PI → SP)', () => {
  let supplierId: string
  let itemId: string
  let unitId: string
  let warehouseId: string
  let paymentMethodId: string
  let inventoryAccountId: string
  let poId: string
  let grId: string
  let piId: string

  it('creates unit of measure', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/units', {
      code: 'PCS2',
      name: 'Pieces',
      symbol: 'pcs',
    })
    expect(res.status).toBe(201)
    unitId = res.body.data.id
  })

  it('creates supplier', async () => {
    const { post } = await api()
    const res = await post('/api/suppliers', {
      code: 'SUPP-001',
      name: 'Supplier Test',
    })
    expect(res.status).toBe(201)
    supplierId = res.body.data.id
  })

  it('creates inventory item', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/items', {
      sku: 'BRG-002',
      name: 'Barang Beli',
      baseUnitId: unitId,
    })
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

  it('gets inventory account for purchase mapping', async () => {
    const { get } = await api()
    const res = await get('/api/chart-of-accounts?search=Persediaan%20Barang')
    expect(res.status).toBe(200)
    inventoryAccountId = res.body.data.items[0]?.id
    expect(inventoryAccountId).toBeDefined()
  })

  it('creates product accounting mapping with purchase account', async () => {
    const { post } = await api()
    const res = await post('/api/product-accounting-mappings', {
      itemId,
      purchaseAccountId: inventoryAccountId,
    })
    expect(res.status).toBe(201)
  })

  it('creates purchase order', async () => {
    const { post } = await api()
    const res = await post('/api/purchase-orders', {
      supplierId,
      subtotal: 150000,
      grandTotal: 150000,
      items: [{ itemId, unitId, quantity: 5, unitPrice: 30000, totalPrice: 150000 }],
    })
    expect(res.status).toBe(201)
    poId = res.body.data.id
    expect(res.body.data.documentNumber).toMatch(/^(PO\/|\d|\w)/)
  })

  it('creates goods receipt', async () => {
    const { post } = await api()
    const res = await post('/api/goods-receipts', {
      purchaseOrderId: poId,
      warehouseId,
      items: [{ purchaseOrderItemId: undefined, itemId, unitId, quantity: 5 }],
    })
    expect(res.status).toBe(201)
    grId = res.body.data.id
  })

  it('completes goods receipt', async () => {
    const { patch } = await api()
    const res = await patch(`/api/goods-receipts/${grId}/status`, { status: 'COMPLETED' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
  })

  it('creates purchase invoice', async () => {
    const { post } = await api()
    const res = await post('/api/purchase-invoices', {
      supplierId,
      purchaseOrderId: poId,
      subtotal: 150000,
      grandTotal: 150000,
      items: [{ itemId, unitId, quantity: 5, unitPrice: 30000, totalPrice: 150000 }],
    })
    expect(res.status).toBe(201)
    piId = res.body.data.id
  })

  it('completes purchase invoice', async () => {
    const { patch } = await api()
    const res = await patch(`/api/purchase-invoices/${piId}/status`, { status: 'COMPLETED' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
  })

  it('creates and completes supplier payment', async () => {
    const { post, patch } = await api()
    const create = await post('/api/supplier-payments', {
      supplierId,
      paymentMethodId,
      amount: 150000,
      allocations: [{ purchaseInvoiceId: piId, amount: 150000 }],
    })
    expect(create.status).toBe(201)
    const complete = await patch(`/api/supplier-payments/${create.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
    expect(complete.body.data.status).toBe('COMPLETED')
  })

  it('shows stock movement from goods receipt', async () => {
    const { get } = await api()
    const res = await get('/api/inventory/stock-movements')
    expect(res.status).toBe(200)
    const movements = res.body.data.items.filter((m: { sourceId: string }) => m.sourceId === grId)
    expect(movements.length).toBeGreaterThan(0)
    expect(movements[0].movementType).toBe('PURCHASE_IN')
  })

  it('shows journal entry from purchase invoice', async () => {
    const { get } = await api()
    const res = await get('/api/journal-entries')
    expect(res.status).toBe(200)
    const entries = res.body.data.items.filter((e: { referenceId: string }) => e.referenceId === piId)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].totalDebit).toBe('150000')
    expect(entries[0].totalCredit).toBe('150000')
  })
})
