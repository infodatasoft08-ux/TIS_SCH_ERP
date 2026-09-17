import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getClassRank(classNameOrObject) {
  let name = "";
  if (typeof classNameOrObject === "string") {
    name = classNameOrObject;
  } else if (classNameOrObject && typeof classNameOrObject === "object") {
    name = classNameOrObject.name || classNameOrObject.class_name || classNameOrObject.grade_name || classNameOrObject.title || classNameOrObject.className || "";
  }

  const str = String(name).toLowerCase().trim();

  // 1. Play / Playgroup
  if (str.includes("play")) return 1;
  if (str.includes("pg") || str.includes("pre-nur") || str.includes("prenur")) return 2;

  // 2. Nursery
  if (str.includes("nur")) return 3;

  // 3. LKG / Lower KG / KG-I
  if (str.includes("l.k.g") || str.includes("lkg") || str.includes("lower") || str.includes("kg-i") || str.includes("kg 1") || str.includes("kg-1") || str.includes("jr")) return 4;

  // 4. UKG / Upper KG / KG-II / Prep
  if (str.includes("u.k.g") || str.includes("ukg") || str.includes("upper") || str.includes("kg-ii") || str.includes("kg 2") || str.includes("kg-2") || str.includes("prep") || str.includes("sr")) return 5;

  // 5. Roman numerals (checked from XII down to I)
  const clean = " " + str.replace(/[^a-z0-9]/g, " ") + " ";
  if (/\b(xii|twelfth)\b/.test(clean)) return 112;
  if (/\b(xi|eleventh)\b/.test(clean)) return 111;
  if (/\b(x|tenth)\b/.test(clean)) return 110;
  if (/\b(ix|ninth)\b/.test(clean)) return 109;
  if (/\b(viii|eighth)\b/.test(clean)) return 108;
  if (/\b(vii|seventh)\b/.test(clean)) return 107;
  if (/\b(vi|sixth)\b/.test(clean)) return 106;
  if (/\b(v|fifth)\b/.test(clean)) return 105;
  if (/\b(iv|fourth)\b/.test(clean)) return 104;
  if (/\b(iii|third)\b/.test(clean)) return 103;
  if (/\b(ii|second)\b/.test(clean)) return 102;
  if (/\b(i|first)\b/.test(clean)) return 101;

  // 6. Numeric class 1 to 12
  const numMatch = str.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (num >= 1 && num <= 12) return 100 + num;
    return 200 + num;
  }

  return 999;
}

export function compareClasses(a, b) {
  const rankA = getClassRank(a);
  const rankB = getClassRank(b);

  if (rankA !== rankB) return rankA - rankB;

  const nameA = String(typeof a === "object" ? a.name || a.class_name || a.className || "" : a);
  const nameB = String(typeof b === "object" ? b.name || b.class_name || b.className || "" : b);
  return nameA.localeCompare(nameB, undefined, { numeric: true });
}

export function sortClasses(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort(compareClasses);
}
