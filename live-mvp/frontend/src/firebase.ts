import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "<apiKey>",
  authDomain: "<authDomain>",
  projectId: "<projectId>",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const anonLogin = () => signInAnonymously(auth);
