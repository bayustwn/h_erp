import { describe, expect, it } from 'vitest'
import { api } from './helpers.js'

describe('Landed Costs', () => {
  let supplierId: string
  let itemId: string
  let unitId: string
  let warehouseId: string
  let poId: string
  let poItemIds: string[] = []
  let lcId: string

  it('creates unit of measure', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/units', { code: 'PCS5', name: 'Pieces', symbol: 'pcs' })
    expect(res.status).toBe(201)
    unitId = res.body.data.id
  })

  it('creates supplier', async () => {
    const { post } = await api()
    const res = await post('/api/suppliers', { code: 'SUPP-LC', name: 'Supplier Landed' })
    expect(res.status).toBe(201)
    supplierId = res.body.data.id
  })

  it('creates inventory item', async () => {
    const { post } = await api()
    const res = await post('/api/inventory/items', { sku: 'BRG-LC', name: 'Barang Landed', baseUnitId: unitId })
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

  it('creates purchase order', async () => {
    const { post } = await api()
    const res = await post('/api/purchase-orders', {
      supplierId,
      subtotal: 100000,
      grandTotal: 100000,
      items: [
        { itemId, unitId, quantity: 2, unitPrice: 25000, totalPrice: 50000 },
        { itemId, unitId, quantity: 1, unitPrice: 50000, totalPrice: 50000 },
      ],
    })
    expect(res.status).toBe(201)
    poId = res.body.data.id
    poItemIds = res.body.data.items.map((i: { id: string }) => i.id)
    expect(poItemIds.length).toBe(2)
  })

  it('creates landed cost', async () => {
    const { post } = await api()
    const res = await post('/api/landed-costs', {
      purchaseOrderId: poId,
      totalCost: 10000,
      allocationMethod: 'BY_VALUE',
      items: [
        { purchaseOrderItemId: poItemIds[0], amount: 5000, description: 'Shipping' },
        { purchaseOrderItemId: poItemIds[1], amount: 5000, description: 'Insurance' },
      ],
    })
    expect(res.status).toBe(201)
    lcId = res.body.data.id
    expect(lcId).toBeDefined()
  })

  it('completes landed cost and updates PO item prices', async () => {
    const { get, patch } = await api()
    const res = await patch(`/api/landed-costs/${lcId}/status`, { status: 'COMPLETED' })
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('COMPLETED')

    const po = await get(`/api/purchase-orders/${poId}`)
    expect(po.status).toBe(200)
    const updatedItems = po.body.data.items
    const firstTotal = Number(updatedItems.find((i: { id: string }) => i.id === poItemIds[0]).totalPrice)
    const secondTotal = Number(updatedItems.find((i: { id: string }) => i.id === poItemIds[1]).totalPrice)
    expect(firstTotal).toBeGreaterThan(50000)
    expect(secondTotal).toBeGreaterThan(50000)
    expect(firstTotal + secondTotal).toBeGreaterThan(100000)
  })
})
