"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const connectionString = process.env.DIRECT_URL;
if (!connectionString)
    throw new Error('DIRECT_URL must be set in backend/.env.');
const prisma = new client_1.PrismaClient({
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
        await prisma.$executeRawUnsafe(`ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`);
        console.log(`Disabled RLS on ${table}`);
    }
    console.log('All RLS disabled');
}
main()
    .catch(console.error)
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=disable-rls-final.js.map