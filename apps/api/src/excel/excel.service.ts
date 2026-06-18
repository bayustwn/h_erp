import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { InventoryItemType } from '../generated/prisma/enums.js'
import { PrismaService } from '../prisma/prisma.service.js'
import type { TenantContext } from '../access-control/access-control.types.js'

export type ColumnDef = { header: string; key: string; width?: number; required?: boolean; example?: string }

const TEMPLATES: Record<string, { sheet: string; columns: ColumnDef[] }> = {
  customers: {
    sheet: 'Customer',
    columns: [
      { header: 'Code', key: 'code', width: 15, required: true, example: 'CUST001' },
      { header: 'Name', key: 'name', width: 30, required: true, example: 'PT Maju Jaya' },
      { header: 'Phone', key: 'phone', width: 20, example: '08123456789' },
      { header: 'Email', key: 'email', width: 30, example: 'info@majujaya.com' },
      { header: 'Address', key: 'address', width: 40, example: 'Jl. Merdeka No. 1' },
      { header: 'Tax Number (NPWP)', key: 'taxNumber', width: 25, example: '01.234.567.8-901.000' },
      { header: 'Credit Limit', key: 'creditLimit', width: 15, example: '50000000' },
      { header: 'Payment Term', key: 'paymentTerm', width: 15, example: 'NET30' },
    ],
  },
  suppliers: {
    sheet: 'Supplier',
    columns: [
      { header: 'Code', key: 'code', width: 15, required: true, example: 'SUPP001' },
      { header: 'Name', key: 'name', width: 30, required: true, example: 'PT Supplier Makmur' },
      { header: 'Phone', key: 'phone', width: 20, example: '08123456789' },
      { header: 'Email', key: 'email', width: 30, example: 'sales@supplier.com' },
      { header: 'Address', key: 'address', width: 40, example: 'Jl. Industri No. 1' },
      { header: 'Tax Number (NPWP)', key: 'taxNumber', width: 25, example: '01.234.567.8-901.000' },
      { header: 'Credit Limit', key: 'creditLimit', width: 15, example: '100000000' },
      { header: 'Payment Term', key: 'paymentTerm', width: 15, example: 'NET45' },
    ],
  },
  items: {
    sheet: 'Item',
    columns: [
      { header: 'SKU', key: 'sku', width: 20, required: true, example: 'BRG001' },
      { header: 'Name', key: 'name', width: 30, required: true, example: 'Beras Premium 5kg' },
      { header: 'Category Code', key: 'categoryCode', width: 20, example: 'FOOD' },
      { header: 'Base Unit Code', key: 'baseUnitCode', width: 15, required: true, example: 'PCS' },
      { header: 'Barcode', key: 'barcode', width: 20, example: '8991234567890' },
      { header: 'Item Type', key: 'itemType', width: 15, example: 'STOCK' },
      { header: 'Description', key: 'description', width: 40, example: 'Beras premium kualitas terbaik' },
      { header: 'Min Stock', key: 'minStock', width: 12, example: '10' },
    ],
  },
}

