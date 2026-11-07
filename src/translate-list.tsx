import { ActionPanel, Icon, type LaunchProps, List } from "@vicinae/api";
import { useState } from "react";
import { ProviderActions } from "./components/actions";
import { ErrorEmptyView } from "./components/ErrorView";
import {
	LanguageSetDropdown,
	LanguageSetShifterActions,
} from "./components/LanguageSets";
import {
	TranslatePromptItem,
	TranslationItems,
} from "./components/TranslationItems";
import { useAsync, useTextState, useTranslationQuery } from "./lib/hooks";
import { formatLanguageSet } from "./lib/language-sets";
import { getSettings, providerSettings } from "./lib/preferences";
import { useProvider, useSelectedLanguageSet } from "./lib/state";
import {
	doubleWayTranslate,
	multiTranslate,
	type TargetOutcome,
} from "./lib/translate";

export default function TranslateList(props: LaunchProps) {
	const settings = getSettings();
	const detailsLayout = settings.listLayout === "details";
	const [provider, setProvider] = useProvider();
	const [languageSet] = useSelectedLanguageSet();
	const [isShowingDetail, setIsShowingDetail] = useState(detailsLayout);
	const [text, setText] = useTextState(props.fallbackText);
	const setKey = JSON.stringify(languageSet);
	const { query, pending, auto, submit } = useTranslationQuery(
		text,
		`${provider.id}:${setKey}`,
	);

	const { data, error, isLoading } = useAsync(
		async (signal): Promise<TargetOutcome[]> => {
			if (!query) return [];
			const context = {
				provider,
				settings: providerSettings(settings),
				signal,
			};
			if (languageSet.langTo.length === 1) {
				const results = await doubleWayTranslate(context, query, languageSet);
				return results.map((result) => ({ to: result.to, result }));
			}
			return multiTranslate(
				context,
				query,
				languageSet,
				settings.prioritizeCrossLanguage,
			);
		},
		[query, provider.id, setKey],
	);

	const toggleDetail = () => setIsShowingDetail((value) => !value);
	const outcomes = query ? (data ?? []) : [];
	const description = `${formatLanguageSet(languageSet)} · ${provider.name}`;

	return (
		<List
			navigationTitle={`Translate List · ${provider.name}`}
			searchBarPlaceholder="Enter text to translate"
			searchText={text}
			onSearchTextChange={setText}
			isLoading={isLoading && Boolean(query)}
			isShowingDetail={isShowingDetail && outcomes.length > 0}
			searchBarAccessory={<LanguageSetDropdown />}
			actions={
				<ActionPanel>
					<LanguageSetShifterActions />
					<ProviderActions provider={provider} onChange={setProvider} />
				</ActionPanel>
			}
		>
			{pending ? (
				<TranslatePromptItem
					text={text}
					description={description}
					provider={provider}
					onTranslate={submit}
					onProviderChange={setProvider}
					extraActions={<LanguageSetShifterActions />}
				/>
			) : error && query ? (
				<ErrorEmptyView
					error={error}
					provider={provider}
					onProviderChange={setProvider}
				>
					<LanguageSetShifterActions />
				</ErrorEmptyView>
			) : outcomes.length === 0 ? (
				<List.EmptyView
					icon={query ? Icon.Hourglass : Icon.Text}
					title={
						query
							? "Translating…"
							: auto
								? "Type or paste text to translate"
								: "Type or paste text, then press Enter to translate"
					}
					description={description}
				/>
			) : (
				outcomes.map((outcome, index) => (
					<TranslationItems
						key={`${index}-${outcome.to}`}
						outcome={outcome}
						provider={provider}
						onProviderChange={setProvider}
						onToggleDetail={toggleDetail}
						accessory={detailsLayout ? "target" : "direction"}
						pronunciationRow={!detailsLayout}
						extraActions={<LanguageSetShifterActions />}
					/>
				))
			)}
		</List>
	);
}
