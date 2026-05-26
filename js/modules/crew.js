// ============================================================
// CREW MODULE
// ============================================================

async function renderCrew(container) {
    try {
        const crew = await Store.getAll('crew');
        container.innerHTML = `
        <div class="module-header">
            <h1>Crew Network</h1>
            <button class="btn btn-primary" onclick="openCrewForm()">+ Add Crew Member</button>
        </div>

        <div class="crew-summary">
            <div class="crew-stat"><span class="crew-stat-value">${crew.filter(c=>c.status==='available').length}</span><span class="crew-stat-label">Available</span></div>
            <div class="crew-stat"><span class="crew-stat-value">${crew.filter(c=>c.status==='on_mission').length}</span><span class="crew-stat-label">On Mission</span></div>
            <div class="crew-stat"><span class="crew-stat-value">${crew.filter(c=>c.status==='unavailable').length}</span><span class="crew-stat-label">Unavailable</span></div>
            <div class="crew-stat"><span class="crew-stat-value">${crew.length}</span><span class="crew-stat-label">Total</span></div>
        </div>

        <div class="crew-cards">
            ${crew.map(c => `
                <div class="crew-card">
                    <div class="crew-card-header">
                        <div class="crew-avatar">${(c.name || '??').split(' ').map(w=>w[0]).join('').substring(0,2)}</div>
                        <div>
                            <div class="crew-name">${c.name}</div>
                            <div class="crew-base">${c.homeBase || '\u2014'}</div>
                        </div>
                        ${statusBadge(c.status)}
                    </div>
                    <div class="crew-card-body">
                        <div class="crew-detail"><span>Certs:</span> ${c.certifications || '\u2014'}</div>
                        <div class="crew-detail"><span>Type Ratings:</span> ${c.typeRatings || '\u2014'}</div>
                        <div class="crew-detail"><span>Medical Exp:</span> ${c.medicalExpiry || '\u2014'}</div>
                        <div class="crew-detail"><span>Contact:</span> ${c.email || '\u2014'}</div>
                        ${c.notes ? `<div class="crew-notes">${c.notes}</div>` : ''}
                    </div>
                    <div class="crew-card-actions">
                        <button class="btn btn-xs" onclick="openCrewForm('${c.id}')">Edit</button>
                        <button class="btn btn-xs btn-danger" onclick="deleteCrew('${c.id}')">Remove</button>
                    </div>
                </div>
            `).join('')}
            ${crew.length === 0 ? '<p class="text-muted" style="grid-column:1/-1;text-align:center;padding:2rem;">No crew members yet. Add your first pilot above.</p>' : ''}
        </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error</h2><p>${err.message}</p></div>`;
    }
}

function openCrewForm(id) {
    if (id) {
        Store.getById('crew', id).then(c => showCrewModal('Edit Crew Member', c));
    } else {
        showCrewModal('Add Crew Member', {});
    }
}

function showCrewModal(title, c) {
    const statuses = ['available', 'on_mission', 'unavailable'];
    openModal(title, `
        <form onsubmit="saveCrew(event, '${c.id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Full Name*</label><input type="text" name="name" value="${c.name || ''}" required placeholder="Captain John Smith"></div>
                <div class="form-group"><label>Status</label><select name="status">${statuses.map(s => `<option ${c.status === s ? 'selected' : ''}>${s.replace(/_/g,' ')}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Email</label><input type="email" name="email" value="${c.email || ''}"></div>
                <div class="form-group"><label>Phone</label><input type="text" name="phone" value="${c.phone || ''}"></div>
            </div>
            <div class="form-group"><label>Home Base (ICAO)</label><input type="text" name="homeBase" value="${c.homeBase || ''}" placeholder="KPHL" maxlength="4"></div>
            <div class="form-group"><label>Certifications</label><input type="text" name="certifications" value="${c.certifications || ''}" placeholder="ATP, CFI, CFII, MEI, A&P"></div>
            <div class="form-group"><label>Type Ratings</label><input type="text" name="typeRatings" value="${c.typeRatings || ''}" placeholder="CE-525, CE-560, BE-200, LR-JET"></div>
            <div class="form-group"><label>Medical Certificate Expiry</label><input type="date" name="medicalExpiry" value="${c.medicalExpiry || ''}"></div>
            <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${c.notes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save</button>
            </div>
        </form>
    `);
}

async function saveCrew(e, id) {
    e.preventDefault();
    const f = e.target;
    const data = {
        name: f.name.value,
        status: f.status.value.replace(/ /g, '_'),
        email: f.email.value,
        phone: f.phone.value,
        homeBase: f.homeBase.value.toUpperCase(),
        certifications: f.certifications.value,
        typeRatings: f.typeRatings.value,
        medicalExpiry: f.medicalExpiry.value,
        notes: f.notes.value,
    };
    try {
        if (id) { await Store.update('crew', id, data); }
        else { await Store.add('crew', data); }
        closeModal();
        showToast(id ? 'Crew member updated.' : 'Crew member added.');
        navigateTo('crew');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteCrew(id) {
    if (!confirm('Remove this crew member?')) return;
    await Store.remove('crew', id);
    showToast('Crew member removed.');
    navigateTo('crew');
}
