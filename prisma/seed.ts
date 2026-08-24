import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default roles
  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: 'Standard user with basic access',
    },
  });
  console.log('✓ Created role: user');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'Administrator with full system access',
    },
  });
  console.log('✓ Created role: admin');

  const moderatorRole = await prisma.role.upsert({
    where: { name: 'moderator' },
    update: {},
    create: {
      name: 'moderator',
      description: 'Moderator with content management access',
    },
  });
  console.log('✓ Created role: moderator');

  // Create test admin user
  const adminEmail = 'admin@example.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
      },
    });

    // Assign admin role
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    });
    console.log(`✓ Created admin user: ${adminEmail}`);
  } else {
    console.log(`⊘ Admin user already exists: ${adminEmail}`);
  }

  // Create test regular user
  const userEmail = 'autotest@example.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const testUser = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: hashedPassword,
      },
    });

    // Assign user role
    await prisma.userRole.create({
      data: {
        userId: testUser.id,
        roleId: userRole.id,
      },
    });
    console.log(`✓ Created test user: ${userEmail}`);
  } else {
    console.log(`⊘ Test user already exists: ${userEmail}`);
  }

  console.log('🌱 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
