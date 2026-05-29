# AtlisPoint CRM — Accounts, Login & Admin Setup

This guide covers how to **create your account and password**, and how the
**role-based admin panel** works and how to turn it on.

> Important: For security, accounts and passwords are created by **you** in the
> Firebase Console — not stored in the code. The app has no public "sign up"
> form on purpose (it's an internal CRM). Anyone who should have access gets an
> account created for them.

---

## Part 1 — Create your account & password (Firebase)

Your CRM authenticates against **Firebase Authentication**. Right now
`js/firebase-config.js` still has placeholder values, so login won't work until
you connect a Firebase project. One-time setup:

1. Go to https://console.firebase.google.com and **Create a project** — name it
   `atlispoint-crm`.
2. **Authentication** → Get started → **Email/Password** → toggle **Enable** → Save.
3. **Authentication → Users → Add user**. Enter **your email** and a **strong
   password**. *This is your account.* (You can change the password later from
   the CRM under your avatar → Settings.)
4. **Firestore Database → Create database** → start in **production mode** →
   pick the closest region (e.g. `us-east1`).
5. **Project Settings (gear) → General → Your apps → Web (`</>`)** → register
   `AtlisPoint CRM` → copy the `firebaseConfig` object.
6. Paste that config into `js/firebase-config.js` (replace the `YOUR_...`
   placeholders), then deploy. **Or just send me the config and I'll paste it
   in and commit it for you.**

After this, go to `https://atlispointaerogroup.github.io/crm/`, enter your email
and password, and you're in.

---

## Part 2 — Turn on protection (deploy the security rules)

This is the step that actually makes the CRM secure. Without it, Firestore
either blocks everything or (in test mode) allows everyone.

1. Open `firestore.rules` (in this folder) and copy the whole file.
2. Firebase Console → **Firestore Database → Rules** → paste → **Publish**.

What the rules enforce (server-side, can't be bypassed from the browser):

- Only **signed-in** users can read or write CRM data (clients, crew, missions,
  pipeline, invoices, documents).
- A user can only create **their own** profile and only as a **member** — nobody
  can self-promote to admin.
- Only **admins** can change someone's role, delete users, or write admin-only
  `settings`.

---

## Part 3 — Become the first admin (one time)

The first time you log in, the app auto-creates a profile for you with the role
`member`. Promote yourself once, by hand:

1. Firebase Console → **Firestore Database → Data**.
2. Open the **`users`** collection → click your document (matches your login).
3. Change the **`role`** field from `member` to **`admin`** → Update.
4. Refresh the CRM. An **Admin** item now appears in the sidebar.

From then on you manage everyone else from inside the app — no console needed.

---

## Part 4 — Using the Admin panel

Open **Admin** in the sidebar (admins only). You can:

- **See all users** and their roles (Admin / Member) and join dates.
- **Make Admin / Set as Member** — promote or demote teammates. (You can't
  remove your own admin access, to avoid locking yourself out.)
- **+ Add User** — create a login for a new teammate (email + temporary
  password). They sign in, then you can promote them if needed. New users start
  as **members**.

### What "member" vs "admin" can do
- **Member**: full access to the CRM modules (dashboard, pipeline, clients,
  missions, crew, invoicing, documents).
- **Admin**: everything a member can do **plus** the Admin panel — managing
  users, roles, and admin-only settings.

> Want stricter separation (e.g. members read-only, or certain modules hidden
> from members)? That's a small change to `firestore.rules` plus the relevant
> module — just say the word.

---

## Honest note on "secured and protected"

The CRM is hosted on **GitHub Pages**, which serves the page publicly — the HTML,
CSS and JavaScript are visible to anyone with the URL. That's normal and fine,
because **none of your data lives in those files**. The data and the access
control live in Firebase, behind:

1. **Authentication** — you must log in with a real account.
2. **Firestore security rules** — the server checks every read/write.
3. **Role checks** — admin actions require an admin account.

So the protection is real, but it comes from Firebase + the rules above — not
from the static site. Keep `firestore.rules` deployed, use strong passwords, and
only create accounts for people who should have access. For an extra layer you
can also point a custom domain at it and enforce HTTPS (see `SETUP.md`).
