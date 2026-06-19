import * as admin from "firebase-admin";

if (!admin.apps.length) {
  // We can initialize admin SDK without credentials if we ONLY want to verify ID tokens
  // and we explicitly provide the projectId.
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "punchraksha-otp",
  });
}

export const firebaseAdmin = admin;
