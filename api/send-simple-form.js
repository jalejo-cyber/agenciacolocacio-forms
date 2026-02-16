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

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const attachments = [];

    if (files.fileInput) {
      const file = Array.isArray(files.fileInput)
        ? files.fileInput[0]
        : files.fileInput;

      if (file?.filepath) {
        attachments.push({
          filename: file.originalFilename || "document",
          content: fs.readFileSync(file.filepath),
        });
      }
    }

    await transporter.sendMail({
      from: `"Formulari Web" <${process.env.EMAIL_USER}>`,
      to: "jalejo@fomentformacio.com",
      subject: "Nou formulari rebut",
      text: `
Nom: ${fields.nom}
Email: ${fields.email}
Data de naixement: ${fields.dataNaixement}
DNI: ${fields.dni}
Prestació: ${fields.prestacio ? "Sí" : "No"}
      `,
      attachments,
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error("ERROR REAL:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
