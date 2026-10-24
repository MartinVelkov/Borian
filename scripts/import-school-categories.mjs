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

const CATEGORIES_COLLECTION = "categories";

const tournaments = [
  {
    name: "Перник",
    tournamentId: "M81V5jBweckzAAwsSsYm",
    firstDate: "2026-11-16",
    secondDate: "2026-11-17",
  },
  {
    name: "Софийска област",
    tournamentId: "lr3WCB0C10UzzMxH1ioB",
    firstDate: "2026-11-19",
    secondDate: "2026-11-20",
  },
  {
    name: "София",
    tournamentId: "esRb6vYt1s1A1xK7Urq7",
    firstDate: "2026-11-23",
    secondDate: "2026-11-24",
  },
  {
    name: "Кюстендил",
    tournamentId: "1090dAprkBiW4QdBL0Go",
    firstDate: "2026-11-26",
    secondDate: "2026-11-27",
  },
  {
    name: "Благоевград",
    tournamentId: "jzmFngFVKh2kZdobhkWF",
    firstDate: "2026-11-30",
    secondDate: "2026-12-01",
  },
  {
    name: "Пазарджик",
    tournamentId: "I7OOdG8cx8p9YDNQNog8",
    firstDate: "2026-12-03",
    secondDate: "2026-12-04",
  },
  {
    name: "Пловдив",
    tournamentId: "2fz2agfcCwN5f5TI2zbo",
    firstDate: "2026-12-07",
    secondDate: "2026-12-08",
  },
  {
    name: "Смолян",
    tournamentId: "K1PcXrcDAuC1b7Ey2joC",
    firstDate: "2026-12-10",
    secondDate: "2026-12-11",
  },
  {
    name: "Кърджали",
    tournamentId: "0CH7AYUpTU1J3H1mHoWT",
    firstDate: "2027-02-08",
    secondDate: "2027-02-09",
  },
  {
    name: "Хасково",
    tournamentId: "RYGSPtbDgLouLlr5IlVr",
    firstDate: "2027-02-11",
    secondDate: "2027-02-12",
  },
  {
    name: "Стара Загора",
    tournamentId: "sTnwIE1MHeSziLqGXn6y",
    firstDate: "2027-02-15",
    secondDate: "2027-02-16",
  },
  {
    name: "Сливен",
    tournamentId: "cbeieeUfGEhpvzslVtAx",
    firstDate: "2027-02-18",
    secondDate: "2027-02-19",
  },
  {
    name: "Ямбол",
    tournamentId: "8FKjR5AR67PTkHNupQRx",
    firstDate: "2027-02-22",
    secondDate: "2027-02-23",
  },
  {
    name: "Бургас",
    tournamentId: "tqPs8NX5rW5KnlipZkTV",
    firstDate: "2027-02-25",
    secondDate: "2027-02-26",
  },
  {
    name: "Варна",
    tournamentId: "jnX0YY0Yu7TrSZyFt2An",
    firstDate: "2027-03-01",
    secondDate: "2027-03-02",
  },
  {
    name: "Добрич",
    tournamentId: "eyXvquNTsPfGe7TAarPI",
    firstDate: "2027-03-04",
    secondDate: "2027-03-05",
  },
  {
    name: "Шумен",
    tournamentId: "I9Nt2QeahBfM6Nx6CBTU",
    firstDate: "2027-03-08",
    secondDate: "2027-03-09",
  },
  {
    name: "Търговище",
    tournamentId: "U37fUvQIFdrsjjFeNoQt",
    firstDate: "2027-03-11",
    secondDate: "2027-03-12",
  },
  {
    name: "Разград",
    tournamentId: "RZquzZJFfwkiZcZz9Z2H",
    firstDate: "2027-03-15",
    secondDate: "2027-03-16",
  },
  {
    name: "Силистра",
    tournamentId: "XGZ7vdziopWOtuUMZyxW",
    firstDate: "2027-03-18",
    secondDate: "2027-03-19",
  },
  {
    name: "Русе",
    tournamentId: "unISFz0oTq8VrtuUh0Wm",
    firstDate: "2027-03-22",
    secondDate: "2027-03-23",
  },
  {
    name: "Велико Търново",
    tournamentId: "JCpK0I8CEQseX7n8da0Q",
    firstDate: "2027-03-25",
    secondDate: "2027-03-26",
  },
  {
    name: "Габрово",
    tournamentId: "oJtx7EtHypUcubrx9NeF",
    firstDate: "2027-03-29",
    secondDate: "2027-03-30",
  },
  {
    name: "Ловеч",
    tournamentId: "BM84RgrcVeBW8Eck5h8l",
    firstDate: "2027-04-01",
    secondDate: "2027-04-02",
  },
  {
    name: "Плевен",
    tournamentId: "Ii9Z4g7F7VfHWFLp1fiN",
    firstDate: "2027-04-12",
    secondDate: "2027-04-13",
  },
  {
    name: "Враца",
    tournamentId: "nw8ky6XTOJXTwLLpIasw",
    firstDate: "2027-04-15",
    secondDate: "2027-04-16",
  },
  {
    name: "Монтана",
    tournamentId: "tSO7FPgTT6mXUDfSOWfA",
    firstDate: "2027-04-19",
    secondDate: "2027-04-20",
  },
  {
    name: "Видин",
    tournamentId: "sh2epFMJcJKf8UtHAxMt",
    firstDate: "2027-04-22",
    secondDate: "2027-04-23",
  },
];

