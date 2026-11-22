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
    // Disable RLS for service role access
    await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
    console.log(`Disabled RLS on public.${table}`);
  }

  console.log('All RLS disabled');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });