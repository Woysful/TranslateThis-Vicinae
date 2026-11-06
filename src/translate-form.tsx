import {
	Action,
	ActionPanel,
	Form,
	Icon,
	type LaunchProps,
	showToast,
	Toast,
} from "@vicinae/api";
import { useRef } from "react";
import {
	CopyPasteActions,
	ErrorActions,
	OpenInProviderAction,
	ProviderActions,
	SHORTCUTS,
	SpeakAction,
} from "./components/actions";
import { LanguageSetsList } from "./components/LanguageSets";
import {
	TRANSLATE_DEBOUNCE_MS,
	useAsync,
	useDebouncedValue,
	useTextState,
} from "./lib/hooks";
import { AUTO_DETECT, languageName, sortByName } from "./lib/languages";
import { getSettings, providerSettings } from "./lib/preferences";
import {
	useCachedState,
	useProvider,
	useSelectedLanguageSet,
} from "./lib/state";
import { translateText } from "./lib/translate";
import { isProviderId, PROVIDER_LIST } from "./providers";
import type {
	Formality,
	LanguageRole,
	TranslationProvider,
} from "./providers/types";

function languageItems(
	provider: TranslationProvider,
	role: LanguageRole,
	current: string,
) {
	const codes = provider.languages(role);
	const items = sortByName(codes).map((code) => ({
		code,
		title: languageName(code),
	}));
	if (current !== AUTO_DETECT && !codes.includes(current)) {
		const note = provider.resolve(current, role)
			? ""
			: ` (not supported by ${provider.name})`;
		items.unshift({ code: current, title: `${languageName(current)}${note}` });
	}
	return items;
}

const FORMALITY_OPTIONS: { value: Formality; title: string }[] = [
	{ value: "default", title: "Default" },
	{ value: "prefer_more", title: "More formal (polite)" },
	{ value: "prefer_less", title: "Less formal (plain)" },
];

