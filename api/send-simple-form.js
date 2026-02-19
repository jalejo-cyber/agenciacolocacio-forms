import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";
import axios from "axios";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const form = formidable({
      multiples: false,
      allowEmptyFiles: true,
      minFileSize: 0,
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const dniValue = fields.dni?.toString().trim() || "";

    let tipusDocument = "";
    if (/^[0-9]/.test(dniValue)) {
      tipusDocument = "DNI";
    } else if (/^[A-Za-z]/.test(dniValue)) {
      tipusDocument = "NIE";
    } else {
      tipusDocument = "No definit";
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const attachments = [];

    if (files.cv) {
      const file = Array.isArray(files.cv)
        ? files.cv[0]
        : files.cv;

      if (file?.filepath) {
        attachments.push({
          filename: file.originalFilename || "cv.pdf",
          content: fs.readFileSync(file.filepath),
        });
      }
    }

    await transporter.sendMail({
      from: `"Agència de Col·locació" <${process.env.EMAIL_USER}>`,
      to: "jalejo@fomentformacio.com",
      subject: "Nova inscripció Agència de Col·locació",
      html: `
      <h2>Nova inscripció</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:14px;">
        <tr><td><strong>DNI/NIE</strong></td><td>${dniValue}</td></tr>
        <tr><td><strong>Tipus document</strong></td><td>${tipusDocument}</td></tr>
        <tr><td><strong>Nom</strong></td><td>${fields.nom}</td></tr>
        <tr><td><strong>Primer Cognom</strong></td><td>${fields.cognom1}</td></tr>
        <tr><td><strong>Segon Cognom</strong></td><td>${fields.cognom2 || "-"}</td></tr>
        <tr><td><strong>Email</strong></td><td>${fields.email}</td></tr>
        <tr><td><strong>Telèfon</strong></td><td>${fields.telefon}</td></tr>
        <tr><td><strong>Població</strong></td><td>${fields.poblacio}</td></tr>
        <tr><td><strong>Sector</strong></td><td>${fields.sector}</td></tr>
      </table>
      `,
      attachments,
    });

    // 🔗 Enviar a Google Sheets
    await axios.post(process.env.GOOGLE_SCRIPT_URL, {
      dni: dniValue,
      tipusDocument,
      nom: fields.nom,
      cognom1: fields.cognom1,
      cognom2: fields.cognom2 || "",
      email: fields.email,
      telefon: fields.telefon,
      poblacio: fields.poblacio,
      sector: fields.sector,
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERROR REAL:", err);
    return res.status(500).json({ error: err.message });
  }
}
