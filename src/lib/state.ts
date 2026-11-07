import { Cache } from "@vicinae/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getProvider, isProviderId } from "../providers";
import type { ProviderId, TranslationProvider } from "../providers/types";
import { AUTO_DETECT } from "./languages";
import { isSameLanguageSet, unifyLanguageSet } from "./language-sets";
import { getSettings, preferencesLanguageSet } from "./preferences";
import type { LanguageSet } from "./translate";

// One instance per command, so its subscribers see every change made in the command.
const cache = new Cache({ namespace: "state" });

function read<T>(key: string, fallback: T): T {
	const raw = cache.get(key);
	if (raw === undefined) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function write<T>(key: string, value: T) {
	cache.set(key, JSON.stringify(value));
}

type SetState<T> = (next: T | ((previous: T) => T)) => void;

/** State kept on disk and shared between the commands of the extension. */
export function useCachedState<T>(key: string, initial: T): [T, SetState<T>] {
	const [value, setValue] = useState<T>(() => read(key, initial));

	useEffect(
		() =>
			cache.subscribe((changed) => {
				if (changed === undefined || changed === key)
					setValue(read(key, initial));
			}),
		[key],
	);

	const update = useCallback<SetState<T>>(
		(next) => {
			const previous = read(key, initial);
			const resolved =
				typeof next === "function"
					? (next as (previous: T) => T)(previous)
					: next;
			write(key, resolved);
			setValue(resolved);
		},
		[key],
	);

	return [value, update];
}

// --- Provider -------------------------------------------------------------

interface StoredProvider {
	id: ProviderId;
	/** The preference value when the provider was switched in a view. */
	base: ProviderId;
}

function activeProviderId(
	stored: StoredProvider | null,
	preferred: ProviderId,
) {
	// A switch made in a view lasts until the Provider preference is changed.
	return stored && stored.base === preferred && isProviderId(stored.id)
		? stored.id
		: preferred;
}

/** The provider chosen in a view, or the one from the preferences. */
export function readActiveProvider(): TranslationProvider {
	const preferred = getSettings().provider;
	return getProvider(
		activeProviderId(read<StoredProvider | null>("provider", null), preferred),
	);
}

export function useProvider(): [TranslationProvider, (id: ProviderId) => void] {
	const preferred = getSettings().provider;
	const [stored, setStored] = useCachedState<StoredProvider | null>(
		"provider",
		null,
	);
	const provider = getProvider(activeProviderId(stored, preferred));
	const setProvider = useCallback(
		(id: ProviderId) => setStored({ id, base: preferred }),
		[preferred, setStored],
	);
	return [provider, setProvider];
}

// --- Language sets --------------------------------------------------------

export function usePreferencesLanguageSet(): LanguageSet {
	const settings = getSettings();
	return useMemo(
		() => preferencesLanguageSet(settings),
		[settings.langFrom, settings.lang1, settings.lang2],
	);
}

export function useSelectedLanguageSet(): [
	LanguageSet,
	(set: LanguageSet) => void,
] {
	const preferencesSet = usePreferencesLanguageSet();
	const [stored, setStored] = useCachedState<unknown>(
		"selectedLanguageSet",
		null,
	);
	const selected = useMemo(
		() => unifyLanguageSet(stored) ?? preferencesSet,
		[JSON.stringify(stored), preferencesSet],
	);
	return [selected, setStored];
}

export function useLanguageSets(): [
	LanguageSet[],
	(sets: LanguageSet[]) => void,
] {
	const [stored, setStored] = useCachedState<unknown[]>("languages", []);
	const sets = useMemo(
		() =>
			(Array.isArray(stored) ? stored : [])
				.map(unifyLanguageSet)
				.filter((set): set is LanguageSet => Boolean(set)),
		[JSON.stringify(stored)],
	);
	return [sets, setStored];
}

/** All sets in the order used by the language set dropdown and shortcuts. */
export function useAllLanguageSets(): LanguageSet[] {
	const preferencesSet = usePreferencesLanguageSet();
	const [sets] = useLanguageSets();
	return useMemo(
		() => [
			preferencesSet,
			...sets.filter((set) => !isSameLanguageSet(set, preferencesSet)),
		],
		[preferencesSet, sets],
	);
}

// --- Translate Quick ------------------------------------------------------

export function useSourceLanguage() {
	return useCachedState<string>("sourceLanguage", AUTO_DETECT);
}

export function useTargetLanguages() {
	const defaults = preferencesLanguageSet(getSettings()).langTo;
	return useCachedState<string[]>("targetLanguages", defaults);
}
