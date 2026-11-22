import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DIRECT_URL;
if (!connectionString) throw new Error('DIRECT_URL must be set in backend/.env.');


const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

async function main() {
  // Try inserting a test user directly
  const user = await prisma.user.create({
    data: {
      id: 'test-user-' + Date.now(),
      email: 'direct-test@example.com',
      name: 'Direct Test',
      role: 'USER',
    }
  });
  console.log('Created user:', user);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });