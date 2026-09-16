# Parent and school outreach

Personal GitHub Pages deployment maintained by Angelica Salazar for the
Nuevo Foundation parent-outreach project. This is not a deployment to
Nuevo Foundation's official website.

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

The Microsoft interest form is reached through the verified TinyURL configured
in `config.js`; those services have their own privacy policies. The website does
not submit anything to that form automatically.

Formatted copying preserves the clickable **Nuevo Foundation**, **Form**, and
configured **View the flyer** links. Email-app links use plain text. Parents
must download and manually attach the flyer if they want an attachment.

The eventual production destination for both the outreach site and flyer
remains Nuevo Foundation's official website, subject to its publishing approval.
