import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(projectRoot, "serviceAccountKey.json"), "utf8"),
);

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert(serviceAccount),
  });

const db = getFirestore(app);

const tournaments = JSON.parse(
  fs.readFileSync(
    path.join(scriptDirectory, "uchenicheski_turniri_firebase.json"),
    "utf8",
  ),
);

async function importTournaments() {
  console.log(`Ще бъдат добавени ${tournaments.length} турнира.`);

  for (const tournament of tournaments) {
    const docRef = await db.collection("tournaments").add({
      ...tournament,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ ${tournament.name} -> ${docRef.id}`);
  }

  console.log("✅ Всички турнири са добавени успешно.");
}

importTournaments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Грешка:", error);
    process.exit(1);
  });
