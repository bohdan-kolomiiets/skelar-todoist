import { renderShareCard } from "./_brand/ogImage";

export const alt = "Dayspark — brain-dump your day, and AI turns the chaos into a clear plan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return renderShareCard();
}
