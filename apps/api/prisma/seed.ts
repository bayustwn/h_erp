import { PrismaPg } from '@prisma/adapter-pg'
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
      where: {
        companyId: null,
        code: role.code,
      },
      select: {
        id: true,
      },
    })

    const record = existingRole
      ? await prisma.role.update({
          where: { id: existingRole.id },
          data: {
            name: role.name,
            description: role.description,
            isSystem: true,
            deletedAt: null,
          },
          select: { id: true },
        })
      : await prisma.role.create({
          data: {
            companyId: null,
            code: role.code,
            name: role.name,
            description: role.description,
            isSystem: true,
          },
          select: { id: true },
        })

    roleByCode.set(role.code, record)
  }

  for (const [roleCode, permissionCodes] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const role = roleByCode.get(roleCode)

    if (!role) {
      throw new Error(`Role not found in seed catalog: ${roleCode}`)
    }

    const permissionIds = permissionCodes.map((permissionCode) => {
      const permission = permissionByCode.get(permissionCode)

      if (!permission) {
        throw new Error(`Permission not found in seed catalog: ${permissionCode}`)
      }

      return permission.id
    })

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: {
          notIn: permissionIds,
        },
      },
    })

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      })
    }
  }

  console.log(
    `Seeded ${PERMISSIONS.length} permissions and ${SYSTEM_ROLES.length} system roles.`,
  )
}

try {
  await main()
} finally {
  await prisma.$disconnect()
}
