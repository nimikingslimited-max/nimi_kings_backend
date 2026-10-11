import { PrismaClient, RoleType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const isLocal =
  connectionString.includes('localhost') ||
  connectionString.includes('127.0.0.1');

const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding roles and permissions...');

  const roles = [
    { name: RoleType.SUPER_ADMIN, description: 'Universal platform administrator' },
    { name: RoleType.ADMIN, description: 'Administrative staff with platform management' },
    { name: RoleType.AGENT, description: 'Real estate field agent managing clients & properties' },
    { name: RoleType.CUSTOMER, description: 'Standard platform client / buyer / investor' },
    { name: RoleType.VERIFICATION_OFFICER, description: 'Legal & document due diligence reviewer' },
    { name: RoleType.PROPERTY_MANAGER, description: 'Physical catalog & listings manager' },
    { name: RoleType.CONSTRUCTION_MANAGER, description: 'Site engineer & project milestone manager' },
    { name: RoleType.FINANCE_OFFICER, description: 'Transaction and payment reconciliation officer' },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
  }

  console.log('✅ Roles seeded.');

  // Create default Super Admin user if not exists
  const adminEmail = 'admin@nimikingsltd.com';
  const superAdminRole = await prisma.role.findUnique({
    where: { name: RoleType.SUPER_ADMIN },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin && superAdminRole) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPassword2026!', salt);

    const admin = await prisma.user.create({
      data: {
        firstName: 'System',
        lastName: 'Administrator',
        email: adminEmail,
        phone: '+2348000000000',
        passwordHash,
        status: 'ACTIVE',
        userRoles: {
          create: {
            roleId: superAdminRole.id,
          },
        },
      },
    });

    console.log(`✅ Default Super Admin created: ${admin.email} (Password: AdminPassword2026!)`);
  } else {
    console.log('ℹ️ Super Admin account already exists.');
  }

  // Seed default property amenities / features
  const defaultFeatures = [
    '24/7 Electricity',
    'Treated Water Supply / Borehole',
    'Perimeter Fencing & Security Post',
    'CCTV Surveillance',
    'Paved Access Roads',
    'Drainage System',
    'Street Lights',
    'Recreational Park / Green Area',
    'Swimming Pool',
    'Dedicated Transformer',
  ];

  for (const featureName of defaultFeatures) {
    await prisma.feature.upsert({
      where: { name: featureName },
      update: {},
      create: { name: featureName },
    });
  }

  console.log('✅ Default property features seeded.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
