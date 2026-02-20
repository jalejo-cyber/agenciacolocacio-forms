import nodemailer from "nodemailer";
import formidable from "formidable";
import fs from "fs";

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

    // 🔎 CLASSIFICAR DNI / NIE
    const dniValue = fields.dni || "";
    const tipusDocument = /^[0-9]/.test(dniValue) ? "DNI" : "NIE";

    // 📎 ADJUNT
    const attachments = [];

    if (files.cv) {
      const file = Array.isArray(files.cv) ? files.cv[0] : files.cv;

      if (file?.filepath) {
        attachments.push({
          filename: file.originalFilename || "CV",
          content: fs.readFileSync(file.filepath),
        });
      }
    }

    // 📧 TRANSPORTER
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🧾 TAULA HTML
    const htmlTable = `
    <h2>Nova inscripció - Agència de Col·locació</h2>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:Arial;">
      <tr><td><strong>Tipus document</strong></td><td>${tipusDocument}</td></tr>
      <tr><td><strong>DNI/NIE</strong></td><td>${fields.dni}</td></tr>
      <tr><td><strong>Nom</strong></td><td>${fields.nom}</td></tr>
      <tr><td><strong>Cognom 1</strong></td><td>${fields.cognom1}</td></tr>
      <tr><td><strong>Cognom 2</strong></td><td>${fields.cognom2 || "-"}</td></tr>
      <tr><td><strong>Data naixement</strong></td><td>${fields.dataNaixement}</td></tr>
      <tr><td><strong>Gènere</strong></td><td>${fields.genere}</td></tr>
      <tr><td><strong>Estudis</strong></td><td>${fields.estudis}</td></tr>
      <tr><td><strong>Discapacitat</strong></td><td>${fields.discapacitat}</td></tr>
      <tr><td><strong>Feina últims 2 mesos</strong></td><td>${fields.feina2mesos}</td></tr>
      <tr><td><strong>Email</strong></td><td>${fields.email}</td></tr>
      <tr><td><strong>Telèfon</strong></td><td>${fields.telefon}</td></tr>
      <tr><td><strong>Població</strong></td><td>${fields.poblacio}</td></tr>
      <tr><td><strong>Prestació</strong></td><td>${fields.prestacio}</td></tr>
      <tr><td><strong>Col·lectiu</strong></td><td>${fields.collectiu}</td></tr>
      <tr><td><strong>Sector</strong></td><td>${fields.sector}</td></tr>
      <tr><td><strong>Disponibilitat</strong></td><td>${fields.disponibilitat}</td></tr>
      <tr><td><strong>Acceptació legal</strong></td><td>${fields.legal}</td></tr>
    </table>
    `;

    // ✉️ ENVIAR CORREU
    await transporter.sendMail({
      from: `"Agència Foment Formació" <${process.env.EMAIL_USER}>`,
      to: "jalejo@fomentformacio.com",
      subject: "Nova inscripció Agència de Col·locació",
      html: htmlTable,
      attachments,
    });

    // --- ENVIAR A GOOGLE SHEETS (després del correu) ---
const googleRes = await fetch(process.env.GOOGLE_SCRIPT_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    dni: fields.dni,
    nom: fields.nom,
    cognom1: fields.cognom1,
    cognom2: fields.cognom2,
    dataNaixement: fields.dataNaixement,
    genere: fields.genere,
    estudis: fields.estudis,
    discapacitat: fields.discapacitat,
    feina2mesos: fields.feina2mesos,
    email: fields.email,
    telefon: fields.telefon,
    poblacio: fields.poblacio,
    prestacio: fields.prestacio,
    collectiu: fields.collectiu,
    sector: fields.sector,
    disponibilitat: fields.disponibilitat
  })
});

const googleText = await googleRes.text();
if (!googleRes.ok) {
  console.error("Google Sheets error:", googleRes.status, googleText);
}
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERROR REAL:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
