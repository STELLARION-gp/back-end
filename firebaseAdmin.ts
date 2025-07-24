// firebaseAdmin.ts
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json";

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export default admin;