export default function TranslateForm(props: LaunchProps) {
	const settings = getSettings();
	const [provider, setProvider] = useProvider();
	const [languageSet, setLanguageSet] = useSelectedLanguageSet();
	const [formality, setFormality] = useCachedState<Formality>(
		"formality",
		settings.formality,
	);
	const langFrom = languageSet.langFrom;
	const langTo = languageSet.langTo[0] ?? "en";
	const [text, setText] = useTextState(props.fallbackText);
	const debounced = useDebouncedValue(text, TRANSLATE_DEBOUNCE_MS);
	const textRef = useRef<Form.TextArea>(null);
	const fromRef = useRef<Form.Dropdown>(null);
	const toRef = useRef<Form.Dropdown>(null);

	const {
		data: result,
		error,
		isLoading,
	} = useAsync(
		async (signal) => {
			if (!debounced.trim()) return undefined;
			return translateText(
				{
					provider,
					settings: { ...providerSettings(settings), formality },
					signal,
				},
				debounced,
				langFrom,
				langTo,
			);
		},
		[debounced, provider.id, langFrom, langTo, formality],
	);
	const translation = debounced.trim() ? (result?.translatedText ?? "") : "";
	const detected =
		langFrom === AUTO_DETECT && result?.detected ? result.from : undefined;

	const handleTextChange = (value: string) => {
		const limit = provider.maxTextLength;
		if (limit && value.length > limit) {
			setText(value.slice(0, limit));
			showToast({
				style: Toast.Style.Failure,
				title: "Text is too long",
				message: `${provider.name} translates up to ${limit} characters at once`,
			});
		} else {
			setText(value);
		}
	};

	const swapLanguages = () => {
		const source = detected ?? langFrom;
		if (source === AUTO_DETECT) {
			showToast(Toast.Style.Failure, "Choose a source language first");
			return;
		}
		setLanguageSet({ langFrom: langTo, langTo: [source] });
		if (translation) setText(translation);
	};

	return (
		<Form
			navigationTitle={`Translate Form · ${provider.name}`}
			isLoading={isLoading && Boolean(debounced.trim())}
			actions={
				<ActionPanel>
					<ActionPanel.Section>
						<CopyPasteActions value={translation} label="Translation" />
						<Action.CopyToClipboard
							title="Copy Original Text"
							content={text}
							shortcut={SHORTCUTS.copyOriginal}
						/>
						{result?.pronunciation && (
							<Action.CopyToClipboard
								title="Copy Pronunciation"
								content={result.pronunciation}
								shortcut={SHORTCUTS.copyPronunciation}
							/>
						)}
						{translation && (
							<SpeakAction text={translation} language={langTo} />
						)}
						<OpenInProviderAction
							provider={provider}
							text={text}
							from={langFrom}
							to={langTo}
						/>
					</ActionPanel.Section>
					<ActionPanel.Section title="Languages">
						<Action
							title={`Swap: ${languageName(langTo)} → ${languageName(detected ?? langFrom)}`}
							icon={Icon.Switch}
							shortcut={SHORTCUTS.swapLanguages}
							onAction={swapLanguages}
						/>
						<Action
							title="Change Source Language"
							icon={Icon.ArrowUp}
							shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
							onAction={() => fromRef.current?.focus()}
						/>
						<Action
							title="Change Target Language"
							icon={Icon.ArrowDown}
							shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
							onAction={() => toRef.current?.focus()}
						/>
						<Action.Push
							title="Manage Language Sets…"
							icon={Icon.Pencil}
							shortcut={SHORTCUTS.manageLanguageSets}
							target={<LanguageSetsList />}
						/>
					</ActionPanel.Section>
					{error?.kind === "config" && <ErrorActions provider={provider} />}
					<ProviderActions provider={provider} onChange={setProvider} />
				</ActionPanel>
			}
		>
			<Form.Dropdown
				id="provider"
				title="Provider"
				value={provider.id}
				onChange={(value) => {
					if (isProviderId(value) && value !== provider.id) setProvider(value);
				}}
			>
				{PROVIDER_LIST.map((item) => (
					<Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
				))}
			</Form.Dropdown>
			<Form.TextArea
				id="text"
				title="Text"
				placeholder="Enter or paste text here"
				value={text}
				onChange={handleTextChange}
				ref={textRef}
			/>
			<Form.Dropdown
				id="from"
				title="From"
				value={langFrom}
				ref={fromRef}
				onChange={(value) => {
					if (value && value !== langFrom)
						setLanguageSet({ ...languageSet, langFrom: value });
				}}
			>
				<Form.Dropdown.Item value={AUTO_DETECT} title="Auto-Detect" />
				{languageItems(provider, "source", langFrom).map((item) => (
					<Form.Dropdown.Item
						key={item.code}
						value={item.code}
						title={item.title}
					/>
				))}
			</Form.Dropdown>
			{detected && (
				<Form.Description title="Detected" text={languageName(detected)} />
			)}
			<Form.Dropdown
				id="to"
				title="To"
				value={langTo}
				ref={toRef}
				onChange={(value) => {
					if (value && value !== langTo)
						setLanguageSet({ langFrom, langTo: [value] });
				}}
			>
				{languageItems(provider, "target", langTo).map((item) => (
					<Form.Dropdown.Item
						key={item.code}
						value={item.code}
						title={item.title}
					/>
				))}
			</Form.Dropdown>
			{provider.supportsFormality && (
				<Form.Dropdown
					id="formality"
					title="Formality"
					info="Applied by DeepL to languages that support it (German, French, Russian, Japanese, ...)"
					value={formality}
					onChange={(value) => setFormality(value as Formality)}
				>
					{FORMALITY_OPTIONS.map((option) => (
						<Form.Dropdown.Item
							key={option.value}
							value={option.value}
							title={option.title}
						/>
					))}
				</Form.Dropdown>
			)}
			<Form.Separator />
			<Form.TextArea
				id="translation"
				title="Translation"
				placeholder="Translation"
				value={translation}
			/>
			{result?.pronunciation && debounced.trim() && (
				<Form.Description title="Pronunciation" text={result.pronunciation} />
			)}
			{error && debounced.trim() && (
				<Form.Description
					title="Error"
					text={error.detail ? `${error.title}. ${error.detail}` : error.title}
				/>
			)}
		</Form>
	);
}
