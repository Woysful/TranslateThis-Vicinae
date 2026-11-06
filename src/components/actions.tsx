import {
	Action,
	ActionPanel,
	Icon,
	Keyboard,
	openExtensionPreferences,
	showToast,
	Toast,
} from "@vicinae/api";
import { toTranslateError } from "../lib/errors";
import { getSettings, providerSettings } from "../lib/preferences";
import type { TranslationResult } from "../lib/translate";
import { speak } from "../lib/tts";
import { PROVIDER_LIST } from "../providers";
import type { ProviderId, TranslationProvider } from "../providers/types";

export const SHORTCUTS = {
	toggleDetail: { modifiers: ["cmd"], key: "f" },
	speak: { modifiers: ["cmd"], key: "t" },
	openWebsite: { modifiers: ["opt"], key: "enter" },
	changeProvider: { modifiers: ["cmd", "shift"], key: "p" },
	preferences: { modifiers: ["cmd"], key: "," },
	copyPronunciation: { modifiers: ["cmd", "shift"], key: "r" },
	copyOriginal: { modifiers: ["cmd", "shift"], key: "o" },
	swapLanguages: { modifiers: ["cmd", "shift"], key: "s" },
	manageLanguageSets: { modifiers: ["cmd"], key: "l" },
} satisfies Record<string, Keyboard.Shortcut>;

/** Copy and Paste, ordered by the Default Action preference. */
export function CopyPasteActions({
	value,
	label,
}: {
	value: string;
	label?: string;
}) {
	const suffix = label ? ` ${label}` : "";
	const copy = (
		<Action.CopyToClipboard
			key="copy"
			title={`Copy${suffix}`}
			content={value}
			shortcut={Keyboard.Shortcut.Common.Copy}
		/>
	);
	const paste = (
		<Action.Paste key="paste" title={`Paste${suffix}`} content={value} />
	);
	return (
		<>
			{getSettings().defaultAction === "paste" ? [paste, copy] : [copy, paste]}
		</>
	);
}

export function ToggleDetailAction({ onAction }: { onAction: () => void }) {
	return (
		<Action
			title="Toggle Full Text"
			icon={Icon.Text}
			shortcut={SHORTCUTS.toggleDetail}
			onAction={onAction}
		/>
	);
}

export async function speakWithFeedback(text: string, language: string) {
	const settings = getSettings();
	const toast = await showToast({
		style: Toast.Style.Animated,
		title: "Preparing speech…",
	});
	try {
		await speak(text, language, {
			proxy: providerSettings(settings).proxy,
			player: settings.ttsPlayer,
		});
		await toast.hide();
	} catch (error) {
		const translateError = toTranslateError(error);
		await toast.hide();
		await showToast({
			style: Toast.Style.Failure,
			title: translateError.title,
			message: translateError.detail,
		});
	}
}

export function SpeakAction({
	text,
	language,
}: {
	text: string;
	language: string;
}) {
	return (
		<Action
			title="Play Text-to-Speech"
			icon={Icon.SpeakerOn}
			shortcut={SHORTCUTS.speak}
			onAction={() => speakWithFeedback(text, language)}
		/>
	);
}

export function OpenInProviderAction({
	provider,
	text,
	from,
	to,
}: {
	provider: TranslationProvider;
	text: string;
	from: string;
	to: string;
}) {
	const url = provider.webUrl?.(text, from, to);
	if (!url) return null;
	return (
		<Action.OpenInBrowser
			title={`Open in ${provider.name}`}
			url={url}
			shortcut={SHORTCUTS.openWebsite}
		/>
	);
}

export function ResultActions({
	result,
	provider,
}: {
	result: TranslationResult;
	provider: TranslationProvider;
}) {
	return (
		<>
			<SpeakAction text={result.translatedText} language={result.to} />
			<OpenInProviderAction
				provider={provider}
				text={result.originalText}
				from={result.from}
				to={result.to}
			/>
		</>
	);
}

async function showUsage(provider: TranslationProvider) {
	if (!provider.getUsage) return;
	const toast = await showToast({
		style: Toast.Style.Animated,
		title: `Checking ${provider.name} usage…`,
	});
	try {
		const usage = await provider.getUsage(providerSettings(getSettings()));
		const format = (value: number) => value.toLocaleString("en-US");
		const percent = usage.limit
			? Math.round((usage.used / usage.limit) * 100)
			: 0;
		await toast.hide();
		await showToast({
			style: Toast.Style.Success,
			title: `${provider.name}: ${percent}% used`,
			message: `${format(usage.used)} of ${format(usage.limit)} ${usage.unit}`,
		});
	} catch (error) {
		const translateError = toTranslateError(error);
		await toast.hide();
		await showToast({
			style: Toast.Style.Failure,
			title: translateError.title,
			message: translateError.detail,
		});
	}
}

/** Change Provider submenu, provider extras and the preferences. */
export function ProviderActions({
	provider,
	onChange,
}: {
	provider: TranslationProvider;
	onChange: (id: ProviderId) => void;
}) {
	return (
		<ActionPanel.Section title={provider.name}>
			<ActionPanel.Submenu
				title="Change Provider"
				icon={Icon.Switch}
				shortcut={SHORTCUTS.changeProvider}
			>
				{PROVIDER_LIST.map((item) => (
					<Action
						key={item.id}
						title={item.name}
						icon={item.id === provider.id ? Icon.Checkmark : undefined}
						onAction={() => onChange(item.id)}
					/>
				))}
			</ActionPanel.Submenu>
			{provider.getUsage && (
				<Action
					title={`Show ${provider.name} Usage`}
					icon={Icon.Gauge}
					onAction={() => showUsage(provider)}
				/>
			)}
			<Action
				title="Open Extension Preferences"
				icon={Icon.Cog}
				shortcut={SHORTCUTS.preferences}
				onAction={openExtensionPreferences}
			/>
		</ActionPanel.Section>
	);
}

/** Actions that help with a failed translation. */
export function ErrorActions({ provider }: { provider: TranslationProvider }) {
	return (
		<ActionPanel.Section>
			{provider.apiKeyUrl && (
				<Action.OpenInBrowser
					title={`Get ${provider.name} API Key`}
					url={provider.apiKeyUrl}
				/>
			)}
		</ActionPanel.Section>
	);
}
