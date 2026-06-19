import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const q = collection(db, "movies");
  const snap = await getDocs(q);
  console.log("Total movies in DB:", snap.size);
  snap.forEach(d => console.log(d.id, d.data().titulo_pt));
  process.exit(0);
}
run();
