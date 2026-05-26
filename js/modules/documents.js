// ============================================================
// DOCUMENTS MODULE
// ============================================================

async function renderDocuments(container) {
    try {
        const docs = await Store.getAll('documents');
        container.innerHTML = `
        <div class="module-header">
            <h1>Documents</h1>
            <button class="btn btn-primary" onclick="openDocForm()">+ Add Document Record</button>
        </div>

        <div class="filter-tabs">
            <button class="filter-tab active" onclick="filterDocs(this, 'all')">All (${docs.length})</button>
            <button class="filter-tab" onclick="filterDocs(this, 'SOW')">SOW (${docs.filter(d=>d.docType==='SOW').length})</button>
            <button class="filter-tab" onclick="filterDocs(this, 'Insurance Certificate')">Insurance (${docs.filter(d=>d.docType==='Insurance Certificate').length})</button>
            <button class="filter-tab" onclick="filterDocs(this, 'Audit Report')">Audit Reports (${docs.filter(d=>d.docType==='Audit Report').length})</button>
            <button class="filter-tab" onclick="filterDocs(this, 'MSA')">MSA (${docs.filter(d=>d.docType==='MSA').length})</button>
            <button class="filter-tab" onclick="filterDocs(this, 'NDA')">NDA (${docs.filter(d=>d.docType==='NDA').length})</button>
        </div>

        <div id="docs-table">
        ${buildTable(
            [
                { label: 'Document Type', key: 'docType' },
                { label: 'Title / Reference', key: 'title' },
                { label: 'Client', key: 'clientName' },
                { label: 'Mission / Tail #', key: 'missionRef' },
                { label: 'Date', key: 'docDate' },
                { label: 'Expiry', key: 'expiryDate' },
                { label: 'Status', key: 'status', format: 'status' },
            ],
            docs,
            row => `
                <button class="btn btn-xs" onclick="viewDoc('${row.id}')">View</button>
                <button class="btn btn-xs" onclick="openDocForm('${row.id}')">Edit</button>
                <button class="btn btn-xs btn-danger" onclick="deleteDoc('${row.id}')">Del</button>
            `
        )}
        </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error</h2><p>${err.message}</p></div>`;
    }
}

function filterDocs(btn, type) {
    document.querySelectorAll('.filter-tabs .filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const rows = document.querySelectorAll('#docs-table tbody tr');
    rows.forEach(row => {
        if (type === 'all') { row.style.display = ''; return; }
        const cellText = row.querySelector('td')?.textContent || '';
        row.style.display = cellText.trim() === type ? '' : 'none';
    });
}

async function viewDoc(id) {
    const doc = await Store.getById('documents', id);
    if (!doc) return;
    openModal(doc.title || doc.docType, `
        <div class="detail-grid">
            <div class="detail-section">
                <div class="detail-row"><span class="detail-label">Type:</span><span>${doc.docType}</span></div>
                <div class="detail-row"><span class="detail-label">Title:</span><span>${doc.title || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Client:</span><span>${doc.clientName || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Mission Ref:</span><span>${doc.missionRef || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Date:</span><span>${doc.docDate || '\u2014'}</span></div>
                <div class="detail-row"><span class="detail-label">Expiry:</span><span>${doc.expiryDate || 'N/A'}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span>${statusBadge(doc.status)}</div>
                ${doc.coverageLimits ? `<div class="detail-row"><span class="detail-label">Coverage Limits:</span><span>${doc.coverageLimits}</span></div>` : ''}
                ${doc.additionalInsured ? `<div class="detail-row"><span class="detail-label">Additional Insured:</span><span>${doc.additionalInsured}</span></div>` : ''}
                ${doc.notes ? `<div class="detail-row"><span class="detail-label">Notes:</span><span>${doc.notes}</span></div>` : ''}
            </div>
        </div>
    `);
}

function openDocForm(id) {
    if (id) {
        Store.getById('documents', id).then(doc => showDocModal('Edit Document', doc));
    } else {
        showDocModal('Add Document Record', {});
    }
}

function showDocModal(title, doc) {
    const types = ['SOW', 'MSA', 'NDA', 'Insurance Certificate', 'Audit Report', 'Trip Report', 'Fuel Reconciliation', 'Bill of Sale', 'Court Order', 'Other'];
    const statuses = ['draft', 'pending', 'active', 'signed', 'expired', 'cancelled'];

    openModal(title, `
        <form onsubmit="saveDoc(event, '${doc.id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Document Type*</label><select name="docType" onchange="toggleInsuranceFields(this.value)">${types.map(t => `<option ${doc.docType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                <div class="form-group"><label>Status</label><select name="status">${statuses.map(s => `<option ${doc.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Title / Reference*</label><input type="text" name="title" value="${doc.title || ''}" required placeholder="e.g. SOW-2026-017 Ferry N451FN"></div>
            <div class="form-row">
                <div class="form-group"><label>Client</label><input type="text" name="clientName" value="${doc.clientName || ''}"></div>
                <div class="form-group"><label>Mission / Tail #</label><input type="text" name="missionRef" value="${doc.missionRef || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Document Date</label><input type="date" name="docDate" value="${doc.docDate || ''}"></div>
                <div class="form-group"><label>Expiry Date</label><input type="date" name="expiryDate" value="${doc.expiryDate || ''}"></div>
            </div>
            <div id="insurance-fields" style="display:${doc.docType === 'Insurance Certificate' ? 'block' : 'none'}">
                <div class="form-group"><label>Coverage Limits</label><input type="text" name="coverageLimits" value="${doc.coverageLimits || ''}" placeholder="$10M hull / $100M liability"></div>
                <div class="form-group"><label>Additional Insured Parties</label><input type="text" name="additionalInsured" value="${doc.additionalInsured || ''}"></div>
            </div>
            <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${doc.notes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Document</button>
            </div>
        </form>
    `);
}

function toggleInsuranceFields(type) {
    const el = document.getElementById('insurance-fields');
    if (el) el.style.display = type === 'Insurance Certificate' ? 'block' : 'none';
}

async function saveDoc(e, id) {
    e.preventDefault();
    const f = e.target;
    const data = {
        docType: f.docType.value,
        status: f.status.value,
        title: f.title.value,
        clientName: f.clientName.value,
        missionRef: f.missionRef.value,
        docDate: f.docDate.value,
        expiryDate: f.expiryDate.value,
        coverageLimits: f.coverageLimits?.value || '',
        additionalInsured: f.additionalInsured?.value || '',
        notes: f.notes.value,
    };
    try {
        if (id) { await Store.update('documents', id, data); }
        else { await Store.add('documents', data); }
        closeModal();
        showToast(id ? 'Document updated.' : 'Document recorded.');
        navigateTo('documents');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteDoc(id) {
    if (!confirm('Delete this document record?')) return;
    await Store.remove('documents', id);
    showToast('Document deleted.');
    navigateTo('documents');
}
