"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.');
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceRoleKey);
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
        const { error } = await supabase.rpc('execute_sql', {
            sql: `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`
        });
        if (error) {
            throw new Error(`Failed to disable RLS on ${table}: ${error.message}`);
        }
        console.log(`Disabled RLS on ${table}`);
    }
    console.log('All RLS disabled');
}
main().catch((error) => {
    console.error('Failed to disable RLS:', error);
    process.exitCode = 1;
});
//# sourceMappingURL=disable-rls-final3.js.map