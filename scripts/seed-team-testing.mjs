import { PrismaClient, RoleType, PropertyType, ListingType, ListingStatus, VerificationStatus, RiskLevel, DocumentType, DocumentStatus, InspectionStatus, ProjectStatus, FarmStatus, AreaUnit, CropStage, QualityGrade, TransactionType, TransactionStatus, NotificationType, MessageType } from '@prisma/client';
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
  console.log('🌱 Seeding complete test environment for NIMI KINGS Backend...');

  // 1. Roles
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

  const dbRoles = {};
  for (const r of roles) {
    dbRoles[r.name] = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
  }
  console.log('✅ Roles verified.');

  // 2. Default Features
  const featuresList = [
    '24/7 Electricity',
    'Treated Water Supply / Borehole',
    'Perimeter Fencing & Security Post',
    'CCTV Surveillance',
    'Paved Access Roads',
    'Drainage System',
    'Street Lights',
    'Swimming Pool',
    'Solar Power',
    'Smart Home Automation',
  ];

  const dbFeatures = {};
  for (const f of featuresList) {
    dbFeatures[f] = await prisma.feature.upsert({
      where: { name: f },
      update: {},
      create: { name: f },
    });
  }
  console.log('✅ Features verified.');

  // 3. Testing Accounts
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('Password123!', salt);

  // 3a. Admin / Super Admin (admin@nimikingsltd.com)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@nimikingsltd.com' },
    update: {
      passwordHash: commonPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@nimikingsltd.com',
      phone: '+2348000000001',
      passwordHash: commonPasswordHash,
      status: 'ACTIVE',
    },
  });

  // Assign SUPER_ADMIN and ADMIN roles
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: dbRoles[RoleType.SUPER_ADMIN].id } },
    update: {},
    create: { userId: adminUser.id, roleId: dbRoles[RoleType.SUPER_ADMIN].id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: dbRoles[RoleType.ADMIN].id } },
    update: {},
    create: { userId: adminUser.id, roleId: dbRoles[RoleType.ADMIN].id },
  });

  // 3b. Agent (agent@nimikingsltd.com)
  const agentUser = await prisma.user.upsert({
    where: { email: 'agent@nimikingsltd.com' },
    update: {
      passwordHash: commonPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      firstName: 'Tunde',
      lastName: 'Balogun',
      email: 'agent@nimikingsltd.com',
      phone: '+2348000000002',
      passwordHash: commonPasswordHash,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: agentUser.id, roleId: dbRoles[RoleType.AGENT].id } },
    update: {},
    create: { userId: agentUser.id, roleId: dbRoles[RoleType.AGENT].id },
  });

  await prisma.agentProfile.upsert({
    where: { userId: agentUser.id },
    update: {
      agencyName: 'Nimi Kings Realty',
      licenseNumber: 'LASRETR-2024-001',
      specialties: 'Luxury Duplexes, Lekki Lands, Off-Plan Developments',
      yearsOfExperience: 8,
      officeAddress: 'Admiralty Way, Lekki Phase 1, Lagos',
      bio: 'Senior real estate consultant and verified agent at NIMI KINGS LTD.',
    },
    create: {
      userId: agentUser.id,
      agentCode: 'NK-AGT-001',
      agencyName: 'Nimi Kings Realty',
      licenseNumber: 'LASRETR-2024-001',
      specialties: 'Luxury Duplexes, Lekki Lands, Off-Plan Developments',
      yearsOfExperience: 8,
      officeAddress: 'Admiralty Way, Lekki Phase 1, Lagos',
      bio: 'Senior real estate consultant and verified agent at NIMI KINGS LTD.',
    },
  });

  // 3c. Customer (customer@nimikingsltd.com)
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@nimikingsltd.com' },
    update: {
      passwordHash: commonPasswordHash,
      status: 'ACTIVE',
    },
    create: {
      firstName: 'Emeka',
      lastName: 'Okonkwo',
      email: 'customer@nimikingsltd.com',
      phone: '+2348000000003',
      passwordHash: commonPasswordHash,
      status: 'ACTIVE',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: customerUser.id, roleId: dbRoles[RoleType.CUSTOMER].id } },
    update: {},
    create: { userId: customerUser.id, roleId: dbRoles[RoleType.CUSTOMER].id },
  });

  await prisma.customerProfile.upsert({
    where: { userId: customerUser.id },
    update: {
      occupation: 'Tech Entrepreneur & Private Investor',
      address: 'Plot 8, Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      kycStatus: 'VERIFIED',
      idType: 'NIN',
      idNumber: '12345678901',
      kycSubmittedAt: new Date(),
      kycReviewedAt: new Date(),
    },
    create: {
      userId: customerUser.id,
      occupation: 'Tech Entrepreneur & Private Investor',
      address: 'Plot 8, Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      kycStatus: 'VERIFIED',
      idType: 'NIN',
      idNumber: '12345678901',
      kycSubmittedAt: new Date(),
      kycReviewedAt: new Date(),
    },
  });

  console.log('✅ Testing Accounts configured (Password: Password123!):');
  console.log(`   - Admin:    ${adminUser.email}`);
  console.log(`   - Agent:    ${agentUser.email}`);
  console.log(`   - Customer: ${customerUser.email}`);

  // 4. Properties
  // Property 1: Lekki Royal Crest Smart Villa
  let prop1 = await prisma.property.findUnique({ where: { propertyCode: 'NK-PROP-001' } });
  if (!prop1) {
    prop1 = await prisma.property.create({
      data: {
        propertyCode: 'NK-PROP-001',
        title: 'Lekki Royal Crest Smart Villa',
        description: 'Exquisite 5-bedroom detached contemporary villa with smart automation, private infinity pool, and rooftop terrace.',
        propertyType: PropertyType.HOUSE,
        bedrooms: 5,
        bathrooms: 6,
        parkingSpaces: 4,
        landSize: '650',
        landSizeUnit: 'sqm',
        address: 'Plot 12 Admiralty Way, Lekki Phase 1',
        city: 'Lekki',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: '6.4474',
        longitude: '3.4723',
        createdById: adminUser.id,
        listings: {
          create: {
            listingType: ListingType.SALE,
            price: '220000000',
            currency: 'NGN',
            paymentPlanAvailable: true,
            status: ListingStatus.PUBLISHED,
            publishedAt: new Date(),
            createdById: adminUser.id,
          },
        },
        features: {
          create: [
            { featureId: dbFeatures['Swimming Pool'].id },
            { featureId: dbFeatures['Smart Home Automation'].id },
            { featureId: dbFeatures['CCTV Surveillance'].id },
            { featureId: dbFeatures['24/7 Electricity'].id },
          ],
        },
        media: {
          create: [
            {
              type: 'IMAGE',
              url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
              storageKey: 'properties/lekki-royal-crest-1.jpg',
              isPrimary: true,
              sortOrder: 1,
            },
            {
              type: 'IMAGE',
              url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
              storageKey: 'properties/lekki-royal-crest-2.jpg',
              isPrimary: false,
              sortOrder: 2,
            },
          ],
        },
      },
    });
  }

  // Property 2: Maitama Diplomatic Residences
  let prop2 = await prisma.property.findUnique({ where: { propertyCode: 'NK-PROP-002' } });
  if (!prop2) {
    prop2 = await prisma.property.create({
      data: {
        propertyCode: 'NK-PROP-002',
        title: 'Maitama Diplomatic Residences',
        description: 'Palatial 6-bedroom ambassadorial mansion set within exclusive diplomatic enclave in Maitama Hills, Abuja.',
        propertyType: PropertyType.HOUSE,
        bedrooms: 6,
        bathrooms: 7,
        parkingSpaces: 6,
        landSize: '1200',
        landSizeUnit: 'sqm',
        address: '14 Rhine Street, Maitama',
        city: 'Abuja',
        state: 'FCT',
        country: 'Nigeria',
        latitude: '9.0882',
        longitude: '7.4934',
        createdById: adminUser.id,
        listings: {
          create: {
            listingType: ListingType.SALE,
            price: '450000000',
            currency: 'NGN',
            paymentPlanAvailable: false,
            status: ListingStatus.PUBLISHED,
            publishedAt: new Date(),
            createdById: adminUser.id,
          },
        },
        features: {
          create: [
            { featureId: dbFeatures['Swimming Pool'].id },
            { featureId: dbFeatures['Solar Power'].id },
            { featureId: dbFeatures['CCTV Surveillance'].id },
          ],
        },
        media: {
          create: [
            {
              type: 'IMAGE',
              url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
              storageKey: 'properties/maitama-mansion-1.jpg',
              isPrimary: true,
              sortOrder: 1,
            },
          ],
        },
      },
    });
  }

  // Property 3: Epe Greenfields Agro-Commercial Park
  let prop3 = await prisma.property.findUnique({ where: { propertyCode: 'NK-PROP-003' } });
  if (!prop3) {
    prop3 = await prisma.property.create({
      data: {
        propertyCode: 'NK-PROP-003',
        title: 'Epe Greenfields Agro-Commercial Park',
        description: 'Prime 100-hectare agricultural and agro-allied commercial land with direct access to expressway, perennial stream, and rich fertile soil.',
        propertyType: PropertyType.FARM,
        bedrooms: 0,
        bathrooms: 0,
        parkingSpaces: 10,
        landSize: '100',
        landSizeUnit: 'hectares',
        address: 'Kilometer 15, Itoikin Road, Epe',
        city: 'Epe',
        state: 'Lagos',
        country: 'Nigeria',
        latitude: '6.5841',
        longitude: '3.9835',
        createdById: adminUser.id,
        listings: {
          create: {
            listingType: ListingType.INVESTMENT,
            price: '85000000',
            currency: 'NGN',
            paymentPlanAvailable: true,
            status: ListingStatus.PUBLISHED,
            publishedAt: new Date(),
            createdById: adminUser.id,
          },
        },
        features: {
          create: [
            { featureId: dbFeatures['Perimeter Fencing & Security Post'].id },
            { featureId: dbFeatures['Paved Access Roads'].id },
            { featureId: dbFeatures['Treated Water Supply / Borehole'].id },
          ],
        },
        media: {
          create: [
            {
              type: 'IMAGE',
              url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
              storageKey: 'properties/epe-agro-1.jpg',
              isPrimary: true,
              sortOrder: 1,
            },
          ],
        },
      },
    });
  }
  console.log('✅ Properties seeded.');

  // 5. Property Verification Record for Prop 1
  await prisma.propertyVerification.upsert({
    where: { propertyId: prop1.id },
    update: {
      status: VerificationStatus.VERIFIED,
      riskLevel: RiskLevel.LOW,
      remarks: 'Governor Consent and Registered Survey Plan verified at Lagos State Lands Bureau.',
    },
    create: {
      propertyId: prop1.id,
      verificationCode: 'VRF-PROP-001',
      status: VerificationStatus.VERIFIED,
      riskLevel: RiskLevel.LOW,
      remarks: 'Governor Consent and Registered Survey Plan verified at Lagos State Lands Bureau.',
      reviewedById: adminUser.id,
      completedAt: new Date(),
    },
  });

  // 6. Customer Engagement: Saved Property & Saved Search
  await prisma.savedProperty.upsert({
    where: { userId_propertyId: { userId: customerUser.id, propertyId: prop1.id } },
    update: {},
    create: { userId: customerUser.id, propertyId: prop1.id },
  });

  const existingSearch = await prisma.savedSearch.findFirst({
    where: { userId: customerUser.id, title: 'Lekki Luxury Duplexes' },
  });
  if (!existingSearch) {
    await prisma.savedSearch.create({
      data: {
        userId: customerUser.id,
        title: 'Lekki Luxury Duplexes',
        propertyType: PropertyType.HOUSE,
        listingType: ListingType.SALE,
        city: 'Lekki',
        state: 'Lagos',
        minPrice: 150000000,
        maxPrice: 300000000,
        bedrooms: 4,
        notifyEmail: true,
        notifyPush: true,
      },
    });
  }

  // 7. Agent Assignments & Relationships
  await prisma.propertyAgent.upsert({
    where: { propertyId_agentId: { propertyId: prop1.id, agentId: agentUser.id } },
    update: { status: 'ACTIVE' },
    create: { propertyId: prop1.id, agentId: agentUser.id, status: 'ACTIVE', assignedBy: adminUser.id },
  });

  await prisma.customerAgent.upsert({
    where: { customerId_agentId: { customerId: customerUser.id, agentId: agentUser.id } },
    update: { status: 'ACTIVE' },
    create: { customerId: customerUser.id, agentId: agentUser.id, status: 'ACTIVE' },
  });

  // 8. Site Inspection & Enquiry
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 2);
  scheduledDate.setHours(11, 0, 0, 0);

  const existingInspection = await prisma.propertyInspection.findFirst({
    where: { propertyId: prop1.id, customerId: customerUser.id },
  });
  if (!existingInspection) {
    await prisma.propertyInspection.create({
      data: {
        propertyId: prop1.id,
        customerId: customerUser.id,
        agentId: agentUser.id,
        scheduledAt: scheduledDate,
        status: InspectionStatus.SCHEDULED,
        location: 'Plot 12 Admiralty Way, Lekki Phase 1',
        notes: 'Customer requested physical VIP viewing of the penthouse suite and infinity pool.',
      },
    });
  }

  const existingEnquiry = await prisma.propertyEnquiry.findFirst({
    where: { propertyId: prop2.id, customerId: customerUser.id },
  });
  if (!existingEnquiry) {
    await prisma.propertyEnquiry.create({
      data: {
        propertyId: prop2.id,
        customerId: customerUser.id,
        agentId: agentUser.id,
        type: 'PURCHASE_REQUEST',
        message: 'Hello, I am interested in acquiring this Maitama property. Can you share payment breakdown and diplomatic clearance?',
        status: 'IN_PROGRESS',
      },
    });
  }
  console.log('✅ Customer engagement, enquiries & inspections seeded.');

  // 9. Customer Transactions (links customer to projects and farms)
  const tx1 = await prisma.transaction.upsert({
    where: { transactionReference: 'NK-TX-2026-001' },
    update: {},
    create: {
      transactionReference: 'NK-TX-2026-001',
      customerId: customerUser.id,
      propertyId: prop1.id,
      agentId: agentUser.id,
      type: TransactionType.PROPERTY_PURCHASE,
      status: TransactionStatus.SUCCESSFUL,
      amount: '50000000',
      currency: 'NGN',
    },
  });

  const tx2 = await prisma.transaction.upsert({
    where: { transactionReference: 'NK-TX-2026-002' },
    update: {},
    create: {
      transactionReference: 'NK-TX-2026-002',
      customerId: customerUser.id,
      propertyId: prop3.id,
      agentId: agentUser.id,
      type: TransactionType.PROPERTY_PURCHASE,
      status: TransactionStatus.SUCCESSFUL,
      amount: '20000000',
      currency: 'NGN',
    },
  });
  console.log('✅ Transactions seeded.');

  // 10. Construction Project Tracking
  let project1 = await prisma.constructionProject.findUnique({
    where: { projectCode: 'NK-PRJ-001' },
  });

  if (!project1) {
    project1 = await prisma.constructionProject.create({
      data: {
        projectCode: 'NK-PRJ-001',
        name: 'Royal Palm Residences - Phase 2',
        description: 'Turnkey development of luxury 5-bedroom smart homes with communal recreation facility in Lekki Phase 1.',
        propertyId: prop1.id,
        projectManagerId: adminUser.id,
        status: ProjectStatus.IN_PROGRESS,
        startDate: new Date('2026-01-10'),
        expectedEndDate: new Date('2026-11-30'),
        budget: '350000000',
      },
    });

    // Milestones
    const m1 = await prisma.constructionMilestone.create({
      data: {
        projectId: project1.id,
        name: 'Site Clearing, Excavation & Substructure Foundation',
        description: 'Raft foundation, soil treatment, and ground water proofing.',
        sequence: 1,
        percentage: '20.00',
        status: ProjectStatus.COMPLETED,
        completedAt: new Date('2026-02-28'),
      },
    });

    const m2 = await prisma.constructionMilestone.create({
      data: {
        projectId: project1.id,
        name: 'Reinforced Concrete Superstructure & Blockwork',
        description: 'First & second floor suspended slabs, columns, and exterior masonry.',
        sequence: 2,
        percentage: '35.00',
        status: ProjectStatus.COMPLETED,
        completedAt: new Date('2026-06-15'),
      },
    });

    const m3 = await prisma.constructionMilestone.create({
      data: {
        projectId: project1.id,
        name: 'Roofing Structure, Waterproofing & External Cladding',
        description: 'Steel roof trusses, bituminous membrane, stone-coated metal shingles.',
        sequence: 3,
        percentage: '25.00',
        status: ProjectStatus.IN_PROGRESS,
      },
    });

    const m4 = await prisma.constructionMilestone.create({
      data: {
        projectId: project1.id,
        name: 'MEP Services, Interior Finishes & Smart Home Fitting',
        description: 'Electrical conduits, plumbing rough-ins, porcelain tiles, sanitary fittings.',
        sequence: 4,
        percentage: '20.00',
        status: ProjectStatus.PLANNED,
      },
    });

    // Progress Update
    await prisma.projectUpdate.create({
      data: {
        projectId: project1.id,
        milestoneId: m3.id,
        createdById: adminUser.id,
        title: 'Roofing Structure Complete; Shingle Installation Underway',
        description: 'The structural steel roof trusses have been successfully installed and signed off by the structural engineer. Waterproofing underlayment complete.',
        progressPercentage: '65.00',
        media: {
          create: [
            {
              type: 'IMAGE',
              url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?auto=format&fit=crop&w=1200&q=80',
              storageKey: 'construction/update-roofing-1.jpg',
            },
          ],
        },
      },
    });

    // Expenses
    await prisma.projectExpense.create({
      data: {
        projectId: project1.id,
        category: 'materials',
        description: 'High-grade Portland cement (600 bags) & 16mm TMT rebar delivery',
        amount: '28500000',
        currency: 'NGN',
        recordedById: adminUser.id,
      },
    });
    await prisma.projectExpense.create({
      data: {
        projectId: project1.id,
        category: 'labour',
        description: 'Site iron-benders, carpenters and concrete placement crew payroll (Month 5)',
        amount: '8200000',
        currency: 'NGN',
        recordedById: adminUser.id,
      },
    });
  }
  console.log('✅ Construction projects seeded.');

  // 11. Agriculture Asset Management
  let farm1 = await prisma.farm.findUnique({
    where: { farmCode: 'NK-FRM-001' },
  });

  if (!farm1) {
    farm1 = await prisma.farm.create({
      data: {
        farmCode: 'NK-FRM-001',
        name: 'Emerald Valley Agro Estate',
        description: '100-hectare integrated agro estate focused on grain cultivation, cassava root production, and commercial livestock feeds.',
        propertyId: prop3.id,
        farmManagerId: adminUser.id,
        totalArea: '100.00',
        areaUnit: AreaUnit.HECTARES,
        status: FarmStatus.ACTIVE,
        state: 'Lagos',
        city: 'Epe',
        country: 'Nigeria',
        latitude: '6.5841',
        longitude: '3.9835',
      },
    });

    // Crop Cycles
    const cycle1 = await prisma.cropCycle.create({
      data: {
        farmId: farm1.id,
        cycleCode: 'CC-2026-MAIZE-01',
        cropName: 'Hybrid Yellow Maize (SAMMAZ 52)',
        variety: 'Drought-tolerant early maturity',
        allocatedArea: '40.00',
        areaUnit: AreaUnit.HECTARES,
        stage: CropStage.VEGETATIVE_GROWTH,
        startDate: new Date('2026-01-15'),
        expectedHarvestDate: new Date('2026-05-30'),
        targetYield: '160.00',
        yieldUnit: 'tons',
        estimatedBudget: '18500000',
      },
    });

    const cycle2 = await prisma.cropCycle.create({
      data: {
        farmId: farm1.id,
        cycleCode: 'CC-2026-CASSAVA-01',
        cropName: 'Vitamin-A Yellow Cassava (TME 419)',
        variety: 'High starch root variety',
        allocatedArea: '35.00',
        areaUnit: AreaUnit.HECTARES,
        stage: CropStage.PLANTING,
        startDate: new Date('2026-02-01'),
        expectedHarvestDate: new Date('2026-12-15'),
        targetYield: '350.00',
        yieldUnit: 'tons',
        estimatedBudget: '22000000',
      },
    });

    // Agronomic Field Log
    await prisma.cropFieldLog.create({
      data: {
        cropCycleId: cycle1.id,
        recordedById: adminUser.id,
        title: 'Weekly Soil Moisture & Health Inspection',
        notes: 'Canopy closure observed across Sector A. Root growth vigorous, pest scouting indicates zero armyworm presence. Applied organic foliar micronutrient blend.',
        stage: CropStage.VEGETATIVE_GROWTH,
        weatherCondition: 'Sunny, 31C',
        soilCondition: 'Moist, pH 6.4',
        growthPercentage: '45.00',
      },
    });

    // Harvest Record
    await prisma.harvestRecord.create({
      data: {
        cropCycleId: cycle1.id,
        recordedById: adminUser.id,
        harvestDate: new Date(),
        quantity: '24.50',
        unit: 'tons',
        qualityGrade: QualityGrade.GRADE_A,
        storageLocation: 'Emerald Valley Silo Complex #2',
        notes: 'Early sample harvest batch meeting moisture standards (13.5%).',
        estimatedValue: '7840000',
        currency: 'NGN',
      },
    });

    // Farm Financials
    await prisma.farmExpense.create({
      data: {
        farmId: farm1.id,
        cropCycleId: cycle1.id,
        recordedById: adminUser.id,
        category: 'EQUIPMENT_RENTAL',
        description: 'Tractor land clearing, ploughing, and harrowing contract (40 Hectares)',
        amount: '3500000',
        currency: 'NGN',
        expenseDate: new Date('2026-01-20'),
      },
    });

    await prisma.farmRevenue.create({
      data: {
        farmId: farm1.id,
        recordedById: adminUser.id,
        buyerName: 'Premier Feedmills Nig Ltd',
        produceSold: 'Early Maize Harvest Off-take Wholesale Contract (Batch 1)',
        quantity: '24.50',
        unit: 'tons',
        unitPrice: '320000',
        totalAmount: '7840000',
        currency: 'NGN',
        saleDate: new Date(),
      },
    });
  }
  console.log('✅ Agriculture asset management seeded.');

  // 12. Real-Time Chat & Notifications
  let conversation = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: customerUser.id } } },
        { participants: { some: { userId: agentUser.id } } },
      ],
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [
            { userId: customerUser.id },
            { userId: agentUser.id },
          ],
        },
        messages: {
          create: [
            {
              senderId: customerUser.id,
              content: 'Hello Agent Tunde, I submitted an inspection request for Lekki Royal Crest Villa.',
              messageType: MessageType.TEXT,
            },
            {
              senderId: agentUser.id,
              content: 'Hello Mr. Emeka! I received it. The inspection is scheduled for Thursday at 11:00 AM.',
              messageType: MessageType.TEXT,
            },
            {
              senderId: customerUser.id,
              content: 'Perfect, looking forward to meeting on site!',
              messageType: MessageType.TEXT,
            },
          ],
        },
      },
    });
  }

  // Notifications
  await prisma.notification.create({
    data: {
      userId: customerUser.id,
      type: NotificationType.INSPECTION_REMINDER,
      title: 'Site Inspection Scheduled',
      message: 'Your inspection for Lekki Royal Crest Villa has been confirmed for Thursday at 11:00 AM with Agent Tunde Balogun.',
    },
  });

  await prisma.notification.create({
    data: {
      userId: agentUser.id,
      type: NotificationType.GENERAL,
      title: 'New Inspection Lead',
      message: 'You have been assigned to conduct an on-site property inspection with client Emeka Okonkwo.',
    },
  });

  console.log('✅ Real-time chat & notifications seeded.');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during test seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
