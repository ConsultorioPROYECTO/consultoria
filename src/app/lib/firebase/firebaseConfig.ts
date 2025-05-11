// src/lib/firebase/config.ts

/**
 * @fileoverview Configuración e inicialización de Firebase SDK.
 * @version 
 * @author Santiago Prada
 * @date 2025-05-10
 *
 * @description
 * Este archivo inicializa la aplicación Firebase utilizando las variables de entorno
 * y exporta las instancias de los servicios de Firebase que se utilizarán
 * en la aplicación, como Firebase Authentication.
 *
 * Es crucial que las variables de entorno (NEXT_PUBLIC_FIREBASE_*) estén
 * correctamente configuradas en el archivo .env.local.
 *
 * @requires firebase/app - Para inicializar la app.
 * @requires firebase/auth - Para el servicio de autenticación.
 *
 * @example - Cómo obtener las variables de configuración:
 * 1. Ve a tu proyecto en Firebase Console.
 * 2. Ve a "Configuración del proyecto" (ícono de engranaje).
 * 3. En la pestaña "General", busca la sección "SDK de Firebase" y selecciona "Configuración".
 * 4. Copia los valores del objeto `firebaseConfig`.
 *
 * @see {@link https://firebase.google.com/docs/web/setup} - Documentación de Firebase Web Setup.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Configuración de Firebase obtenida de las variables de entorno.
// Asegúrate de que estas variables estén definidas en tu archivo .env.local.
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

/**
 * Instancia de la aplicación Firebase.
 * Se inicializa solo si no existe ya una instancia,
 * lo cual es importante para evitar errores en entornos como Next.js con HMR.
 * @type {FirebaseApp}
 */
let firebaseApp: FirebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0]; // Usa la app existente si ya fue inicializada
}

/**
 * Instancia del servicio de autenticación de Firebase.
 * @type {import('firebase/auth').Auth}
 */
const auth = getAuth(firebaseApp);

/**
 * Proveedor de autenticación de Google.
 * Se utiliza para iniciar el flujo de inicio de sesión con Google.
 * @type {GoogleAuthProvider}
 */
const googleAuthProvider = new GoogleAuthProvider();

export { firebaseApp, auth, googleAuthProvider };