const categories = [
  {
    name: "2 – 4 клас",
    gender: "MIXED",
    minAge: 8,
    maxAge: 10,
    maxTeams: 12,
    registrationOpen: true,
    dateField: "firstDate",
    startTime: "16:00",
    description:
      "Категория за ученици от 2. до 4. клас. Всеки отбор е съставен от 9 състезатели – 3 момичета и 6 момчета. На терена играят по 3 деца едновременно – 1 момиче и 2 момчета. Срещите се играят във формат футбол 3×3. Мачовете са с продължителност 9 минути. Победител е отборът, който първи отбележи 6 гола или води при изтичане на игровото време.",
  },
  {
    name: "5 – 7 клас",
    gender: "MIXED",
    minAge: 11,
    maxAge: 13,
    maxTeams: 12,
    registrationOpen: true,
    dateField: "secondDate",
    startTime: "16:00",
    description:
      "Категория за ученици от 5. до 7. клас. Всеки отбор е съставен от 9 състезатели – 1 момиче и 8 момчета. На терена играят по 3 деца едновременно – 1 момиче и 2 момчета. Срещите се играят във формат футбол 3×3. Мачовете са с продължителност 12 минути. Победител е отборът, който първи отбележи 6 гола или води при изтичане на игровото време.",
  },
];

async function categoryExists(tournamentId, categoryName) {
  const snapshot = await db
    .collection(CATEGORIES_COLLECTION)
    .where("tournamentId", "==", tournamentId)
    .where("name", "==", categoryName)
    .get();

  return !snapshot.empty;
}

async function importCategories() {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  console.log("\n======================================");
  console.log("УЧЕНИЧЕСКИ КАТЕГОРИИ");
  console.log("======================================\n");

  for (const tournament of tournaments) {
    console.log(
      `🏆 ${tournament.name} -> ${tournament.tournamentId}`
    );

    for (const template of categories) {
      try {
        const exists = await categoryExists(
          tournament.tournamentId,
          template.name
        );

        if (exists) {
          console.log(
            `   ⏭️ ${template.name} вече съществува`
          );

          skipped++;
          continue;
        }

        const startDate =
          tournament[template.dateField];

        const data = {
          createdAt:
            FieldValue.serverTimestamp(),

          description:
            template.description,

          gender:
            template.gender,

          maxAge:
            template.maxAge,

          maxTeams:
            template.maxTeams,

          minAge:
            template.minAge,

          name:
            template.name,

          registrationOpen:
            template.registrationOpen,

          startDate,

          startTime:
            template.startTime,

          tournamentId:
            tournament.tournamentId,

          updatedAt:
            FieldValue.serverTimestamp(),
        };

        const ref = await db
          .collection(CATEGORIES_COLLECTION)
          .add(data);

        console.log(
          `   ✅ ${template.name}`
        );

        console.log(
          `      Category ID: ${ref.id}`
        );

        console.log(
          `      tournamentId: ${tournament.tournamentId}`
        );

        console.log(
          `      Дата: ${startDate}`
        );

        console.log(
          `      Час: ${template.startTime}`
        );

        created++;
      } catch (error) {
        console.error(
          `   ❌ Грешка при ${template.name}:`,
          error.message
        );

        errors++;
      }
    }

    console.log("");
  }

  console.log("======================================");
  console.log("РЕЗУЛТАТ");
  console.log("======================================");
  console.log(`✅ Създадени категории: ${created}`);
  console.log(`⏭️ Вече съществуващи: ${skipped}`);
  console.log(`❌ Грешки: ${errors}`);
  console.log("======================================");
}

importCategories()
  .then(() => {
    console.log("\n✅ Импортът приключи.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Фатална грешка:", error);
    process.exit(1);
  });
