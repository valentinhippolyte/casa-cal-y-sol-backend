// @ts-nocheck
import cors from "cors";
import "dotenv/config";
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());
app.use(cors());

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

    const events = icsText.split("BEGIN:VEVENT");

    const bookings = [];

    events.forEach((block) => {
      const dtstart = block.match(/DTSTART.*:(\d{8})/);
      const dtend = block.match(/DTEND.*:(\d{8})/);

      if (dtstart && dtend) {
        const startStr = dtstart[1];
        const endStr = dtend[1];

        const start = new Date(
          startStr.slice(0, 4) +
            "-" +
            startStr.slice(4, 6) +
            "-" +
            startStr.slice(6, 8),
        );

        const end = new Date(
          endStr.slice(0, 4) +
            "-" +
            endStr.slice(4, 6) +
            "-" +
            endStr.slice(6, 8),
        );

        bookings.push({
          start: start.toISOString(),
          end: end.toISOString(),
          title: "Réservé",
        });
      }
    });

    console.log("BOOKINGS LENGTH:", bookings.length);
    console.log("SAMPLE BOOKINGS:", bookings.slice(0, 3));

    res.json(bookings);
  } catch (error) {
    console.error("Error parsing iCal:", error);
    res.status(500).json({ error: "Failed to parse calendar" });
  }
});

app.get("/api/ping", (req, res) => {
  res.status(200).send("pong");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
