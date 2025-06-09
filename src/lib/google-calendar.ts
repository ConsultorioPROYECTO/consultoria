// lib/google-calendar.ts
import { google } from 'googleapis';

const calendar = google.calendar('v3');

// Configuración con Service Account (cuenta de control)
const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  },
  scopes: ['https://www.googleapis.com/auth/calendar']
});

export const googleCalendar = {
  auth,
  calendar: calendar
};