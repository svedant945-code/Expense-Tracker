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
  const tables = [
    'users',
    'transactions',
    'categories',
    'budgets',
    'accounts',
    'income_goals',
    'user_preferences',
    'recurring_transactions',
    'savings_goals',
    'notifications',
  ];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`GRANT ALL ON public.${table} TO service_role;`);
    console.log(`Granted ALL on public.${table} to service_role`);
  }

  console.log('All permissions granted');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });