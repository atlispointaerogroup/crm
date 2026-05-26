// ============================================================
// INVOICING MODULE
// ============================================================

async function renderInvoicing(container) {
    try {
        const invoices = await Store.getAll('invoices');
        const totalPending = invoices.filter(i => i.status === 'pending' || i.status === 'sent').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
        const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

        container.innerHTML = `
        <div class="module-header">
            <h1>Invoicing</h1>
            <button class="btn btn-primary" onclick="openInvoiceForm()">+ New Invoice</button>
        </div>

        <div class="kpi-grid kpi-grid-3">
            <div class="kpi-card">
                <div class="kpi-data">
                    <div class="kpi-value">${formatCurrency(totalPending)}</div>
                    <div class="kpi-label">Outstanding</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-data">
                    <div class="kpi-value">${formatCurrency(totalPaid)}</div>
                    <div class="kpi-label">Collected (all time)</div>
                </div>
            </div>
            <div class="kpi-card">
                <div class="kpi-data">
                    <div class="kpi-value">${invoices.length}</div>
                    <div class="kpi-label">Total Invoices</div>
                </div>
            </div>
        </div>

        ${buildTable(
            [
                { label: 'Invoice #', key: 'invoiceNumber' },
                { label: 'Client', key: 'clientName' },
                { label: 'Mission / Tail #', key: 'missionRef' },
                { label: 'Pass-Through', key: 'passThrough', format: 'currency' },
                { label: 'Mgmt Fee', key: 'managementFee', format: 'currency' },
                { label: 'Total', key: 'total', format: 'currency' },
                { label: 'Deposit Rcvd', key: 'depositReceived', format: 'currency' },
                { label: 'Status', key: 'status', format: 'status' },
                { label: 'Date', key: 'invoiceDate' },
            ],
            invoices,
            row => `
                <button class="btn btn-xs" onclick="viewInvoice('${row.id}')">View</button>
                <button class="btn btn-xs" onclick="openInvoiceForm('${row.id}')">Edit</button>
                <button class="btn btn-xs btn-danger" onclick="deleteInvoice('${row.id}')">Del</button>
            `
        )}
        `;
    } catch (err) {
        container.innerHTML = `<div class="module-empty"><h2>Error</h2><p>${err.message}</p></div>`;
    }
}

async function viewInvoice(id) {
    const inv = await Store.getById('invoices', id);
    if (!inv) return;
    const balance = (parseFloat(inv.total) || 0) - (parseFloat(inv.depositReceived) || 0);

    openModal(`Invoice ${inv.invoiceNumber || ''}`, `
        <div class="invoice-preview">
            <div class="invoice-header-block">
                <div>
                    <h3>AtlisPoint Aero Group, LLC</h3>
                    <p>Montgomery County, PA</p>
                </div>
                <div style="text-align:right;">
                    <div class="invoice-number">${inv.invoiceNumber || 'DRAFT'}</div>
                    <div>${inv.invoiceDate || '\u2014'}</div>
                    ${statusBadge(inv.status)}
                </div>
            </div>
            <div class="detail-row"><span class="detail-label">Bill To:</span><span>${inv.clientName}</span></div>
            <div class="detail-row"><span class="detail-label">Mission Ref:</span><span>${inv.missionRef || '\u2014'}</span></div>

            <h4 style="margin-top:1rem;">Cost Summary</h4>
            <div class="cost-grid">
                <div class="cost-item"><span>Pass-Through Expenses</span><span>${formatCurrency(inv.passThrough || 0)}</span></div>
                <div class="cost-item"><span>Management Fee</span><span>${formatCurrency(inv.managementFee || 0)}</span></div>
                <div class="cost-item cost-total"><span>Total</span><span>${formatCurrency(inv.total || 0)}</span></div>
                <div class="cost-item"><span>Deposit Received</span><span>- ${formatCurrency(inv.depositReceived || 0)}</span></div>
                <div class="cost-item cost-total"><span>Balance Due</span><span>${formatCurrency(balance)}</span></div>
            </div>
            ${inv.notes ? `<div style="margin-top:1rem;"><strong>Notes:</strong> ${inv.notes}</div>` : ''}
            ${inv.lineItems ? `<div style="margin-top:1rem;"><strong>Line Items:</strong><pre style="font-size:0.85rem;white-space:pre-wrap;">${inv.lineItems}</pre></div>` : ''}
        </div>
    `);
}

