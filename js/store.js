// ============================================================
// DATA STORE — Firestore CRUD abstraction
// ============================================================

const Store = {
    // ---------- Generic CRUD ----------
    async getAll(collection) {
        const snap = await db.collection(collection).orderBy('updatedAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async getById(collection, id) {
        const doc = await db.collection(collection).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async add(collection, data) {
        const now = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection(collection).add({
            ...data,
            createdAt: now,
            updatedAt: now
        });
        return ref.id;
    },

    async update(collection, id, data) {
        await db.collection(collection).doc(id).update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    async remove(collection, id) {
        await db.collection(collection).doc(id).delete();
    },

    async query(collection, field, operator, value) {
        const snap = await db.collection(collection).where(field, operator, value).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // ---------- Users & Roles ----------
    // Ensures a profile doc exists for the signed-in user. New users are
    // self-provisioned as 'member' (the security rules forbid self-assigning
    // 'admin'). Returns the user's profile { id, email, role }.
    async ensureUserDoc(user) {
        const ref = db.collection('users').doc(user.uid);
        const doc = await ref.get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        }
        await ref.set({
            email: user.email,
            role: 'member',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { id: user.uid, email: user.email, role: 'member' };
    },

    async getMyRole(uid) {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? (doc.data().role || 'member') : 'member';
    },

    async getUsers() {
        const snap = await db.collection('users').orderBy('email').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // Admin-only (enforced by Firestore rules): change a user's role.
    async setUserRole(uid, role) {
        await db.collection('users').doc(uid).update({
            role,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
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

    // ---------- Seed demo data ----------
    async seedDemoData() {
        const clientsSnap = await db.collection('clients').limit(1).get();
        if (!clientsSnap.empty) return; // Already seeded

        const now = firebase.firestore.FieldValue.serverTimestamp();

        // Demo clients
        const demoClients = [
            { name: 'First National Aviation Finance', type: 'Bank', contactName: 'Sarah Mitchell', contactEmail: 'smitchell@fnavfinance.com', contactPhone: '(212) 555-0142', address: 'New York, NY', notes: 'Tier 1 account. Handles fleet of 40+ turboprops and light jets.', status: 'active' },
            { name: 'Pacific Leasing Corp', type: 'Lessor', contactName: 'James Chen', contactEmail: 'jchen@pacificlease.com', contactPhone: '(415) 555-0198', address: 'San Francisco, CA', notes: 'Specializes in King Air and Citation leases. 3 active repos pending.', status: 'active' },
            { name: 'Meridian Trust Bank', type: 'Bank', contactName: 'Robert Walsh', contactEmail: 'rwalsh@meridiantrust.com', contactPhone: '(404) 555-0177', address: 'Atlanta, GA', notes: 'New prospect. Interested in ferry and technical audit services.', status: 'active' },
        ];

        for (const c of demoClients) {
            await db.collection('clients').add({ ...c, createdAt: now, updatedAt: now });
        }

        // Demo crew
        const demoCrew = [
            { name: 'Captain David Torres', email: 'dtorres@aviatormail.com', phone: '(610) 555-0133', certifications: 'ATP, CFI, CFII', typeRatings: 'CE-525, CE-560, BE-200', medicalExpiry: '2027-03-15', status: 'available', homeBase: 'KPHL', notes: 'Primary ferry pilot. 8,000+ hours. Oceanic experienced.' },
            { name: 'Captain Lisa Park', email: 'lpark@aviatormail.com', phone: '(305) 555-0166', certifications: 'ATP, MEI', typeRatings: 'CE-750, LR-JET, GV', medicalExpiry: '2026-11-30', status: 'available', homeBase: 'KMIA', notes: 'Heavy jet specialist. RVSM and oceanic current. 12,000+ hours.' },
            { name: 'Captain Mike Henderson', email: 'mhenderson@aviatormail.com', phone: '(972) 555-0188', certifications: 'ATP, A&P', typeRatings: 'BE-200, BE-300, CE-525', medicalExpiry: '2027-01-20', status: 'on_mission', homeBase: 'KDFW', notes: 'Also holds A&P. Excellent for technical audit + ferry combos.' },
        ];

        for (const c of demoCrew) {
            await db.collection('crew').add({ ...c, createdAt: now, updatedAt: now });
        }

        // Demo missions
        const demoMissions = [
            { type: 'Ferry', clientName: 'First National Aviation Finance', aircraft: 'Cessna Citation CJ3+ (N451FN)', tailNumber: 'N451FN', departure: 'KTEB', destination: 'KSDL', status: 'active', assignedCrew: 'Captain David Torres', estimatedHours: 5.2, estimatedCost: 18500, notes: 'Reposition after lease return inspection. Standard domestic ferry.' },
            { type: 'Repossession', clientName: 'Pacific Leasing Corp', aircraft: 'Beechcraft King Air 350 (N802PL)', tailNumber: 'N802PL', departure: 'MMTO', destination: 'KSAT', status: 'planning', assignedCrew: 'TBD', estimatedHours: 4.8, estimatedCost: 32000, notes: 'International repo. Mexico. Requires customs coordination and security assessment.' },
            { type: 'Technical Audit', clientName: 'Meridian Trust Bank', aircraft: 'Gulfstream G280 (N119MT)', tailNumber: 'N119MT', departure: 'KPDK', destination: 'KPDK', status: 'planning', assignedCrew: 'Captain Mike Henderson', estimatedHours: 0, estimatedCost: 8500, notes: 'Pre-purchase technical records audit. Back-to-birth review requested by buyer.' },
        ];

        for (const m of demoMissions) {
            await db.collection('missions').add({ ...m, createdAt: now, updatedAt: now });
        }

        // Demo pipeline
        const demoPipeline = [
            { clientName: 'SunTrust Aviation', contactName: 'Karen O\'Brien', contactEmail: 'kobrien@suntrustaviation.com', source: 'Referral', stage: 'Proposal Sent', missionType: 'Ferry', estimatedValue: 22000, probability: 60, notes: 'Referred by First National. 2x Citation repositions.', nextFollowUp: '2026-06-01' },
            { clientName: 'Atlas Equipment Finance', contactName: 'Dan Morales', contactEmail: 'dmorales@atlaseqfin.com', source: 'Cold Outreach', stage: 'Discovery', missionType: 'Repossession', estimatedValue: 45000, probability: 30, notes: 'New prospect. Has 3 distressed assets in Central America.', nextFollowUp: '2026-05-28' },
        ];

        for (const p of demoPipeline) {
            await db.collection('pipeline').add({ ...p, createdAt: now, updatedAt: now });
        }

        console.log('Demo data seeded successfully.');
    }
};