@Injectable()
export class ExcelService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getTemplateInfo(entityType: string) {
    const template = TEMPLATES[entityType]
    if (!template) throw new BadRequestException(`Unknown entity type: ${entityType}`)
    return template
  }

  async generateTemplate(entityType: string) {
    const template = this.getTemplateInfo(entityType)
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(template.sheet)

    sheet.columns = template.columns.map((col) => ({ header: col.header, key: col.key, width: col.width ?? 20 }))

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' }

    const exampleRow: Record<string, string> = {}
    for (const col of template.columns) {
      exampleRow[col.key] = col.example ?? ''
    }
    sheet.addRow(exampleRow)

    const noteSheet = workbook.addWorksheet('Notes')
    noteSheet.getCell('A1').value = 'Petunjuk Import:'
    noteSheet.getCell('A1').font = { bold: true, size: 14 }
    noteSheet.getCell('A3').value = '1. Baris pertama adalah header — jangan dihapus.'
    noteSheet.getCell('A4').value = '2. Baris kedua adalah contoh — bisa dihapus atau diedit.'
    noteSheet.getCell('A5').value = '3. Kolom dengan tanda * wajib diisi.'
    noteSheet.getCell('A6').value = '4. Code/SKU harus unik per perusahaan.'
    noteSheet.getCell('A7').value = '5. Data akan di-import dengan status ACTIVE secara default.'
    noteSheet.getCell('A9').value = 'Kolom yang tersedia:'
    noteSheet.getCell('A9').font = { bold: true }
    let rowNum = 10
    for (const col of template.columns) {
      noteSheet.getCell(`A${rowNum}`).value = `${col.header}${col.required ? ' *' : ''}${col.example ? ' (contoh: ' + col.example + ')' : ''}`
      rowNum++
    }

    return workbook
  }

  async parseImport(entityType: string, buffer: Buffer) {
    const template = this.getTemplateInfo(entityType)
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)

    const sheet = workbook.getWorksheet(template.sheet)
    if (!sheet) throw new BadRequestException(`Sheet "${template.sheet}" not found in the file`)

    const rows: Record<string, unknown>[] = []
    const errors: { row: number; message: string }[] = []

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return

      const rowData: Record<string, unknown> = {}
      let hasValue = false

      for (let i = 0; i < template.columns.length; i++) {
        const col = template.columns[i]
        const cellValue = row.getCell(i + 1).value
        const raw = cellValue?.toString()?.trim() ?? ''
        if (raw) hasValue = true

        if (col.required && !raw) {
          errors.push({ row: rowNumber, message: `"${col.header}" is required` })
        }
        rowData[col.key] = raw || undefined
      }

      if (hasValue) rows.push(rowData)
    })

    return { rows, errors }
  }

  async importCustomers(rows: Record<string, unknown>[], tenant: TenantContext) {
    const errors: { row: number; message: string }[] = []
    const created: unknown[] = []
    let rowNum = 2

    for (const row of rows) {
      try {
        const code = (row.code as string)?.toUpperCase()
        if (!code) { errors.push({ row: rowNum, message: 'Code is required' }); rowNum++; continue }

        const existing = await this.prisma.customer.findFirst({ where: { companyId: tenant.companyId, code, deletedAt: null }, select: { id: true } })
        if (existing) { errors.push({ row: rowNum, message: `Code "${code}" already exists` }); rowNum++; continue }

        const customer = await this.prisma.customer.create({
          data: {
            companyId: tenant.companyId,
            code,
            name: row.name as string ?? code,
            phone: row.phone as string,
            email: row.email as string,
            address: row.address as string,
            taxNumber: row.taxNumber as string,
            creditLimit: row.creditLimit ? Number(row.creditLimit) : undefined,
            paymentTerm: row.paymentTerm as string,
          },
          select: { id: true, code: true, name: true },
        })
        created.push(customer)
      } catch (err) {
        errors.push({ row: rowNum, message: String(err instanceof Error ? err.message : err) })
      }
      rowNum++
    }

    return { created: created.length, errors }
  }

  async importSuppliers(rows: Record<string, unknown>[], tenant: TenantContext) {
    const errors: { row: number; message: string }[] = []
    const created: unknown[] = []
    let rowNum = 2

    for (const row of rows) {
      try {
        const code = (row.code as string)?.toUpperCase()
        if (!code) { errors.push({ row: rowNum, message: 'Code is required' }); rowNum++; continue }

        const existing = await this.prisma.supplier.findFirst({ where: { companyId: tenant.companyId, code, deletedAt: null }, select: { id: true } })
        if (existing) { errors.push({ row: rowNum, message: `Code "${code}" already exists` }); rowNum++; continue }

        const supplier = await this.prisma.supplier.create({
          data: {
            companyId: tenant.companyId,
            code,
            name: row.name as string ?? code,
            phone: row.phone as string,
            email: row.email as string,
            address: row.address as string,
            taxNumber: row.taxNumber as string,
            creditLimit: row.creditLimit ? Number(row.creditLimit) : undefined,
            paymentTerm: row.paymentTerm as string,
          },
          select: { id: true, code: true, name: true },
        })
        created.push(supplier)
      } catch (err) {
        errors.push({ row: rowNum, message: String(err instanceof Error ? err.message : err) })
      }
      rowNum++
    }

    return { created: created.length, errors }
  }

  async importItems(rows: Record<string, unknown>[], tenant: TenantContext) {
    const errors: { row: number; message: string }[] = []
    const created: unknown[] = []
    let rowNum = 2

    for (const row of rows) {
      try {
        const sku = (row.sku as string)?.toUpperCase()
        if (!sku) { errors.push({ row: rowNum, message: 'SKU is required' }); rowNum++; continue }

        const existing = await this.prisma.inventoryItem.findFirst({ where: { companyId: tenant.companyId, sku, deletedAt: null }, select: { id: true } })
        if (existing) { errors.push({ row: rowNum, message: `SKU "${sku}" already exists` }); rowNum++; continue }

        let categoryId: string | undefined
        if (row.categoryCode) {
          const cat = await this.prisma.itemCategory.findFirst({ where: { companyId: tenant.companyId, code: String(row.categoryCode), deletedAt: null }, select: { id: true } })
          if (cat) categoryId = cat.id
        }

        const baseUnitCode = row.baseUnitCode as string
        if (!baseUnitCode) { errors.push({ row: rowNum, message: 'Base Unit Code is required' }); rowNum++; continue }
        const unit = await this.prisma.unitOfMeasure.findFirst({ where: { companyId: tenant.companyId, code: baseUnitCode.toUpperCase(), deletedAt: null }, select: { id: true } })
        if (!unit) { errors.push({ row: rowNum, message: `Unit code "${baseUnitCode}" not found` }); rowNum++; continue }

        const item = await this.prisma.inventoryItem.create({
          data: {
            companyId: tenant.companyId,
            categoryId,
            baseUnitId: unit.id,
            sku,
            name: row.name as string ?? sku,
            barcode: row.barcode as string,
            itemType: ((row.itemType as string)?.toUpperCase() as InventoryItemType) ?? InventoryItemType.STOCK,
            description: row.description as string,
            minStock: row.minStock ? Number(row.minStock) : undefined,
          },
          select: { id: true, sku: true, name: true },
        })
        created.push(item)
      } catch (err) {
        errors.push({ row: rowNum, message: String(err instanceof Error ? err.message : err) })
      }
      rowNum++
    }

    return { created: created.length, errors }
  }
}
