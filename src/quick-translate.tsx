import { ActionPanel, Icon, type LaunchProps, List } from "@vicinae/api";
import { useState } from "react";
import { ProviderActions } from "./components/actions";
import { ErrorEmptyView } from "./components/ErrorView";
import { SourceLanguageDropdown } from "./components/QuickTranslate";
import {
	TranslatePromptItem,
	TranslationItems,
} from "./components/TranslationItems";
import { useAsync, useTextState, useTranslationQuery } from "./lib/hooks";
import { languageName } from "./lib/languages";
import { getSettings, providerSettings } from "./lib/preferences";
import {
	useProvider,
	useSourceLanguage,
	useTargetLanguages,
} from "./lib/state";
import { multiTranslate } from "./lib/translate";

export default function TranslateQuick(props: LaunchProps) {
	const settings = getSettings();
	const [provider, setProvider] = useProvider();
	const [source] = useSourceLanguage();
	const [targets] = useTargetLanguages();
	const [isShowingDetail, setIsShowingDetail] = useState(true);
	const [text, setText] = useTextState(props.fallbackText);
	const { query, pending, auto, submit } = useTranslationQuery(
		text,
		`${provider.id}:${source}:${targets.join()}`,
	);

	const { data, error, isLoading } = useAsync(
		async (signal) =>
			query
				? multiTranslate(
						{ provider, settings: providerSettings(settings), signal },
						query,
						{ langFrom: source, langTo: targets },
						settings.prioritizeCrossLanguage,
					)
				: [],
		[query, provider.id, source, targets.join()],
	);

	const outcomes = query ? (data ?? []) : [];
	const description = `${languageName(source)} → ${targets.map(languageName).join(", ")} · ${provider.name}`;

	return (
		<List
			navigationTitle={`Translate Quick · ${provider.name}`}
			searchBarPlaceholder="Enter text to translate"
			searchText={text}
			onSearchTextChange={setText}
			isLoading={isLoading && Boolean(query)}
			isShowingDetail={isShowingDetail && outcomes.length > 0}
			searchBarAccessory={<SourceLanguageDropdown />}
			actions={
				<ActionPanel>
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
				/>
			) : error && query ? (
				<ErrorEmptyView
					error={error}
					provider={provider}
					onProviderChange={setProvider}
				/>
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
				outcomes.map((outcome) => (
					<TranslationItems
						key={outcome.to}
						outcome={outcome}
						provider={provider}
						onProviderChange={setProvider}
						onToggleDetail={() => setIsShowingDetail((value) => !value)}
						accessory="target"
					/>
				))
			)}
		</List>
	);
}
