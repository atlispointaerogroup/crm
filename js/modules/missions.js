// ============================================================
// MISSIONS MODULE
// ============================================================

async function renderMissions(container) {
    try {
        const missions = await Store.getAll('missions');
        container.innerHTML = `
        <div class="module-header">
            <h1>Missions</h1>
            <button class="btn btn-primary" onclick="openMissionForm()">+ New Mission</button>
        </div>

        <!-- Mission type filter tabs -->
        <div class="filter-tabs">
            <button class="filter-tab active" onclick="filterMissions(this, 'all')">All (${missions.length})</button>
            <button class="filter-tab" onclick="filterMissions(this, 'Ferry')">Ferry (${missions.filter(m=>m.type==='Ferry').length})</button>
            <button class="filter-tab" onclick="filterMissions(this, 'Repossession')">Repo (${missions.filter(m=>m.type==='Repossession').length})</button>
            <button class="filter-tab" onclick="filterMissions(this, 'Technical Audit')">Tech Audit (${missions.filter(m=>m.type==='Technical Audit').length})</button>
            <button class="filter-tab" onclick="filterMissions(this, 'Acceptance Flight')">Acceptance (${missions.filter(m=>m.type==='Acceptance Flight').length})</button>
        </div>

        <div id="missions-table">
        ${buildTable(
            [
                { label: 'Type', key: 'type' },
                { label: 'Client', key: 'clientName' },
                { label: 'Aircraft', key: 'aircraft' },
                { label: 'Tail #', key: 'tailNumber' },
                { label: 'Route', key: '_route' },
                { label: 'Crew', key: 'assignedCrew' },
                { label: 'Est. Cost', key: 'estimatedCost', format: 'currency' },
                { label: 'Status', key: 'status', format: 'status' },
            ],
            missions.map(m => ({ ...m, _route: `${m.departure || '?'} \u2192 ${m.destination || '?'}` })),
            row => `
                <button class="btn btn-xs" onclick="viewMission('${row.id}')">View</button>
                <button class="btn btn-xs" onclick="openMissionForm('${row.id}')">Edit</button>
                <button class="btn btn-xs btn-danger" onclick="deleteMission('${row.id}')">Del</button>
            `
        )}
        </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error</h2><p>${err.message}</p></div>`;
    }
}

function filterMissions(btn, type) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const rows = document.querySelectorAll('#missions-table tbody tr');
    rows.forEach(row => {
        if (type === 'all') { row.style.display = ''; return; }
        const cellText = row.querySelector('td')?.textContent || '';
        row.style.display = cellText.trim() === type ? '' : 'none';
    });
}

async function viewMission(id) {
    const m = await Store.getById('missions', id);
    if (!m) return;
    openModal(`${m.type}: ${m.tailNumber || 'TBD'}`, `
        <div class="detail-grid">
            <div class="detail-section">
                <h4>Mission Details</h4>
                <div class="detail-row"><span class="detail-label">Type:</span><span>${m.type}</span></div>
                <div class="detail-row"><span class="detail-label">Client:</span><span>${m.clientName}</span></div>
                <div class="detail-row"><span class="detail-label">Aircraft:</span><span>${m.aircraft || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Tail Number:</span><span>${m.tailNumber || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Route:</span><span>${m.departure || '?'} \u2192 ${m.destination || '?'}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span>${statusBadge(m.status)}</div>
            </div>
            <div class="detail-section">
                <h4>Operations</h4>
                <div class="detail-row"><span class="detail-label">Assigned Crew:</span><span>${m.assignedCrew || 'TBD'}</span></div>
                <div class="detail-row"><span class="detail-label">Est. Block Hours:</span><span>${m.estimatedHours || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Est. Cost:</span><span>${formatCurrency(m.estimatedCost || 0)}</span></div>
                <div class="detail-row"><span class="detail-label">Oceanic:</span><span>${m.oceanic ? 'Yes' : 'No'}</span></div>
                <div class="detail-row"><span class="detail-label">Risk Tier:</span><span>${m.riskTier || 'Standard'}</span></div>
                <div class="detail-row"><span class="detail-label">Notes:</span><span>${m.notes || '\u2014'}</span></div>
            </div>
        </div>
        <div class="detail-section" style="margin-top:1rem;">
            <h4>Cost Breakdown</h4>
            <div class="cost-grid">
                <div class="cost-item"><span>Fuel (est.)</span><span>${formatCurrency(m.costFuel || 0)}</span></div>
                <div class="cost-item"><span>Crew Compensation</span><span>${formatCurrency(m.costCrew || 0)}</span></div>
                <div class="cost-item"><span>Positioning / Travel</span><span>${formatCurrency(m.costPositioning || 0)}</span></div>
                <div class="cost-item"><span>Handling / Permits</span><span>${formatCurrency(m.costHandling || 0)}</span></div>
                <div class="cost-item"><span>Insurance Binder</span><span>${formatCurrency(m.costInsurance || 0)}</span></div>
                <div class="cost-item"><span>Contingency Reserve</span><span>${formatCurrency(m.costContingency || 0)}</span></div>
                <div class="cost-item cost-total"><span>Management Fee</span><span>${formatCurrency(m.managementFee || 0)}</span></div>
            </div>
        </div>
    `);
}

