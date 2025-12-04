console.log(process.env);
export const supabaseConfig = {
    url: import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
};
