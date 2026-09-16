# NUEVO FOUNDATION Parent and school outreach

Personal GitHub Pages deployment maintained by Angelica Salazar for the
Nuevo Foundation parent-outreach project. This is not a deployment to
Nuevo Foundation's official website.

**Live website:** https://angelica-salazar-code.github.io/parent-school-outreach/

**Public flyer:** https://angelica-salazar-code.github.io/parent-school-outreach/flyer.html

The public flyer page and the original image were verified without authentication
on September 16, 2026. This deployment's `config.js` uses that address so the
generated email includes a **View the flyer** link.

## Source

Runtime files come from `site/` in
[NuevoFoundation/outreach](https://github.com/NuevoFoundation/outreach),
branch `ansalaz-microsoft-parent-and-school-outreach`, commit
`b9a60a8`. This repository intentionally contains only the static website,
public images, and this deployment documentation.

The SVG wordmark and mascot originate from Nuevo Foundation's workshops
repository. The flyer image is the original supplied by the outreach owner.

## Hosting and updates

GitHub Pages serves the root of `main`, without a build step or dependencies.
`.nojekyll` ensures JavaScript modules and assets are served as static files.
Publishing changes here does not change the upstream outreach repository.

To update, copy the reviewed website runtime files and assets from the outreach
source, preserve this deployment's verified public flyer address in `config.js`,
and push to `main`. Wait for the Pages deployment and check the live website.
The public repository and website can be viewed by anyone.

## Privacy and email behavior

The form processes answers in browser memory, with no backend, stored answers,
or analytics of form values. GitHub handles ordinary website requests according
to its hosting policies. Copying a message places text on the user's clipboard;
opening an email app passes the reviewed draft to that application.

The engagement buttons open the original Microsoft Forms address directly.
Email drafts use this site's `form.html` as a shorter link, which automatically
opens the same Microsoft Form and includes a manual fallback link. No parent
answers are passed along or submitted. TinyURL was removed after its deprecated
API links began displaying an interstitial page instead of reliably opening the
form. Microsoft Forms has its own privacy policy.

Formatted copying preserves the clickable **Nuevo Foundation**, **Form**, and
configured **View the flyer** links. Email-app drafts include the full flyer
URL as plain text. Step 3 opens the hosted flyer for viewing; parents share it
as a link in the email body, not as an attachment. Downloading an image copy
is optional and not part of the email-sharing flow.

## Comparison with the original campaign

The original `campaigns/school-community-engagement/preview.html` in
NuevoFoundation/outreach contains an editable HTML flyer and sample email.
Its **View the flyer** action switches tabs within that page using
`#flyer-panel`, and its engagement action opens a contact email.

This deployment's `flyer.html` displays the supplied image of the flyer with
a text summary and the current Microsoft Forms engagement action. Its full
public address can be shared directly in emails. The original campaign is
preserved; no marketing claims are added or independently verified.

The eventual production destination for both the outreach site and flyer
remains Nuevo Foundation's official website, subject to its publishing approval.
