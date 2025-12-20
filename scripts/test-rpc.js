
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple env parser
function loadEnv(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const config = {};
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                config[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, ''); // remove quotes
            }
        });
        return config;
    } catch (e) {
        return {};
    }
}

const envPath = path.resolve(process.cwd(), '.env');
console.log('Loading env from:', envPath);
const env = loadEnv(envPath);

const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Could not find Supabase credentials in .env or .env.local');
    process.exit(1);
}

console.log('Testing RPC with URL:', supabaseUrl);
// console.log('Key length:', supabaseKey.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    const email = 'worker1@showroom2.com'; // Known seeded user
    console.log(`Looking up showroom for: ${email}`);

    const { data, error } = await supabase.rpc('get_showroom_details_by_email', {
        lookup_email: email
    });

    if (error) {
        console.error('RPC Error:', error);
        console.error('Details:', JSON.stringify(error, null, 2));
        if (error.code === '42883') {
            console.error("Function does not exist. Migration likely not applied.");
        }
    } else {
        console.log('RPC Success. Data:', data);
    }
}

testRpc();