function openMissionForm(id) {
    if (id) {
        Store.getById('missions', id).then(m => showMissionModal('Edit Mission', m));
    } else {
        showMissionModal('New Mission', {});
    }
}

function showMissionModal(title, m) {
    const types = ['Ferry', 'Repossession', 'Technical Audit', 'Acceptance Flight'];
    const statuses = ['planning', 'active', 'completed', 'cancelled'];
    const riskTiers = ['Standard', 'Elevated', 'High \u2014 International', 'High \u2014 Repo'];

    openModal(title, `
        <form onsubmit="saveMission(event, '${m.id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Mission Type*</label><select name="type">${types.map(t => `<option ${m.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                <div class="form-group"><label>Status</label><select name="status">${statuses.map(s => `<option ${m.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Client Name*</label><input type="text" name="clientName" value="${m.clientName || ''}" required></div>
            <div class="form-row">
                <div class="form-group"><label>Aircraft (Make/Model)</label><input type="text" name="aircraft" value="${m.aircraft || ''}" placeholder="e.g. Cessna Citation CJ3+"></div>
                <div class="form-group"><label>Tail Number</label><input type="text" name="tailNumber" value="${m.tailNumber || ''}" placeholder="e.g. N451FN"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Departure (ICAO)</label><input type="text" name="departure" value="${m.departure || ''}" placeholder="KTEB" maxlength="4"></div>
                <div class="form-group"><label>Destination (ICAO)</label><input type="text" name="destination" value="${m.destination || ''}" placeholder="KSDL" maxlength="4"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Assigned Crew</label><input type="text" name="assignedCrew" value="${m.assignedCrew || ''}"></div>
                <div class="form-group"><label>Risk Tier</label><select name="riskTier">${riskTiers.map(r => `<option ${m.riskTier === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Est. Block Hours</label><input type="number" name="estimatedHours" value="${m.estimatedHours || ''}" step="0.1" min="0"></div>
                <div class="form-group"><label>Oceanic?</label><select name="oceanic"><option ${!m.oceanic ? 'selected' : ''}>No</option><option ${m.oceanic ? 'selected' : ''}>Yes</option></select></div>
            </div>
            <h4 style="margin:1rem 0 0.5rem;">Cost Estimate</h4>
            <div class="form-row">
                <div class="form-group"><label>Fuel</label><input type="number" name="costFuel" value="${m.costFuel || ''}" min="0"></div>
                <div class="form-group"><label>Crew Comp.</label><input type="number" name="costCrew" value="${m.costCrew || ''}" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Positioning</label><input type="number" name="costPositioning" value="${m.costPositioning || ''}" min="0"></div>
                <div class="form-group"><label>Handling/Permits</label><input type="number" name="costHandling" value="${m.costHandling || ''}" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Insurance Binder</label><input type="number" name="costInsurance" value="${m.costInsurance || ''}" min="0"></div>
                <div class="form-group"><label>Contingency</label><input type="number" name="costContingency" value="${m.costContingency || ''}" min="0"></div>
            </div>
            <div class="form-group"><label>Management Fee</label><input type="number" name="managementFee" value="${m.managementFee || ''}" min="0"></div>
            <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${m.notes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Mission</button>
            </div>
        </form>
    `);
}

async function saveMission(e, id) {
    e.preventDefault();
    const f = e.target;
    const costs = {
        costFuel: parseFloat(f.costFuel.value) || 0,
        costCrew: parseFloat(f.costCrew.value) || 0,
        costPositioning: parseFloat(f.costPositioning.value) || 0,
        costHandling: parseFloat(f.costHandling.value) || 0,
        costInsurance: parseFloat(f.costInsurance.value) || 0,
        costContingency: parseFloat(f.costContingency.value) || 0,
        managementFee: parseFloat(f.managementFee.value) || 0,
    };
    const estimatedCost = Object.values(costs).reduce((a, b) => a + b, 0);

    const data = {
        type: f.type.value,
        status: f.status.value,
        clientName: f.clientName.value,
        aircraft: f.aircraft.value,
        tailNumber: f.tailNumber.value.toUpperCase(),
        departure: f.departure.value.toUpperCase(),
        destination: f.destination.value.toUpperCase(),
        assignedCrew: f.assignedCrew.value,
        riskTier: f.riskTier.value,
        estimatedHours: parseFloat(f.estimatedHours.value) || 0,
        oceanic: f.oceanic.value === 'Yes',
        estimatedCost,
        ...costs,
        notes: f.notes.value,
    };

    try {
        if (id) { await Store.update('missions', id, data); }
        else { await Store.add('missions', data); }
        closeModal();
        showToast(id ? 'Mission updated.' : 'Mission created.');
        navigateTo('missions');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteMission(id) {
    if (!confirm('Delete this mission?')) return;
    await Store.remove('missions', id);
    showToast('Mission deleted.');
    navigateTo('missions');
}
