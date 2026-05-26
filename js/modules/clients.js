// =======================================================
// CLIENTS MODULE
// =======================================================

async function renderClients(container) {
    try {
        const clients = await Store.getAll('clients');
        container.innerHTML = `
        <div class="module-header">
            <h1>Clients</h1>
            <button class="btn btn-primary" onclick="openClientForm()">+ New Client</button>
        </div>
        ${buildTable(
            [
                { label: 'Client Name', key: 'name' },
                { label: 'Type', key: 'type' },
                { label: 'Contact', key: 'contactName' },
                { label: 'Email', key: 'contactEmail' },
                { label: 'Phone', key: 'contactPhone' },
                { label: 'Status', key: 'status', format: 'status' },
            ],
            clients,
            row => `
                <button class="btn btn-xs" onclick="viewClient('${row.id}')">View</button>
                <button class="btn btn-xs" onclick="openClientForm('${row.id}')">Edit</button>
                <button class="btn btn-xs btn-danger" onclick="deleteClient('${row.id}')">Del</button>
            `
        )}
        `;
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error</h2><p>${err.message}</p></div>`;
    }
}

async function viewClient(id) {
    const client = await Store.getById('clients', id);
    if (!client) return;
    const missions = await Store.query('missions', 'clientName', '==', client.name);
    const invoices = await Store.query('invoices', 'clientName', '==', client.name);

    openModal(client.name, `
        <div class="detail-grid">
            <div class="detail-section">
                <h4>Client Information</h4>
                <div class="detail-row"><span class="detail-label">Type:</span><span>${client.type || 'â'}</span></div>
                <div class="detail-row"><span class="detail-label">Contact:</span><span>${client.contactName || 'â'}</span></div>
                <div class="detail-row"><span class="detail-label">Email:</span><span>${client.contactEmail || 'â'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone:</span><span>${client.contactPhone || 'â'}</span></div>
                <div class="detail-row"><span class="detail-label">Address:</span><span>${client.address || 'â'}</span></div>
                <div class="detail-row"><span class="detail-label">Status:</span>${statusBadge(client.status)}</div>
                <div class="detail-row"><span class="detail-label">Notes:</span><span>${client.notes || 'â'}</span></div>
            </div>
            <div class="detail-section">
                <h4>Mission History (${missions.length})</h4>
                ${missions.length === 0 ? '<p class="text-muted">No missions on record.</p>' :
                missions.map(m => `<div class="activity-item">
                    <div class="activity-details">
                        <div class="activity-title">${m.type}: ${m.aircraft || m.tailNumber}</div>
                        <div class="activity-meta">${m.departure} â ${m.destination} &middot; ${statusBadge(m.status)}</div>
                    </div>
                </div>`).join('')}
            </div>
        </div>
    `);
}

function openClientForm(id) {
    const isEdit = !!id;
    if (isEdit) {
        Store.getById('clients', id).then(client => showClientModal('Edit Client', client));
    } else {
        showClientModal('New Client', {});
    }
}

function showClientModal(title, client) {
    const types = ['Bank', 'Lessor', 'Bankruptcy Trustee', 'Aircraft Owner', 'Broker', 'MRO', 'Other'];
    const statuses = ['active', 'inactive', 'prospect'];

    openModal(title, `
        <form onsubmit="saveClient(event, '${client.id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Client Name*</label><input type="text" name="name" value="${client.name || ''}" required></div>
                <div class="form-group"><label>Type*</label><select name="type">${types.map(t => `<option ${client.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Contact Name</label><input type="text" name="contactName" value="${client.contactName || ''}"></div>
                <div class="form-group"><label>Status</label><select name="status">${statuses.map(s => `<option ${client.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Contact Email</label><input type="email" name="contactEmail" value="${client.contactEmail || ''}"></div>
                <div class="form-group"><label>Contact Phone</label><input type="text" name="contactPhone" value="${client.contactPhone || ''}"></div>
            </div>
            <div class="form-group"><label>Address</label><input type="text" name="address" value="${client.address || ''}"></div>
            <div class="form-group"><label>Notes</label><textarea name="notes" rows="3">${client.notes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Client</button>
            </div>
        </form>
    `);
}

async function saveClient(e, id) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        type: form.type.value,
        contactName: form.contactName.value,
        contactEmail: form.contactEmail.value,
        contactPhone: form.contactPhone.value,
        address: form.address.value,
        status: form.status.value,
        notes: form.notes.value,
    };
    try {
        if (id) { await Store.update('clients', id, data); }
        else { await Store.add('clients', data); }
        closeModal();
        showToast(id ? 'Client updated.' : 'Client added.');
        navigateTo('clients');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteClient(id) {
    if (!confirm('Delete this client? This cannot be undone.')) return;
    await Store.remove('clients', id);
    showToast('Client deleted.');
    navigateTo('clients');
}
