// ============================================================
// SUPABASE CONFIGURATION
// ------------------------------------------------------------
// The CRM's data lives in Supabase (Postgres). Login stays on
// Firebase — we pass the signed-in user's Firebase ID token to
// Supabase so its Row-Level Security policies recognise them.
// Requires supabase-js (loaded in index.html) and firebase-config.js.
// ============================================================

const SUPABASE_URL = 'https://ffqfqhioccjwbjgzvnrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmcWZxaGlvY2Nqd2JqZ3p2bnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTIxODIsImV4cCI6MjA5NTc4ODE4Mn0.F7EXXaI44o7pDY73aTib3oqkRe1DtT5QuLRcpzIju7s';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => {
        try {
            const u = firebase.auth().currentUser;
            return u ? await u.getIdToken(false) : null;
        } catch (e) {
            return null;
        }
    }
});
