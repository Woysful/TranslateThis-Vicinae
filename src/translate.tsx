import { ActionPanel, Icon, type LaunchProps, List } from "@vicinae/api";
import { useState } from "react";
import { ProviderActions } from "./components/actions";
import { ErrorEmptyView } from "./components/ErrorView";
import {
	LanguageSetDropdown,
	LanguageSetShifterActions,
} from "./components/LanguageSets";
import { TranslationItems } from "./components/TranslationItems";
import {
	TRANSLATE_DEBOUNCE_MS,
	useAsync,
	useDebouncedValue,
	useTextState,
} from "./lib/hooks";
import { formatLanguageSet } from "./lib/language-sets";
import { getSettings, providerSettings } from "./lib/preferences";
import { useProvider, useSelectedLanguageSet } from "./lib/state";
import {
	doubleWayTranslate,
	multiTranslate,
	type TargetOutcome,
} from "./lib/translate";

export default function Translate(props: LaunchProps) {
	const settings = getSettings();
	const [provider, setProvider] = useProvider();
	const [languageSet] = useSelectedLanguageSet();
	const [isShowingDetail, setIsShowingDetail] = useState(false);
	const [text, setText] = useTextState(props.fallbackText);
	const debounced = useDebouncedValue(text, TRANSLATE_DEBOUNCE_MS).trim();

	const { data, error, isLoading } = useAsync(
		async (signal): Promise<TargetOutcome[]> => {
			if (!debounced) return [];
			const context = {
				provider,
				settings: providerSettings(settings),
				signal,
			};
			if (languageSet.langTo.length === 1) {
				const results = await doubleWayTranslate(
					context,
					debounced,
					languageSet,
				);
				return results.map((result) => ({ to: result.to, result }));
			}
			return multiTranslate(
				context,
				debounced,
				languageSet,
				settings.prioritizeCrossLanguage,
			);
		},
		[debounced, provider.id, JSON.stringify(languageSet)],
	);

	const toggleDetail = () => setIsShowingDetail((value) => !value);
	const outcomes = debounced ? (data ?? []) : [];

	return (
		<List
			navigationTitle={`Translate · ${provider.name}`}
			searchBarPlaceholder="Enter text to translate"
			searchText={text}
			onSearchTextChange={setText}
			isLoading={isLoading && Boolean(debounced)}
			isShowingDetail={isShowingDetail && outcomes.length > 0}
			searchBarAccessory={<LanguageSetDropdown />}
			actions={
				<ActionPanel>
					<LanguageSetShifterActions />
					<ProviderActions provider={provider} onChange={setProvider} />
				</ActionPanel>
			}
		>
			{error && debounced ? (
				<ErrorEmptyView
					error={error}
					provider={provider}
					onProviderChange={setProvider}
				>
					<LanguageSetShifterActions />
				</ErrorEmptyView>
			) : outcomes.length === 0 ? (
				<List.EmptyView
					icon={debounced ? Icon.Hourglass : Icon.Text}
					title={debounced ? "Translating…" : "Type or paste text to translate"}
					description={`${formatLanguageSet(languageSet)} · ${provider.name}`}
				/>
			) : (
				outcomes.map((outcome, index) => (
					<TranslationItems
						key={`${index}-${outcome.to}`}
						outcome={outcome}
						provider={provider}
						onProviderChange={setProvider}
						onToggleDetail={toggleDetail}
						accessory="direction"
						pronunciationRow
						extraActions={<LanguageSetShifterActions />}
					/>
				))
			)}
		</List>
	);
}
