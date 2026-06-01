// ============================================================
// DATA STORE — Supabase (Postgres) CRUD abstraction
// ------------------------------------------------------------
// Login is handled by Firebase; CRM data lives in Supabase.
// Uses the global `sb` (Supabase client) from supabase-config.js.
// Each business table stores its record fields in a JSONB `data`
// column, so the rest of the app keeps working unchanged.
// ============================================================

function _rowToObj(r) {
    return Object.assign({ id: r.id, createdAt: r.created_at, updatedAt: r.updated_at }, r.data || {});
}

const Store = {
    // ---------- Generic CRUD ----------
    async getAll(collection) {
        const { data, error } = await sb.from(collection).select('*').order('updated_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(_rowToObj);
    },

    async getById(collection, id) {
        const { data, error } = await sb.from(collection).select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        return data ? _rowToObj(data) : null;
    },

    async add(collection, payload) {
        const { data, error } = await sb.from(collection).insert({ data: payload }).select('id');
        if (error) throw error;
        return data && data[0] ? data[0].id : null;
    },

    async update(collection, id, patch) {
        const { data: cur, error: e1 } = await sb.from(collection).select('data').eq('id', id).maybeSingle();
        if (e1) throw e1;
        const merged = Object.assign({}, (cur && cur.data) ? cur.data : {}, patch);
        const { error } = await sb.from(collection).update({ data: merged, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
    },

    async remove(collection, id) {
        const { error } = await sb.from(collection).delete().eq('id', id);
        if (error) throw error;
    },

    async query(collection, field, operator, value) {
        let q = sb.from(collection).select('*');
        const col = 'data->>' + field;
        if (operator === '!=') q = q.neq(col, value);
        else q = q.eq(col, value);
        const { data, error } = await q;
        if (error) throw error;
        return (data || []).map(_rowToObj);
    },

    // ---------- Users & Roles ----------
    async ensureUserDoc(user) {
        const { data, error } = await sb.from('users').select('*').eq('id', user.uid).maybeSingle();
        if (error) throw error;
        if (data) return { id: data.id, email: data.email, role: data.role || 'member' };
        const { error: e2 } = await sb.from('users').insert({ id: user.uid, email: user.email, role: 'member' });
        if (e2) throw e2;
        return { id: user.uid, email: user.email, role: 'member' };
    },

    async getMyRole(uid) {
        const { data } = await sb.from('users').select('role').eq('id', uid).maybeSingle();
        return data ? (data.role || 'member') : 'member';
    },

    async getUsers() {
        const { data, error } = await sb.from('users').select('*').order('email');
        if (error) throw error;
        return (data || []).map(u => ({ id: u.id, email: u.email, role: u.role, createdAt: u.created_at }));
    },

    async setUserRole(uid, role) {
        const { error } = await sb.from('users').update({ role: role, updated_at: new Date().toISOString() }).eq('id', uid);
        if (error) throw error;
    },

    // ---------- Domain-specific helpers ----------
    async getDashboardStats() {
        const [clients, missions, crew, invoices, pipeline] = await Promise.all([
            this.getAll('clients'),
            this.getAll('missions'),
            this.getAll('crew'),
            this.getAll('invoices'),
            this.getAll('pipeline')
        ]);

        const activeMissions = missions.filter(m => m.status === 'active' || m.status === 'planning');
        const availableCrew = crew.filter(c => c.status === 'available');
        const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'sent');
        const totalPipelineValue = pipeline.reduce((sum, p) => sum + (parseFloat(p.estimatedValue) || 0), 0);
        const pendingInvoiceTotal = pendingInvoices.reduce((sum, i) => sum + (parseFloat(i.total) || 0), 0);

        return {
            totalClients: clients.length,
            activeMissions: activeMissions.length,
            availableCrew: availableCrew.length,
            totalCrew: crew.length,
            pendingInvoices: pendingInvoices.length,
            pendingInvoiceTotal,
            pipelineValue: totalPipelineValue,
            pipelineCount: pipeline.length,
            recentMissions: missions.slice(0, 5),
            recentPipeline: pipeline.slice(0, 5)
        };
    },

    // ---------- Seed demo data (only when the database is empty) ----------
    async seedDemoData() {
        const { data: existing } = await sb.from('clients').select('id').limit(1);
        if (existing && existing.length) return; // Already has data

        const demoClients = [
            { name: 'First National Aviation Finance', type: 'Bank', contactName: 'Sarah Mitchell', contactEmail: 'smitchell@fnavfinance.com', contactPhone: '(212) 555-0142', address: 'New York, NY', notes: 'Tier 1 account. Handles fleet of 40+ turboprops and light jets.', status: 'active' },
            { name: 'Pacific Leasing Corp', type: 'Lessor', contactName: 'James Chen', contactEmail: 'jchen@pacificlease.com', contactPhone: '(415) 555-0198', address: 'San Francisco, CA', notes: 'Specializes in King Air and Citation leases. 3 active repos pending.', status: 'active' },
            { name: 'Meridian Trust Bank', type: 'Bank', contactName: 'Robert Walsh', contactEmail: 'rwalsh@meridiantrust.com', contactPhone: '(404) 555-0177', address: 'Atlanta, GA', notes: 'New prospect. Interested in ferry and technical audit services.', status: 'active' }
        ];
        const demoCrew = [
            { name: 'Captain David Torres', email: 'dtorres@aviatormail.com', phone: '(610) 555-0133', certifications: 'ATP, CFI, CFII', typeRatings: 'CE-525, CE-560, BE-200', medicalExpiry: '2027-03-15', status: 'available', homeBase: 'KPHL', notes: 'Primary ferry pilot. 8,000+ hours. Oceanic experienced.' },
            { name: 'Captain Lisa Park', email: 'lpark@aviatormail.com', phone: '(305) 555-0166', certifications: 'ATP, MEI', typeRatings: 'CE-750, LR-JET, GV', medicalExpiry: '2026-11-30', status: 'available', homeBase: 'KMIA', notes: 'Heavy jet specialist. RVSM and oceanic current. 12,000+ hours.' }
        ];
        const demoMissions = [
            { type: 'Ferry', clientName: 'First National Aviation Finance', aircraft: 'Cessna Citation CJ3+ (N451FN)', tailNumber: 'N451FN', departure: 'KTEB', destination: 'KSDL', status: 'active', assignedCrew: 'Captain David Torres', estimatedHours: 5.2, estimatedCost: 18500, notes: 'Reposition after lease return inspection. Standard domestic ferry.' }
        ];
        const demoPipeline = [
            { clientName: 'SunTrust Aviation', contactName: 'Karen O\'Brien', contactEmail: 'kobrien@suntrustaviation.com', source: 'Referral', stage: 'Proposal Sent', missionType: 'Ferry', estimatedValue: 22000, probability: 60, notes: 'Referred by First National. 2x Citation repositions.', nextFollowUp: '2026-06-01' }
        ];

        await sb.from('clients').insert(demoClients.map(d => ({ data: d })));
        await sb.from('crew').insert(demoCrew.map(d => ({ data: d })));
        await sb.from('missions').insert(demoMissions.map(d => ({ data: d })));
        await sb.from('pipeline').insert(demoPipeline.map(d => ({ data: d })));
        console.log('Demo data seeded successfully.');
    }
};
