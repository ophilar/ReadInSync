import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInAnonymously
} from "firebase/auth";

const errorBox = document.getElementById("errorBox");
const successMsg = document.getElementById("successMsg");
const authButtons = document.getElementById("authButtons");

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

async function init() {
  let auth;
  try {
    const configRes = await fetch(chrome.runtime.getURL("firebase-config.json"));
    const firebaseConfig = await configRes.json();

    const required = ["apiKey", "projectId", "authDomain", "appId"];
    const missing = required.filter((k) => !firebaseConfig[k] || firebaseConfig[k].startsWith("YOUR_FIREBASE_"));
    if (missing.length > 0) {
      throw new Error(`Missing or placeholder Firebase configuration keys: ${missing.join(", ")}`);
    }

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    showError(`LOUD FAILURE: ${error.message}. Please verify firebase-config.json is configured.`);
    return;
  }

  const handleSignIn = async (promise) => {
    errorBox.style.display = "none";
    try {
      await promise;
      authButtons.style.display = "none";
      successMsg.style.display = "block";
      
      // Close tab after 1.5s on success
      setTimeout(() => {
        window.close();
      }, 1500);
    } catch (error) {
      showError(error.message);
    }
  };

  document.getElementById("btnGoogle").addEventListener("click", () => {
    const provider = new GoogleAuthProvider();
    handleSignIn(signInWithPopup(auth, provider));
  });

  document.getElementById("btnGithub").addEventListener("click", () => {
    const provider = new GithubAuthProvider();
    handleSignIn(signInWithPopup(auth, provider));
  });

  document.getElementById("btnAnonymous").addEventListener("click", () => {
    handleSignIn(signInAnonymously(auth));
  });
}

document.addEventListener("DOMContentLoaded", init);
