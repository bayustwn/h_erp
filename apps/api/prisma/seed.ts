import { PrismaPg } from '@prisma/adapter-pg'
import { randomBytes, scrypt } from 'node:crypto'
import {
  PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  SYSTEM_ROLES,
} from '../src/access-control/permission-catalog.js'
import { PrismaClient } from '../src/generated/prisma/client.js'

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://erp:erp@127.0.0.1:15432/erp?schema=public'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { cost: 16384, blockSize: 8, parallelization: 1 }, (err, key) => {
      if (err) reject(err)
      else resolve(key as Buffer)
    })
  })
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`
}

const DEFAULT_COA: Array<{ code: string; name: string; type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'; parentCode?: string }> = [
  { code: '1', name: 'ASET', type: 'ASSET' },
  { code: '1.1', name: 'Aset Lancar', type: 'ASSET', parentCode: '1' },
  { code: '1.1.1', name: 'Kas', type: 'ASSET', parentCode: '1.1' },
  { code: '1.1.2', name: 'Bank', type: 'ASSET', parentCode: '1.1' },
  { code: '1.1.3', name: 'Piutang Usaha', type: 'ASSET', parentCode: '1.1' },
  { code: '1.1.4', name: 'Piutang Lain-lain', type: 'ASSET', parentCode: '1.1' },
  { code: '1.1.5', name: 'Persediaan Barang', type: 'ASSET', parentCode: '1.1' },
  { code: '1.1.6', name: 'Uang Muka Pembelian', type: 'ASSET', parentCode: '1.1' },
  { code: '1.1.7', name: 'Pajak Dibayar Dimuka', type: 'ASSET', parentCode: '1.1' },
  { code: '1.2', name: 'Aset Tetap', type: 'ASSET', parentCode: '1' },
  { code: '1.2.1', name: 'Tanah', type: 'ASSET', parentCode: '1.2' },
  { code: '1.2.2', name: 'Bangunan', type: 'ASSET', parentCode: '1.2' },
  { code: '1.2.3', name: 'Kendaraan', type: 'ASSET', parentCode: '1.2' },
  { code: '1.2.4', name: 'Peralatan Kantor', type: 'ASSET', parentCode: '1.2' },
  { code: '1.2.5', name: 'Akumulasi Penyusutan', type: 'ASSET', parentCode: '1.2' },
  { code: '2', name: 'KEWAJIBAN', type: 'LIABILITY' },
  { code: '2.1', name: 'Kewajiban Lancar', type: 'LIABILITY', parentCode: '2' },
  { code: '2.1.1', name: 'Hutang Usaha', type: 'LIABILITY', parentCode: '2.1' },
  { code: '2.1.2', name: 'Hutang Lain-lain', type: 'LIABILITY', parentCode: '2.1' },
  { code: '2.1.3', name: 'Hutang Pajak', type: 'LIABILITY', parentCode: '2.1' },
  { code: '2.1.4', name: 'Pendapatan Diterima Dimuka', type: 'LIABILITY', parentCode: '2.1' },
  { code: '2.2', name: 'Kewajiban Jangka Panjang', type: 'LIABILITY', parentCode: '2' },
  { code: '2.2.1', name: 'Hutang Bank', type: 'LIABILITY', parentCode: '2.2' },
  { code: '3', name: 'EKUITAS', type: 'EQUITY' },
  { code: '3.1', name: 'Modal Disetor', type: 'EQUITY', parentCode: '3' },
  { code: '3.2', name: 'Laba Ditahan', type: 'EQUITY', parentCode: '3' },
  { code: '3.3', name: 'Laba Tahun Berjalan', type: 'EQUITY', parentCode: '3' },
  { code: '4', name: 'PENDAPATAN', type: 'REVENUE' },
  { code: '4.1', name: 'Pendapatan Usaha', type: 'REVENUE', parentCode: '4' },
  { code: '4.1.1', name: 'Penjualan Barang', type: 'REVENUE', parentCode: '4.1' },
  { code: '4.1.2', name: 'Retur Penjualan', type: 'REVENUE', parentCode: '4.1' },
  { code: '4.1.3', name: 'Diskon Penjualan', type: 'REVENUE', parentCode: '4.1' },
  { code: '4.2', name: 'Pendapatan Lain-lain', type: 'REVENUE', parentCode: '4' },
  { code: '5', name: 'BEBAN', type: 'EXPENSE' },
  { code: '5.1', name: 'Beban Usaha', type: 'EXPENSE', parentCode: '5' },
  { code: '5.1.1', name: 'Beban Pokok Penjualan', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.2', name: 'Beban Gaji', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.3', name: 'Beban Sewa', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.4', name: 'Beban Listrik & Air', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.5', name: 'Beban Transportasi', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.6', name: 'Beban Penyusutan', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.7', name: 'Beban Perlengkapan Kantor', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.1.8', name: 'Beban Pemasaran', type: 'EXPENSE', parentCode: '5.1' },
  { code: '5.2', name: 'Beban Lain-lain', type: 'EXPENSE', parentCode: '5' },
  { code: '5.2.1', name: 'Beban Bunga', type: 'EXPENSE', parentCode: '5.2' },
  { code: '5.2.2', name: 'Beban Administrasi Bank', type: 'EXPENSE', parentCode: '5.2' },
  { code: '5.2.3', name: 'Beban Pajak', type: 'EXPENSE', parentCode: '5.2' },
  { code: '5.2.4', name: 'Beban Lainnya', type: 'EXPENSE', parentCode: '5.2' },
]

const DOCUMENT_TYPES = [
  'SALES_ORDER', 'DELIVERY_ORDER', 'SALES_INVOICE', 'CUSTOMER_PAYMENT', 'SALES_RETURN',
  'PURCHASE_ORDER', 'GOODS_RECEIPT', 'PURCHASE_INVOICE', 'SUPPLIER_PAYMENT', 'PURCHASE_RETURN',
  'LANDED_COST', 'JOURNAL_ENTRY',
]

async function main() {
  const permissionByCode = new Map<string, { id: string }>()
  const roleByCode = new Map<string, { id: string }>()

  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
      select: { id: true },
    })
    permissionByCode.set(permission.code, record)
  }

  for (const role of SYSTEM_ROLES) {
    const existingRole = await prisma.role.findFirst({
      where: { companyId: null, code: role.code },
      select: { id: true },
    })
    const record = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: { name: role.name, description: role.description, isSystem: true, deletedAt: null },
          select: { id: true },
        })
      : await prisma.role.create({
          data: { companyId: null, code: role.code, name: role.name, description: role.description, isSystem: true },
          select: { id: true },
        })
    roleByCode.set(role.code, record)
  }

  for (const [roleCode, permissionCodes] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const role = roleByCode.get(roleCode)
    if (!role) throw new Error(`Role not found: ${roleCode}`)
    const permissionIds = permissionCodes.map((pc) => {
      const p = permissionByCode.get(pc)
      if (!p) throw new Error(`Permission not found: ${pc}`)
      return p.id
    })
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: permissionIds } },
    })
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      })
    }
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions and ${SYSTEM_ROLES.length} system roles.`)

  const company = await prisma.company.upsert({
    where: { code: 'DEFAULT' },
    update: { name: 'Perusahaan Default', deletedAt: null },
    create: { code: 'DEFAULT', name: 'Perusahaan Default', email: 'admin@erp.com', phone: '021-12345678', address: 'Jakarta' },
  })
  console.log(`Company: ${company.code} (${company.id})`)

  const adminPassword = await hashPassword('admin123')
  const adminRole = await prisma.role.findFirstOrThrow({ where: { companyId: null, code: 'ADMIN' }, select: { id: true } })
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@erp.com' },
    update: { fullName: 'Admin Utama', status: 'ACTIVE', deletedAt: null },
    create: { email: 'admin@erp.com', passwordHash: adminPassword, fullName: 'Admin Utama' },
  })
  const existingUserRole = await prisma.userRole.findFirst({
    where: { userId: adminUser.id, roleId: adminRole.id, companyId: null },
  })
  if (!existingUserRole) {
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: adminRole.id, companyId: null } })
  }
  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: adminUser.id, companyId: company.id } },
    update: { accessScope: 'ALL_COMPANIES' },
    create: { userId: adminUser.id, companyId: company.id, accessScope: 'ALL_COMPANIES' },
  })
  console.log(`Admin user: admin@erp.com / admin123`)

  const branch = await prisma.branch.upsert({
    where: { companyId_code: { companyId: company.id, code: 'HQ' } },
    update: { name: 'Kantor Pusat', deletedAt: null },
    create: { companyId: company.id, code: 'HQ', name: 'Kantor Pusat', address: 'Jakarta' },
  })
  await prisma.userBranchAccess.upsert({
    where: { userId_branchId: { userId: adminUser.id, branchId: branch.id } },
    update: { accessScope: 'ALL_COMPANIES' },
    create: { userId: adminUser.id, branchId: branch.id, accessScope: 'ALL_COMPANIES' },
  })
  console.log(`Branch: ${branch.code}`)

  const warehouse = await prisma.warehouse.upsert({
    where: { companyId_code: { companyId: company.id, code: 'MAIN' } },
    update: { name: 'Gudang Utama', deletedAt: null },
    create: { companyId: company.id, branchId: branch.id, code: 'MAIN', name: 'Gudang Utama', address: 'Jakarta' },
  })
  console.log(`Warehouse: ${warehouse.code}`)

  const coaMap = new Map<string, string>()
  for (const acct of DEFAULT_COA) {
    const parentId = acct.parentCode ? coaMap.get(acct.parentCode) : undefined
    const record = await prisma.chartOfAccount.upsert({
      where: { companyId_code: { companyId: company.id, code: acct.code } },
      update: { name: acct.name, type: acct.type, parentId, status: 'ACTIVE', deletedAt: null },
      create: { companyId: company.id, code: acct.code, name: acct.name, type: acct.type, parentId, isDefault: true },
    })
    coaMap.set(acct.code, record.id)
  }
  console.log(`Chart of Accounts: ${DEFAULT_COA.length} accounts`)

  const tax = await prisma.tax.upsert({
    where: { companyId_code: { companyId: company.id, code: 'PPN' } },
    update: { name: 'PPN 11%', rate: 11, isDefault: true, deletedAt: null },
    create: { companyId: company.id, code: 'PPN', name: 'PPN 11%', rate: 11, isDefault: true },
  })
  console.log(`Tax: ${tax.code} (${tax.rate}%)`)

  for (const pt of [
    { code: 'CASH', name: 'Tunai', daysDue: 0 },
    { code: 'NET30', name: '30 Hari', daysDue: 30 },
    { code: 'NET60', name: '60 Hari', daysDue: 60 },
  ]) {
    await prisma.paymentTerm.upsert({
      where: { companyId_code: { companyId: company.id, code: pt.code } },
      update: { name: pt.name, daysDue: pt.daysDue, deletedAt: null },
      create: { companyId: company.id, code: pt.code, name: pt.name, daysDue: pt.daysDue, isDefault: pt.code === 'NET30' },
    })
  }
  console.log(`Payment Terms: 3 items`)

  for (const pm of [
    { code: 'CASH', name: 'Tunai' },
    { code: 'TRANSFER', name: 'Transfer Bank' },
  ]) {
    await prisma.paymentMethod.upsert({
      where: { companyId_code: { companyId: company.id, code: pm.code } },
      update: { name: pm.name, deletedAt: null },
      create: { companyId: company.id, code: pm.code, name: pm.name, isDefault: pm.code === 'TRANSFER' },
    })
  }
  console.log(`Payment Methods: 2 items`)

  for (const dt of DOCUMENT_TYPES) {
    const existing = await prisma.documentSequence.findFirst({
      where: { companyId: company.id, branchId: branch.id, documentType: dt, periodFormat: 'YYYY/MM/' },
    })
    if (!existing) {
      const prefixMap: Record<string, string> = {
        SALES_ORDER: 'SO/', DELIVERY_ORDER: 'DO/', SALES_INVOICE: 'SI/',
        CUSTOMER_PAYMENT: 'CP/', SALES_RETURN: 'SR/', PURCHASE_ORDER: 'PO/',
        GOODS_RECEIPT: 'GR/', PURCHASE_INVOICE: 'PI/', SUPPLIER_PAYMENT: 'SP/',
        PURCHASE_RETURN: 'PR/', LANDED_COST: 'LC/', JOURNAL_ENTRY: 'JE/',
      }
      await prisma.documentSequence.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          documentType: dt,
          prefix: prefixMap[dt] ?? `${dt.substring(0, 2)}/`,
          periodFormat: 'YYYY/MM/',
          resetPolicy: 'MONTHLY',
          isActive: true,
        },
      })
    }
  }
  console.log(`Document Sequences: ${DOCUMENT_TYPES.length} types`)
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}
