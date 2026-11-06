import { Action, ActionPanel, Icon, List } from "@vicinae/api";
import type { ReactNode } from "react";
import { languageName } from "../lib/languages";
import type { TargetOutcome, TranslationResult } from "../lib/translate";
import { getProvider } from "../providers";
import type { ProviderId, TranslationProvider } from "../providers/types";
import {
	CopyPasteActions,
	ErrorActions,
	ProviderActions,
	ResultActions,
	SHORTCUTS,
	ToggleDetailAction,
} from "./actions";

function ResultDetail({ result }: { result: TranslationResult }) {
	const pronunciation = result.pronunciation
		? `\n\n\`\`\`\n${result.pronunciation}\n\`\`\``
		: "";
	return (
		<List.Item.Detail
			markdown={`${result.translatedText}${pronunciation}`}
			metadata={
				<List.Item.Detail.Metadata>
					<List.Item.Detail.Metadata.TagList title="Source Language">
						{result.detected && (
							<List.Item.Detail.Metadata.TagList.Item
								text="Auto-Detected"
								color="#FECD57"
							/>
						)}
						<List.Item.Detail.Metadata.TagList.Item
							text={languageName(result.from)}
							color="#A0D468"
						/>
					</List.Item.Detail.Metadata.TagList>
					<List.Item.Detail.Metadata.TagList title="Target Language">
						<List.Item.Detail.Metadata.TagList.Item
							text={languageName(result.to)}
							color="#B3A5EF"
						/>
					</List.Item.Detail.Metadata.TagList>
					<List.Item.Detail.Metadata.Separator />
					<List.Item.Detail.Metadata.Label
						title="Provider"
						text={getProvider(result.providerId).name}
					/>
					<List.Item.Detail.Metadata.Label
						title="Characters"
						text={String(Array.from(result.originalText).length)}
					/>
				</List.Item.Detail.Metadata>
			}
		/>
	);
}

interface Props {
	outcome: TargetOutcome;
	provider: TranslationProvider;
	onProviderChange: (id: ProviderId) => void;
	onToggleDetail: () => void;
	/** "direction" shows "English → Russian", "target" only "Russian". */
	accessory: "direction" | "target";
	/** Shows the pronunciation as its own row, like the Translate command of Google Translate. */
	pronunciationRow?: boolean;
	extraActions?: ReactNode;
}

export function TranslationItems(props: Props) {
	const { outcome, provider } = props;

	if (outcome.error) {
		return (
			<List.Item
				icon={Icon.Warning}
				title={outcome.error.title}
				subtitle={outcome.error.detail}
				accessories={[{ text: languageName(outcome.to) }]}
				detail={
					<List.Item.Detail
						markdown={`**${outcome.error.title}**\n\n${outcome.error.detail}`}
					/>
				}
				actions={
					<ActionPanel>
						<ErrorActions provider={provider} />
						<ProviderActions
							provider={provider}
							onChange={props.onProviderChange}
						/>
						{props.extraActions}
					</ActionPanel>
				}
			/>
		);
	}

	const result = outcome.result;
	const direction = `${languageName(result.from)} → ${languageName(result.to)}`;
	const accessories = [
		{
			text:
				props.accessory === "direction" ? direction : languageName(result.to),
			tooltip: direction,
		},
	];

	const actions = (value: string, label: string) => (
		<ActionPanel>
			<ActionPanel.Section>
				<CopyPasteActions value={value} label={label} />
				{result.pronunciation && value !== result.pronunciation && (
					<Action.CopyToClipboard
						title="Copy Pronunciation"
						content={result.pronunciation}
						shortcut={SHORTCUTS.copyPronunciation}
					/>
				)}
				<Action.CopyToClipboard
					title="Copy Original Text"
					content={result.originalText}
					shortcut={SHORTCUTS.copyOriginal}
				/>
				<ToggleDetailAction onAction={props.onToggleDetail} />
				<ResultActions result={result} provider={provider} />
			</ActionPanel.Section>
			{props.extraActions}
			<ProviderActions provider={provider} onChange={props.onProviderChange} />
		</ActionPanel>
	);

	return (
		<>
			<List.Item
				title={result.translatedText}
				accessories={accessories}
				detail={<ResultDetail result={result} />}
				actions={actions(result.translatedText, "Translation")}
			/>
			{props.pronunciationRow && result.pronunciation && (
				<List.Item
					icon={Icon.SpeechBubble}
					title={result.pronunciation}
					accessories={accessories}
					detail={<ResultDetail result={result} />}
					actions={actions(result.pronunciation, "Pronunciation")}
				/>
			)}
		</>
	);
}
