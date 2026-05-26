// =======================================================
// PIPELINE / LEADS MODULE
// =======================================================

async function renderPipeline(container) {
    try {
        const leads = await Store.getAll('pipeline');
        container.innerHTML = `
        <div class="module-header">
            <h1>Pipeline</h1>
            <button class="btn btn-primary" onclick="openPipelineForm()">+ New Lead</button>
        </div>

        <!-- Pipeline Stage Summary -->
        <div class="pipeline-stages">
            ${['Discovery', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'].map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage);
                const stageValue = stageLeads.reduce((s, l) => s + (parseFloat(l.estimatedValue) || 0), 0);
                return `<div class="pipeline-stage-card ${stage === 'Won' ? 'stage-won' : stage === 'Lost' ? 'stage-lost' : ''}">
                    <div class="stage-count">${stageLeads.length}</div>
                    <div class="stage-name">${stage}</div>
                    <div class="stage-value">${formatCurrency(stageValue)}</div>
                </div>`;
            }).join('')}
        </div>

        ${buildTable(
            [
                { label: 'Client / Prospect', key: 'clientName' },
                { label: 'Contact', key: 'contactName' },
                { label: 'Mission Type', key: 'missionType' },
                { label: 'Est. Value', key: 'estimatedValue', format: 'currency' },
                { label: 'Probability', key: 'probability' },
                { label: 'Stage', key: 'stage', format: 'status' },
                { label: 'Follow-up', key: 'nextFollowUp' },
            ],
            leads.map(l => ({ ...l, probability: (l.probability || 0) + '%' })),
            row => `
                <button class="btn btn-xs" onclick="openPipelineForm('${row.id}')">Edit</button>
                <button class="btn btn-xs btn-danger" onclick="deletePipelineLead('${row.id}')">Del</button>
            `
        )}
        `;
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error</h2><p>${err.message}</p></div>`;
    }
}

function openPipelineForm(id) {
    const isEdit = !!id;
    const title = isEdit ? 'Edit Lead' : 'New Lead';

    if (isEdit) {
        Store.getById('pipeline', id).then(lead => {
            showPipelineModal(title, lead);
        });
    } else {
        showPipelineModal(title, {});
    }
}

function showPipelineModal(title, lead) {
    const stages = ['Discovery', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
    const missionTypes = ['Ferry', 'Repossession', 'Technical Audit', 'Acceptance Flight', 'Multiple'];
    const sources = ['Referral', 'Cold Outreach', 'Website', 'Conference', 'Repeat Client', 'Other'];

    openModal(title, `
        <form onsubmit="savePipelineLead(event, '${lead.id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Client / Prospect Name*</label><input type="text" name="clientName" value="${lead.clientName || ''}" required></div>
                <div class="form-group"><label>Contact Name</label><input type="text" name="contactName" value="${lead.contactName || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Contact Email</label><input type="email" name="contactEmail" value="${lead.contactEmail || ''}"></div>
                <div class="form-group"><label>Source</label><select name="source">${sources.map(s => `<option ${lead.source === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Mission Type</label><select name="missionType">${missionTypes.map(t => `<option ${lead.missionType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                <div class="form-group"><label>Stage</label><select name="stage">${stages.map(s => `<option ${lead.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Estimated Value ($)</label><input type="number" name="estimatedValue" value="${lead.estimatedValue || ''}" min="0"></div>
                <div class="form-group"><label>Probability (%)</label><input type="number" name="probability" value="${lead.probability || ''}" min="0" max="100"></div>
            </div>
            <div class="form-group"><label>Next Follow-up</label><input type="date" name="nextFollowUp" value="${lead.nextFollowUp || ''}"></div>
            <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${lead.notes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Lead</button>
            </div>
        </form>
    `);
}

async function savePipelineLead(e, id) {
    e.preventDefault();
    const form = e.target;
    const data = {
        clientName: form.clientName.value,
        contactName: form.contactName.value,
        contactEmail: form.contactEmail.value,
        source: form.source.value,
        missionType: form.missionType.value,
        stage: form.stage.value,
        estimatedValue: parseFloat(form.estimatedValue.value) || 0,
        probability: parseInt(form.probability.value) || 0,
        nextFollowUp: form.nextFollowUp.value,
        notes: form.notes.value,
    };

    try {
        if (id) { await Store.update('pipeline', id, data); }
        else { await Store.add('pipeline', data); }
        closeModal();
        showToast(id ? 'Lead updated.' : 'Lead added.');
        navigateTo('pipeline');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deletePipelineLead(id) {
    if (!confirm('Delete this lead?')) return;
    await Store.remove('pipeline', id);
    showToast('Lead deleted.');
    navigateTo('pipeline');
}
