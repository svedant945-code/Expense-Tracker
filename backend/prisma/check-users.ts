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
  const users = await prisma.user.findMany();
  console.log('Users:', JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });