/**
 * server.js — Serveur Express pour le site MOUSSA-GROS
 * 
 * Inclus :
 *  - Protection d'accès direct sur db.json, server.js, package.json
 *  - Protection contre la consultation directe dans la barre d'adresse de app.js et styles.css
 *  - Endpoint GET /api/data (renvoie uniquement les hommages avec is_valid === true)
 *  - Endpoint POST /api/testimonials (force is_valid = false de manière stricte côté serveur)
 *  - Service statique d'index.html et des assets
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const nodmailer = require('nodemailer')

const app  = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware d'analyse du JSON dans le corps de requête
app.use(express.json());

// service de mail
const transporter = nodmailer.createTransport({
  service: "gmail",
  auth: {
    user:"imanagence@gmail.com",
    pass:"ajia dzuh btva atms"
  }
})

// ----------------------------------------------------
// 1. MIDDLEWARE DE SÉCURITÉ et CONTRÔLE D'ACCÈS
// ----------------------------------------------------
app.use((req, res, next) => {
  const reqPath = req.path.toLowerCase();

  // A. Interdiction d'accès direct aux fichiers serveur et confidentiels
  const FORBIDDEN_FILES = ['/db.json', '/server.js', '/package.json', '/package-lock.json'];
  if (FORBIDDEN_FILES.includes(reqPath) || reqPath.startsWith('/.')) {
    return res.status(403).type('text/plain; charset=utf-8').send('403 Forbidden : Accès direct interdit.');
  }

  // B. Interdiction de consultation directe dans la barre d'adresse pour les fichiers JS/CSS
  const fetchDest = req.headers['sec-fetch-dest'];
  if (fetchDest === 'document' && (reqPath === '/app.js' || reqPath === '/styles.css')) {
    return res.status(403).type('text/plain; charset=utf-8').send('403 Forbidden : Consultation directe du code source interdite.');
  }

  next();
});

// ----------------------------------------------------
// 2. API ENDPOINTS
// ----------------------------------------------------

// GET /api/data : Données publiques filtrées pour le frontend
app.get('/api/data', (req, res) => {
  try {
    const dbData = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(dbData);

    // Sécurité : Seuls les témoignages validés (is_valid === true) sont envoyés au client
    const safeTestimonials = Array.isArray(db.testimonials)
      ? db.testimonials.filter(item => item.is_valid === true)
      : [];

    res.json({
      livret: db.livret || null,
      archives: db.archives || [],
      testimonials: safeTestimonials
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la lecture des données.' });
  }
});

// POST /api/testimonials : Ajout d'un hommage avec validation stricte
app.post('/api/testimonials', (req, res) => {
  try {
    const { name, relation, content } = req.body || {};

    if (!name || !String(name).trim() || !content || !String(content).trim()) {
      return res.status(400).json({ error: 'Les champs "Nom" et "Contenu" sont obligatoires.' });
    }

    // Objet sécurisé construit EXCLUSIVEMENT côté serveur (is_valid toujours false)
    const newTestimonial = {
      id: `temoin-${Date.now()}`,
      name: String(name).trim(),
      relation: relation ? String(relation).trim() : 'Visiteur du site',
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      content: String(content).trim(),
      is_valid: false // Force is_valid = false de manière stricte côté serveur
    };

    const dbData = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(dbData);

    if (!Array.isArray(db.testimonials)) {
      db.testimonials = [];
    }

    db.testimonials.unshift(newTestimonial);

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

    res.status(201).json({
      success: true,
      message: 'Hommage enregistré avec succès. En attente de validation.',
      testimonial: newTestimonial
    });
    console.log(`[API Express] Hommage soumis (en attente) : ${newTestimonial.name}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contact : Formulaire de contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Les champs Nom, Email et Message sont obligatoires.' });
    }

    const infoAdmin = await transporter.sendMail({
      from:`"${name}" <imanagence@gmail.com>`,
      replyTo: email,
      to:"imanagence@gmail.com",
      subject:subject,
      text: message
    });

    if (!infoAdmin.messageId)
      throw new Error("L'envoi de l'e-mail principal a échoué.")

    console.log(`[API Contact] Nouveau message de ${name} (${email}) - Sujet: ${subject || 'Sans sujet'}`);

    const sujetAffiche = subject || 'Aucun';
    const messageHtml = message;

    const textTemplate = 
      `Bonjour ${name},\n\n` +
      `Nous avons bien reçu votre message et nous vous en remercions.\n` +
      `La Famille MOUSSA-GROS reviendra vers vous dans les plus brefs délais.\n\n` +
      `--- Récapitulatif de votre message ---\n` +
      `Sujet : ${sujetAffiche}\n` +
      `Message :\n${message}\n\n` +
      `Cordialement,\n` +
      `La Famille MOUSSA-GROS — Concession Windiberi, Niamey`;

    const htmlTemplate = `
      <div style="font-family: Georgia, 'Times New Roman', serif; background-color:#ffffff; padding: 32px 16px; color:#6e0000;">
        <table role="presentation" width="100%" style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid rgba(212,175,55,0.35); border-radius:10px; overflow:hidden;">
          <tr>
            <td style="background-color:#6e0000; padding:28px 32px; text-align:center;">
              <p style="margin:0; font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#e8cc73;">Famille MOUSSA-GROS</p>
              <h1 style="margin:8px 0 0; font-size:22px; color:#ffffff; font-weight:700;">Accusé de réception</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:15px; line-height:1.7;">Bonjour <strong>${name}</strong>,</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.7;">
                Nous avons bien reçu votre message et nous vous en remercions.
              </p>
              <div style="height:1px; background:rgba(212,175,55,0.35); margin:24px 0;"></div>
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#a8891e; font-weight:700;">
                Récapitulatif de votre message
              </p>
              <blockquote style="background:#f3efe8; border-left:4px solid #d4af37; margin:0; padding:14px 18px; border-radius:0 6px 6px 0;">
                <p style="margin:0 0 8px; font-size:14px;"><strong>Sujet :</strong> ${sujetAffiche}</p>
                <p style="margin:0; font-size:14px; line-height:1.6; white-space:pre-wrap;">${messageHtml}</p>
              </blockquote>
            </td>
          </tr>
          <tr>
            <td style="background:#f3efe8; padding:16px 32px; text-align:center;">
              <p style="margin:0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#8a8578;">
                © 2026 Propulsé par e-IMAN. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `;

    const infoClient = await transporter.sendMail({
      from: `"Site officiel MOUSSA-GROS" <imanagence@gmail.com>`,
      to: email,
      subject: `${sujetAffiche}`,
      text: textTemplate,
      html: htmlTemplate
    });

    console.log(`[API Contact] Accusé de réception envoyé à ${email} (ID: ${infoClient.messageId})`);

    res.status(200).json({
      success: true,
      message: 'Votre message a été transmis avec succès.'
    });
  } catch (err) {
    console.log(err.message)
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/testimonials : Liste complète des hommages (pour l'interface de validation interne)
app.get('/api/admin/testimonials', (req, res) => {
  try {
    const dbData = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(dbData);
    res.json({ testimonials: db.testimonials || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/testimonials/:id : Modifier le statut d'un hommage (Valider / Retirer)
app.put('/api/admin/testimonials/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { is_valid } = req.body;

    if (typeof is_valid !== 'boolean') {
      return res.status(400).json({ error: 'Le paramètre is_valid (boolean) est obligatoire.' });
    }

    const dbData = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(dbData);

    const testimonial = (db.testimonials || []).find(t => t.id === id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Hommage non trouvé.' });
    }

    testimonial.is_valid = is_valid;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');

    res.json({ success: true, testimonial });
    console.log(`[API Admin] Hommage ${id} -> is_valid: ${is_valid}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/testimonials/:id : Supprimer définitivement un hommage
app.delete('/api/admin/testimonials/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dbData = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(dbData);

    const initialLength = (db.testimonials || []).length;
    db.testimonials = (db.testimonials || []).filter(t => t.id !== id);

    if (db.testimonials.length === initialLength) {
      return res.status(404).json({ error: 'Hommage non trouvé.' });
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    res.json({ success: true, message: 'Hommage supprimé.' });
    console.log(`[API Admin] Hommage ${id} supprimé.`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. SERVICE DES FICHIERS STATIQUES (index.html, assets, app.js, styles.css)
// ----------------------------------------------------
app.use(express.static(__dirname));

// ----------------------------------------------------
// 4. DEMARRAGE DU SERVEUR
// ----------------------------------------------------
// 4. DÉMARRAGE DU SERVEUR (uniquement en local)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n Serveur Express démarré sur http://localhost:${PORT}`);
  });
}

module.exports = app;