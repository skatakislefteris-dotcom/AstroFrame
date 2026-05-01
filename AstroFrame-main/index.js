import 'dotenv/config'; // Φορτώνει τα κρυφά κλειδιά από το .env
import { createClient } from '@supabase/supabase-js';
import './src/app.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Αρχικοποίηση του client ΜΟΝΟ αν υπάρχουν τα κλειδιά, για να μην κρασάρει τίποτα
export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

if (!supabase) {
    console.warn("⚠️ Supabase credentials not found in .env. Web syncing is disabled.");
}