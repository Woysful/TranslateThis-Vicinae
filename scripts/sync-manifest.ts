/**
 * Writes the provider and language dropdowns of package.json from the code, so
 * the preferences always list every registered provider and language.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generatedPreferenceData } from "./manifest-data";

const path = join(__dirname, "..", "package.json");
const manifest = JSON.parse(readFileSync(path, "utf8")) as {
	preferences: { name: string; data?: unknown }[];
};
const data = generatedPreferenceData();
for (const preference of manifest.preferences) {
	if (preference.name in data) preference.data = data[preference.name];
}
writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Updated ${Object.keys(data).join(", ")} in package.json`);
