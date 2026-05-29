// ============================================================
// ADMIN MODULE — User & Role Management (admin-only)
// ------------------------------------------------------------
// Access to this module is gated three ways:
//   1. The Admin nav link is only shown to admins (UI convenience).
//   2. navigateTo('admin') re-checks the role before rendering.
//   3. REAL enforcement lives in firestore.rules — only admin
//      accounts can change roles or write admin-only data, so a
//      tampered client still cannot escalate privileges.
// ============================================================

// ---------- Small escaping helpers (defense-in-depth for text) ----------
function adminEscapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function adminEscapeAttr(str) {
    return adminEscapeHtml(str).replace(/`/g, '&#96;');
}

async function renderAdmin(content) {
    if (currentUserRole !== 'admin') {
        content.innerHTML = '<div class="module-empty"><h2>Access Denied</h2><p class="text-muted">You need admin privileges to view this page.</p></div>';
        return;
    }
    content.innerHTML = `
        <div class="module-header">
            <div>
                <h1>Admin</h1>
                <p class="module-subtitle">Manage users, roles, and access</p>
            </div>
            <button class="btn btn-primary" onclick="openAddUserModal()">+ Add User</button>
        </div>
        <div class="kpi-grid kpi-grid-3" id="admin-kpis"></div>
        <div class="card">
            <div class="card-header"><h3>Users &amp; Roles</h3></div>
            <div class="card-body" id="admin-users">
                <div class="loading-spinner"><div class="spinner"></div><p>Loading users...</p></div>
            </div>
        </div>
        <div class="card" style="margin-top:1rem;">
            <div class="card-header"><h3>Security Status</h3></div>
            <div class="card-body" id="admin-security"></div>
        </div>
    `;
    renderSecurityStatus();
    await loadAdminUsers();
}

function adminKpi(cls, value, label) {
    return `<div class="kpi-card">
        <div class="kpi-icon ${cls}"></div>
        <div><div class="kpi-value">${value}</div><div class="kpi-label">${label}</div></div>
    </div>`;
}

async function loadAdminUsers() {
    const el = document.getElementById('admin-users');
    if (!el) return;
    try {
        const users = await Store.getUsers();
        const adminCount = users.filter(u => u.role === 'admin').length;

        const kpis = document.getElementById('admin-kpis');
        if (kpis) {
            kpis.innerHTML =
                adminKpi('kpi-blue', users.length, 'Total Users') +
                adminKpi('kpi-green', adminCount, 'Admins') +
                adminKpi('kpi-amber', users.length - adminCount, 'Members');
        }

        const rows = users.map(u => {
            const isMe = currentUser && u.id === currentUser.uid;
            const email = adminEscapeHtml(u.email);
            const emailAttr = adminEscapeAttr(u.email);
            const roleBadge = u.role === 'admin'
                ? '<span class="badge badge-green">Admin</span>'
                : '<span class="badge badge-gray">Member</span>';

            let action;
            if (u.role === 'admin') {
                action = isMe
                    ? '<span class="text-muted" style="font-size:0.78rem;">Active admin</span>'
                    : `<button class="btn btn-xs" onclick="changeRole('${u.id}','member','${emailAttr}')">Set as Member</button>`;
            } else {
                action = `<button class="btn btn-xs btn-primary" onclick="changeRole('${u.id}','admin','${emailAttr}')">Make Admin</button>`;
            }

            return `<tr>
                <td>${email}${isMe ? ' <span class="text-muted" style="font-size:0.72rem;">(you)</span>' : ''}</td>
                <td>${roleBadge}</td>
                <td>${formatDate(u.createdAt)}</td>
                <td class="actions-cell">${action}</td>
            </tr>`;
        }).join('');

        el.innerHTML = `
            <div class="table-wrapper"><table>
                <thead><tr><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="4" class="table-empty">No users yet.</td></tr>'}</tbody>
            </table></div>`;
    } catch (e) {
        el.innerHTML = `<div class="module-empty">
            <p class="text-muted">Couldn't load users: ${adminEscapeHtml(e.message || 'unknown error')}</p>
            <p class="text-muted" style="font-size:0.8rem;">Make sure Firestore is created and the security rules from <code>firestore.rules</code> are deployed.</p>
        </div>`;
    }
}

async function changeRole(uid, role, email) {
    // Guardrail: never let an admin strip their own access (avoids lock-out).
    if (currentUser && uid === currentUser.uid && role !== 'admin') {
        showToast("You can't remove your own admin access.", 'error');
        return;
    }
    try {
        await Store.setUserRole(uid, role);
        showToast(`${email} is now ${role === 'admin' ? 'an Admin' : 'a Member'}.`);
        await loadAdminUsers();
        applyRoleVisibility();
    } catch (e) {
        showToast(e.message || 'Failed to update role.', 'error');
    }
}

function openAddUserModal() {
    openModal('Add User', `
        <p class="text-muted" style="font-size:0.85rem;margin-bottom:1rem;">
            Creates a login for a new team member. They sign in with this email and
            temporary password, then you can promote them to Admin below.
        </p>
        <div class="form-group">
            <label for="newuser-email">Email</label>
            <input type="email" id="newuser-email" placeholder="name@atlispoint.com" autocomplete="off">
        </div>
        <div class="form-group">
            <label for="newuser-pw">Temporary Password</label>
            <input type="password" id="newuser-pw" placeholder="At least 6 characters" autocomplete="new-password">
        </div>
        <div id="newuser-error" class="login-error"></div>
        <div class="form-actions">
            <button class="btn" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" id="newuser-btn" onclick="createUserAccount()">Create User</button>
        </div>
    `);
}

async function createUserAccount() {
    const email = document.getElementById('newuser-email').value.trim();
    const pw = document.getElementById('newuser-pw').value;
    const errEl = document.getElementById('newuser-error');
    const btn = document.getElementById('newuser-btn');
    errEl.textContent = '';

    if (!email) { errEl.textContent = 'Email is required.'; return; }
    if (pw.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

    btn.disabled = true;
    btn.textContent = 'Creating...';
    try {
        // Create the new login on a SECONDARY Firebase app so the admin's own
        // session is never disturbed (createUserWithEmailAndPassword would
        // otherwise sign the admin out and in as the new user).
        const secondary = firebase.apps.find(a => a.name === 'secondary')
            || firebase.initializeApp(firebaseConfig, 'secondary');
        const cred = await secondary.auth().createUserWithEmailAndPassword(email, pw);

        // Pre-create their profile as a member (admin write is allowed by rules).
        await db.collection('users').doc(cred.user.uid).set({
            email: email,
            role: 'member',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await secondary.auth().signOut();
        showToast(`User ${email} created.`);
        closeModal();
        await loadAdminUsers();
    } catch (e) {
        errEl.textContent = e.message || 'Could not create user.';
        btn.disabled = false;
        btn.textContent = 'Create User';
    }
}

function renderSecurityStatus() {
    const el = document.getElementById('admin-security');
    if (!el) return;
    el.innerHTML = `
        <div class="detail-row"><span class="detail-label">Authentication</span><span>Firebase Email/Password — no public sign-up form</span></div>
        <div class="detail-row"><span class="detail-label">Data access</span><span>Firestore rules: only signed-in users can read or write CRM data</span></div>
        <div class="detail-row"><span class="detail-label">Admin access</span><span>Role-gated — only <strong>admin</strong> accounts can reach this page or change roles, enforced server-side</span></div>
        <div class="detail-row"><span class="detail-label">Transport</span><span>HTTPS (enforce it in GitHub Pages settings)</span></div>
        <p class="text-muted" style="font-size:0.8rem;margin-top:0.75rem;">
            Protection is enforced by the rules in <code>firestore.rules</code>. If you haven't deployed them yet,
            paste them into Firebase Console → Firestore Database → Rules → Publish.
        </p>
    `;
}