function openInvoiceForm(id) {
    if (id) {
        Store.getById('invoices', id).then(inv => showInvoiceModal('Edit Invoice', inv));
    } else {
        const num = 'AP-' + Date.now().toString().slice(-6);
        showInvoiceModal('New Invoice', { invoiceNumber: num, invoiceDate: new Date().toISOString().slice(0,10) });
    }
}

function showInvoiceModal(title, inv) {
    const statuses = ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'];
    openModal(title, `
        <form onsubmit="saveInvoice(event, '${inv.id || ''}')">
            <div class="form-row">
                <div class="form-group"><label>Invoice #</label><input type="text" name="invoiceNumber" value="${inv.invoiceNumber || ''}"></div>
                <div class="form-group"><label>Date</label><input type="date" name="invoiceDate" value="${inv.invoiceDate || ''}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Client Name*</label><input type="text" name="clientName" value="${inv.clientName || ''}" required></div>
                <div class="form-group"><label>Status</label><select name="status">${statuses.map(s => `<option ${inv.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Mission Reference / Tail #</label><input type="text" name="missionRef" value="${inv.missionRef || ''}" placeholder="Ferry N451FN KTEB\u2192KSDL"></div>
            <div class="form-row">
                <div class="form-group"><label>Pass-Through Expenses ($)</label><input type="number" name="passThrough" value="${inv.passThrough || ''}" min="0" oninput="calcInvoiceTotal()"></div>
                <div class="form-group"><label>Management Fee ($)</label><input type="number" name="managementFee" value="${inv.managementFee || ''}" min="0" oninput="calcInvoiceTotal()"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Total</label><input type="number" name="total" value="${inv.total || ''}" min="0" id="invoice-total-field" readonly></div>
                <div class="form-group"><label>Deposit Received ($)</label><input type="number" name="depositReceived" value="${inv.depositReceived || ''}" min="0"></div>
            </div>
            <div class="form-group"><label>Line Item Details</label><textarea name="lineItems" rows="4" placeholder="Fuel: $4,200\nCrew: $3,500\nHandling: $800\n...">${inv.lineItems || ''}</textarea></div>
            <div class="form-group"><label>Notes</label><textarea name="notes" rows="2">${inv.notes || ''}</textarea></div>
            <div class="form-actions">
                <button type="button" class="btn" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Invoice</button>
            </div>
        </form>
    `);
}

function calcInvoiceTotal() {
    const pt = parseFloat(document.querySelector('[name="passThrough"]')?.value) || 0;
    const mf = parseFloat(document.querySelector('[name="managementFee"]')?.value) || 0;
    const field = document.getElementById('invoice-total-field');
    if (field) field.value = pt + mf;
}

async function saveInvoice(e, id) {
    e.preventDefault();
    const f = e.target;
    const pt = parseFloat(f.passThrough.value) || 0;
    const mf = parseFloat(f.managementFee.value) || 0;
    const data = {
        invoiceNumber: f.invoiceNumber.value,
        invoiceDate: f.invoiceDate.value,
        clientName: f.clientName.value,
        status: f.status.value,
        missionRef: f.missionRef.value,
        passThrough: pt,
        managementFee: mf,
        total: pt + mf,
        depositReceived: parseFloat(f.depositReceived.value) || 0,
        lineItems: f.lineItems.value,
        notes: f.notes.value,
    };
    try {
        if (id) { await Store.update('invoices', id, data); }
        else { await Store.add('invoices', data); }
        closeModal();
        showToast(id ? 'Invoice updated.' : 'Invoice created.');
        navigateTo('invoicing');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteInvoice(id) {
    if (!confirm('Delete this invoice?')) return;
    await Store.remove('invoices', id);
    showToast('Invoice deleted.');
    navigateTo('invoicing');
}
