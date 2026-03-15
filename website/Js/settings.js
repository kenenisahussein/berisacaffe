import { client } from "./sanity.js";

export async function loadSiteSettings() {
  const query = `*[_type=="siteSettings"][0]{
siteName,
heroTitle,
heroSubtitle,
"heroImage": heroImage.asset->url,
buttonColor,
accentColor,
footerText
}`;

  const settings = await client.fetch(query);

  if (!settings) return;

  document.querySelector("#heroTitle").textContent = settings.heroTitle;
  document.querySelector("#heroSubtitle").textContent = settings.heroSubtitle;

  document.querySelector(".hero").style.backgroundImage =
    `url(${settings.heroImage})`;

  document.documentElement.style.setProperty(
    "--primary-color",
    settings.buttonColor,
  );
}
