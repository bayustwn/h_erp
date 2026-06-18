import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('Sales Flow (SO → DO → SI → CP)', () => {
  let customerId: string
  let itemId: string
  let unitId: string
  let warehouseId: string
  let paymentMethodId: string
  let soId: string
  let doId: string
  let siId: string
  let revenueAccountId: string

  it('creates unit of measure', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/units', {
      code: 'PCS',
      name: 'Pieces',
      symbol: 'pcs',
    })
    expect(res.status).toBe(201)
    unitId = res.body.data.id
  })

  it('creates customer', async () => {
    const { post } = await api()
    const res = await post('/api/customers', {
      code: 'CUST-001',
      name: 'Pelanggan Test',
      creditLimit: 10_000_000,
    })
    expect(res.status).toBe(201)
    customerId = res.body.data.id
  })

  it('creates inventory item', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/items', {
      sku: 'BRG-001',
      name: 'Barang Test',
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

  it('gets revenue account', async () => {
    const { get } = await api()
    const res = await get('/api/chart-of-accounts?search=Penjualan%20Barang')
    expect(res.status).toBe(200)
    revenueAccountId = res.body.data.items[0]?.id
    expect(revenueAccountId).toBeDefined()
  })

  it('creates product accounting mapping', async () => {
    const { post } = await api()
    const res = await post('/api/product-accounting-mappings', {
      itemId,
      revenueAccountId,
    })
    expect(res.status).toBe(201)
  })

  it('adjusts stock in', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/stock-adjustments', {
      warehouseId,
      itemId,
      direction: 'IN',
      quantity: 10,
    })
    expect(res.status).toBe(201)
  })

  it('creates sales order', async () => {
    const { post } = await api()
    const res = await post('/api/sales-orders', {
      customerId,
      subtotal: 150000,
      grandTotal: 150000,
      items: [{ itemId, unitId, quantity: 2, unitPrice: 75000, totalPrice: 150000 }],
    })
    expect(res.status).toBe(201)
    soId = res.body.data.id
    expect(res.body.data.documentNumber).toMatch(/^(SO\/|\d|\w)/)
  })

  it('creates delivery order', async () => {
    const { post } = await api()
    const res = await post('/api/delivery-orders', {
      salesOrderId: soId,
      warehouseId,
      items: [{ salesOrderItemId: undefined, itemId, unitId, quantity: 2 }],
    })
    expect(res.status).toBe(201)
    doId = res.body.data.id
  })

  it('completes delivery order', async () => {
    const { patch } = await api()
    const res = await patch(`/api/delivery-orders/${doId}/status`, { status: 'COMPLETED' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
  })

  it('creates sales invoice', async () => {
    const { post } = await api()
    const res = await post('/api/sales-invoices', {
      customerId,
      salesOrderId: soId,
      subtotal: 150000,
      grandTotal: 150000,
      items: [{ itemId, unitId, quantity: 2, unitPrice: 75000, totalPrice: 150000 }],
    })
    expect(res.status).toBe(201)
    siId = res.body.data.id
  })

  it('completes sales invoice', async () => {
    const { patch } = await api()
    const res = await patch(`/api/sales-invoices/${siId}/status`, { status: 'COMPLETED' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')
  })

  it('creates and completes customer payment', async () => {
    const { post, patch } = await api()
    const create = await post('/api/customer-payments', {
      customerId,
      paymentMethodId,
      amount: 150000,
      allocations: [{ salesInvoiceId: siId, amount: 150000 }],
    })
    expect(create.status).toBe(201)
    const complete = await patch(`/api/customer-payments/${create.body.data.id}/status`, { status: 'COMPLETED' })
    expect(complete.status).toBe(200)
    expect(complete.body.data.status).toBe('COMPLETED')
  })

  it('shows stock movement from delivery', async () => {
    const { get } = await api()
    const res = await get('/api/inventory/stock-movements')
    expect(res.status).toBe(200)
    const movements = res.body.data.items.filter((m: { sourceId: string }) => m.sourceId === doId)
    expect(movements.length).toBeGreaterThan(0)
    expect(movements[0].movementType).toBe('SALES_OUT')
  })

  it('shows journal entry from invoice', async () => {
    const { get } = await api()
    const res = await get('/api/journal-entries')
    expect(res.status).toBe(200)
    const entries = res.body.data.items.filter((e: { referenceId: string }) => e.referenceId === siId)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].totalDebit).toBe('150000')
    expect(entries[0].totalCredit).toBe('150000')
  })
})
