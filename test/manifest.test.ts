import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { generatedPreferenceData } from "../scripts/manifest-data";

const root = join(__dirname, "..");
const manifest = JSON.parse(
	readFileSync(join(root, "package.json"), "utf8"),
) as {
	commands: { name: string; mode: string }[];
	preferences: {
		name: string;
		default?: unknown;
		data?: { value: string }[];
	}[];
};

test("generated dropdowns in package.json are up to date (npm run sync-manifest)", () => {
	const data = generatedPreferenceData();
	for (const [name, items] of Object.entries(data)) {
		const preference = manifest.preferences.find((item) => item.name === name);
		assert.deepEqual(preference?.data, items, name);
	}
});

test("dropdown defaults are valid values", () => {
	for (const preference of manifest.preferences) {
		if (!preference.data) continue;
		assert.ok(
			preference.data.some((item) => item.value === preference.default),
			`${preference.name} default`,
		);
	}
});

test("every command has an entry file", () => {
	for (const command of manifest.commands) {
		assert.ok(
			existsSync(join(root, "src", `${command.name}.tsx`)),
			command.name,
		);
	}
});
