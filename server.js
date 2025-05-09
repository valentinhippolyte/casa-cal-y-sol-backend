// @ts-nocheck
import sgMail from "@sendgrid/mail";
import cors from "cors";
import "dotenv/config";
import express from "express";
import ical from "ical";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(cors());

// Configuration de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const API_BASE_URL = "https://login.smoobu.com/api";

const ICAL_URL = process.env.ICAL_URL;

app.post("/api/reservations", async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      apartmentId: process.env.HOUSE_ID,
    };

    const response = await fetch(`${API_BASE_URL}/reservations`, {
      method: "POST",
      headers: {
        "Api-Key": process.env.SMOOBU_API_KEY,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error when booking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/booked-dates", async (req, res) => {
  try {
    const response = await fetch(ICAL_URL);
    const icsText = await response.text();
    const data = ical.parseICS(icsText);

    const bookings = [];

    for (const k in data) {
      const ev = data[k];
      if (ev.type === "VEVENT") {
        bookings.push({
          start: ev.start.toISOString(),
          end: ev.end.toISOString(),
          title: "Réservé",
        });
      }
    }

    res.json(bookings);
  } catch (error) {
    console.error("Error parsing iCal:", error);
    res.status(500).json({ error: "Failed to parse calendar" });
  }
});

app.post("/api/send-booking-email", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      arrivalDate,
      departureDate,
      adults,
      children,
    } = req.body;

    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.EMAIL_FROM, // Doit être vérifié dans SendGrid
      subject: "Nouvelle réservation - Casa Cal y Sol",
      html: `
        <h2>Nouvelle réservation reçue</h2>
        <p><strong>Client:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Dates:</strong> du ${new Date(
          arrivalDate
        ).toLocaleDateString()} au ${new Date(
        departureDate
      ).toLocaleDateString()}</p>
        <p><strong>Nombre d'adultes:</strong> ${adults}</p>
        <p><strong>Nombre d'enfants:</strong> ${children}</p>
      `,
    };

    await sgMail.send(msg);
    res.status(200).json({ message: "Email envoyé avec succès" });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'email" });
  }
});

app.get("/api/ping", (req, res) => {
  res.status(200).send("pong");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
