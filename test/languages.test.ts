import assert from "node:assert/strict";
import { test } from "node:test";
import {
	ALL_LANGUAGE_CODES,
	isSameLanguage,
	LANGUAGES,
	languageName,
	normalizeLanguage,
} from "../src/lib/languages";
import { deeplLanguages } from "../src/providers/deepl";
import { googleLanguages } from "../src/providers/google";
import { PROVIDER_LIST, supportNote } from "../src/providers";

test("normalizes other spellings of language codes", () => {
	assert.equal(normalizeLanguage("EN-gb"), "en-GB");
	assert.equal(normalizeLanguage("he"), "iw");
	assert.equal(normalizeLanguage("NB"), "no");
	assert.equal(normalizeLanguage("ZH"), "zh-CN");
	assert.equal(normalizeLanguage("zh-hant"), "zh-TW");
	assert.equal(normalizeLanguage("auto"), "auto");
	assert.equal(languageName("ru"), "Russian");
	assert.equal(languageName("auto"), "Auto-Detect");
});

test("compares languages by their base language", () => {
	assert.ok(isSameLanguage("en", "en-GB"));
	assert.ok(isSameLanguage("he", "iw"));
	assert.ok(!isSameLanguage("en", "ru"));
	assert.ok(!isSameLanguage("auto", "auto"));
});

test("every provider language is a known shared code", () => {
	for (const provider of PROVIDER_LIST) {
		for (const role of ["source", "target"] as const) {
			for (const code of provider.languages(role)) {
				assert.ok(code in LANGUAGES, `${provider.id} ${role} ${code}`);
				assert.ok(
					provider.resolve(code, role),
					`${provider.id} resolves ${code}`,
				);
			}
		}
	}
	assert.equal(new Set(ALL_LANGUAGE_CODES).size, Object.keys(LANGUAGES).length);
});

test("maps shared codes to DeepL codes", () => {
	assert.equal(deeplLanguages.resolve("en", "target"), "EN-US");
	assert.equal(deeplLanguages.resolve("en", "source"), "EN");
	assert.equal(deeplLanguages.resolve("en-GB", "target"), "EN-GB");
	assert.equal(deeplLanguages.resolve("en-GB", "source"), "EN");
	assert.equal(deeplLanguages.resolve("pt", "target"), "PT-BR");
	assert.equal(deeplLanguages.resolve("pt-PT", "target"), "PT-PT");
	assert.equal(deeplLanguages.resolve("zh-TW", "target"), "ZH-HANT");
	assert.equal(deeplLanguages.resolve("zh-TW", "source"), "ZH");
	assert.equal(deeplLanguages.resolve("iw", "target"), "HE");
	assert.equal(deeplLanguages.resolve("no", "source"), "NB");
	assert.equal(deeplLanguages.resolve("ru", "target"), "RU");
	assert.equal(deeplLanguages.resolve("uk", "source"), "UK");
	assert.equal(deeplLanguages.resolve("ab", "target"), undefined);
	assert.equal(deeplLanguages.resolve("fr-CA", "target"), "FR-CA");
});

test("maps DeepL codes back to shared codes", () => {
	assert.equal(deeplLanguages.toShared("EN"), "en");
	assert.equal(deeplLanguages.toShared("PT"), "pt");
	assert.equal(deeplLanguages.toShared("ZH"), "zh-CN");
	assert.equal(deeplLanguages.toShared("HE"), "iw");
	assert.equal(deeplLanguages.toShared("NB"), "no");
	assert.equal(deeplLanguages.toShared("RU"), "ru");
});

test("Google uses the base language for variants it does not have", () => {
	assert.equal(googleLanguages.resolve("en-GB", "target"), "en");
	assert.equal(googleLanguages.resolve("es-419", "target"), "es");
	assert.equal(googleLanguages.resolve("de-CH", "source"), "de");
	assert.equal(googleLanguages.resolve("zh-TW", "target"), "zh-TW");
	assert.equal(googleLanguages.resolve("an", "target"), undefined);
});

test("notes which providers support a language", () => {
	assert.equal(supportNote("ru", "target"), "");
	assert.equal(supportNote("ab", "target"), "Google Translate only");
	assert.equal(supportNote("an", "target"), "DeepL only");
});
