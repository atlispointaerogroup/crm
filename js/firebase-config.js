// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// Connected to the "atlispoint-crm" Firebase project.
// Note: these values (including apiKey) are meant to be public
// in a web app — they identify the project, they don't grant
// access. Real protection lives in the Firestore security rules.
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBznM7v_hsP9n59VcB9ZVy7qpF3LEJy0ug",
    authDomain: "atlispoint-crm.firebaseapp.com",
    projectId: "atlispoint-crm",
    storageBucket: "atlispoint-crm.firebasestorage.app",
    messagingSenderId: "1086448188218",
    appId: "1:1086448188218:web:306a50841c1895924aee03",
    measurementId: "G-J0E9NGQYCJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
    if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: multiple tabs open');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistence not available in this browser');
    }
});
