// js/sanity.js
// Simple fetch wrapper to query Sanity's HTTP API from the browser.
// Replace PROJECT_ID and DATASET values below.

const PROJECT_ID = "wu8r6e5j"; // <-- put your projectId here
const DATASET = "production";
const API_VERSION = "2024-01-01"; // stable API version

export async function fetchMenuItems() {
  const query = encodeURIComponent(`*[_type=="menuItem"]{
    _id,
    name,
    category,
    price,
    popular,
    desc,
    delivery,
    "imageUrl": image.asset->url
  }`);
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${query}`;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("Failed to fetch from Sanity: " + res.status);
  const json = await res.json();
  return json.result || [];
}
