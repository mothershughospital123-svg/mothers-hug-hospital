# Mother's Hug Hospital — Website

A fully coded, static multi-page website (HTML/CSS/JS, no build step) with a Vercel serverless function powering the contact form.

## Structure

```
index.html          Home
doctors.html         Doctors
facilities.html      Facilities & Services
gallery.html         Gallery
contact.html          Contact
css/style.css         Shared stylesheet (brand colors, layout, animations)
js/main.js            Nav, scroll reveal, 3D tilt cards, accordion, gallery lightbox, contact form submit
js/three-hero.js       Three.js animated 3D hero blob (home page only)
images/logo.png        Hospital logo (provided artwork)
api/contact.js          Vercel serverless function — emails contact form submissions
package.json            Declares the `nodemailer` dependency used by api/contact.js
```

## Deploying to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it with the Vercel CLI).
2. Import the repo in Vercel — Framework Preset: **Other**. No build command is needed; Vercel serves the HTML files as static assets and auto-detects `api/contact.js` as a serverless function.
3. In the Vercel project → **Settings → Environment Variables**, add the SMTP credentials the contact form uses to send mail:

   | Name         | Example                        | Notes                                   |
   |--------------|---------------------------------|------------------------------------------|
   | `SMTP_HOST`  | `smtp.hostinger.com`            | Your mailbox provider's SMTP host        |
   | `SMTP_PORT`  | `465`                            | `465` (SSL) or `587` (STARTTLS)          |
   | `SMTP_USER`  | `contact@mothershughospital.com`| Full mailbox address                     |
   | `SMTP_PASS`  | *(mailbox password)*            | Store as a secret, never commit it       |
   | `CONTACT_TO` | `contact@mothershughospital.com`| Optional — defaults to the address above |

   If the hospital's email mailbox (`contact@mothershughospital.com`) still lives on Hostinger's mail servers, you can keep using it here even though the site itself is now hosted on Vercel — just use Hostinger's SMTP host/port from its email settings.

4. Redeploy after adding the environment variables (Vercel only picks them up on a new deployment).

Until SMTP is configured, the form will show a friendly error asking the visitor to email `contact@mothershughospital.com` directly — it fails safely, it doesn't break the page.

## Editing content

All page copy lives directly in the `.html` files — no CMS or templating layer. Update text, doctors, or services by editing the relevant section in `index.html`, `doctors.html`, `facilities.html`, or `gallery.html`.

## Replacing placeholder visuals with real photos later

The site currently uses an illustration/gradient/icon-based design (no stock photography) per the agreed design direction. To swap in real photography later:

- **Doctor photos**: in `doctors.html` / `index.html`, replace the `<span class="avatar">BG</span>` / `<span class="avatar">NB</span>` elements with an `<img>` tag inside `.avatar`.
- **Gallery photos**: in `gallery.html`, replace each `.tile-bg` element's inline gradient `style` with a real photo, e.g. `style="background:url('images/gallery/fetal-medicine.jpg') center/cover"`.
- **Hero graphic**: the homepage hero uses a live Three.js 3D scene (`js/three-hero.js`) rather than a photo — no change needed unless you want to replace it.
