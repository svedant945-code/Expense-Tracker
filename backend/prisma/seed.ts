import 'dotenv/config';
import { PrismaClient, TransactionType, AccountType } from '@prisma/client';

const connectionString = process.env.DIRECT_URL;
if (!connectionString) throw new Error('DIRECT_URL must be set in backend/.env.');


// Use direct connection for seeding (bypasses PgBouncer)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

async function main() {
  console.log('🌱 Seeding database...');

  // Default categories (system-wide, userId = null)
  const defaultCategories = [
    // Expense categories
    { name: 'Food', type: TransactionType.EXPENSE, icon: 'fa-utensils', color: '#ef4444', sortOrder: 1 },
    { name: 'Shopping', type: TransactionType.EXPENSE, icon: 'fa-bag-shopping', color: '#f59e0b', sortOrder: 2 },
    { name: 'Bills', type: TransactionType.EXPENSE, icon: 'fa-file-invoice', color: '#3b82f6', sortOrder: 3 },
    { name: 'Transport', type: TransactionType.EXPENSE, icon: 'fa-bus', color: '#8b5cf6', sortOrder: 4 },
    { name: 'Entertainment', type: TransactionType.EXPENSE, icon: 'fa-film', color: '#ec4899', sortOrder: 5 },
    { name: 'Healthcare', type: TransactionType.EXPENSE, icon: 'fa-heart-pulse', color: '#10b981', sortOrder: 6 },
    { name: 'Education', type: TransactionType.EXPENSE, icon: 'fa-book', color: '#f97316', sortOrder: 7 },
    { name: 'Others', type: TransactionType.EXPENSE, icon: 'fa-circle', color: '#64748b', sortOrder: 8 },

    // Income categories
    { name: 'Salary', type: TransactionType.INCOME, icon: 'fa-money-bill-wave', color: '#059669', sortOrder: 1 },
    { name: 'Freelance', type: TransactionType.INCOME, icon: 'fa-laptop-code', color: '#0891b2', sortOrder: 2 },
    { name: 'Investments', type: TransactionType.INCOME, icon: 'fa-chart-line', color: '#7c3aed', sortOrder: 3 },
    { name: 'Gifts', type: TransactionType.INCOME, icon: 'fa-gift', color: '#db2777', sortOrder: 4 },
    { name: 'Other Income', type: TransactionType.INCOME, icon: 'fa-plus-circle', color: '#64748b', sortOrder: 5 },
  ];

  console.log('📂 Creating default categories...');
  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, type: cat.type, userId: null },
    });
    if (!existing) {
      await prisma.category.create({
        data: {
          ...cat,
          userId: null,
          isDefault: true,
        },
      });
      console.log(`  ✅ Created: ${cat.name} (${cat.type})`);
    } else {
      console.log(`  ⏭️  Exists: ${cat.name} (${cat.type})`);
    }
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });