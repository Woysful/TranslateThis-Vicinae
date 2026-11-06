import {
	Action,
	ActionPanel,
	Color,
	Form,
	Icon,
	Keyboard,
	List,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import { useState } from "react";
import { formatLanguageSet, isSameLanguageSet } from "../lib/language-sets";
import {
	ALL_LANGUAGE_CODES,
	AUTO_DETECT,
	languageName,
} from "../lib/languages";
import {
	useAllLanguageSets,
	useLanguageSets,
	usePreferencesLanguageSet,
	useSelectedLanguageSet,
} from "../lib/state";
import type { LanguageSet } from "../lib/translate";
import { supportNote } from "../providers";

export function languageTitle(code: string, role: "source" | "target") {
	const note = supportNote(code, role);
	return note ? `${languageName(code)} (${note})` : languageName(code);
}

const TARGET_CODES = ALL_LANGUAGE_CODES;

function AddLanguageSetForm({ onAdd }: { onAdd: (set: LanguageSet) => void }) {
	const [langFrom, setLangFrom] = useState(AUTO_DETECT);
	const [targets, setTargets] = useState<string[]>(["en"]);
	const rows = [...targets, ""];

	return (
		<Form
			navigationTitle="Add Language Set"
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Add Language Set"
						onSubmit={() => {
							const langTo = [...new Set(targets.filter(Boolean))];
							if (!langTo.length) {
								showToast({
									style: Toast.Style.Failure,
									title: "No target languages",
									message: "Choose at least one target language",
								});
								return;
							}
							onAdd({ langFrom, langTo });
						}}
					/>
				</ActionPanel>
			}
		>
			<Form.Dropdown
				id="langFrom"
				title="Source Language"
				value={langFrom}
				onChange={setLangFrom}
			>
				<Form.Dropdown.Item value={AUTO_DETECT} title="Auto-Detect" />
				{ALL_LANGUAGE_CODES.map((code) => (
					<Form.Dropdown.Item
						key={code}
						value={code}
						title={languageTitle(code, "source")}
					/>
				))}
			</Form.Dropdown>
			{rows.map((value, index) => (
				<Form.Dropdown
					// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
					key={index}
					id={`langTo.${index}`}
					title={`Target Language ${index + 1}`}
					value={value}
					onChange={(code) => {
						const next = [...targets];
						if (code) next[index] = code;
						else next.splice(index, 1);
						setTargets(next.filter(Boolean));
					}}
				>
					<Form.Dropdown.Item
						value=""
						title={index < targets.length ? "Remove" : "—"}
					/>
					{TARGET_CODES.map((code) => (
						<Form.Dropdown.Item
							key={code}
							value={code}
							title={languageTitle(code, "target")}
						/>
					))}
				</Form.Dropdown>
			))}
		</Form>
	);
}

function LanguageSetItem({
	set,
	selected,
	onSelect,
	onDelete,
	isPreferences,
}: {
	set: LanguageSet;
	selected: boolean;
	onSelect: () => void;
	onDelete?: () => void;
	isPreferences?: boolean;
}) {
	const targets = set.langTo.map(languageName).join(", ");
	return (
		<List.Item
			title={`${languageName(set.langFrom)}   →`}
			subtitle={` ${targets}`}
			keywords={[set.langFrom, ...set.langTo, ...set.langTo.map(languageName)]}
			icon={
				selected
					? { source: Icon.Checkmark, tintColor: Color.Green }
					: undefined
			}
			accessories={isPreferences ? [{ tag: "Preferences" }] : undefined}
			actions={
				<ActionPanel>
					<Action
						title="Select"
						icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
						onAction={onSelect}
					/>
					{onDelete && (
						<Action
							title="Delete"
							icon={Icon.Trash}
							style={Action.Style.Destructive}
							shortcut={Keyboard.Shortcut.Common.Remove}
							onAction={onDelete}
						/>
					)}
				</ActionPanel>
			}
		/>
	);
}

export function LanguageSetsList() {
	const navigation = useNavigation();
	const preferencesSet = usePreferencesLanguageSet();
	const [selected, setSelected] = useSelectedLanguageSet();
	const [sets, setSets] = useLanguageSets();
	const isSaved =
		isSameLanguageSet(preferencesSet, selected) ||
		sets.some((set) => isSameLanguageSet(set, selected));

	const select = (set: LanguageSet) => {
		setSelected(set);
		navigation.pop();
	};

	return (
		<List
			navigationTitle="Language Sets"
			searchBarPlaceholder="Search language sets"
		>
			<List.Item
				icon={Icon.Plus}
				title="Add New Language Set…"
				actions={
					<ActionPanel>
						<Action.Push
							icon={Icon.Plus}
							title="Add New Language Set…"
							shortcut={Keyboard.Shortcut.Common.New}
							target={
								<AddLanguageSetForm
									onAdd={(set) => {
										if (!sets.some((item) => isSameLanguageSet(item, set))) {
											setSets([...sets, set]);
										}
										navigation.pop();
										showToast(
											Toast.Style.Success,
											"Language set saved",
											formatLanguageSet(set),
										);
									}}
								/>
							}
						/>
						{sets.length > 0 && (
							<Action
								title="Delete All Saved Sets"
								icon={Icon.Trash}
								style={Action.Style.Destructive}
								shortcut={Keyboard.Shortcut.Common.RemoveAll}
								onAction={() => setSets([])}
							/>
						)}
					</ActionPanel>
				}
			/>
			{!isSaved && (
				<List.Item
					icon={Icon.SaveDocument}
					title="Save Current Set"
					subtitle={formatLanguageSet(selected)}
					actions={
						<ActionPanel>
							<Action
								title="Save Current Set"
								onAction={() => setSets([...sets, selected])}
							/>
						</ActionPanel>
					}
				/>
			)}
			<LanguageSetItem
				set={preferencesSet}
				isPreferences
				selected={isSameLanguageSet(selected, preferencesSet)}
				onSelect={() => select(preferencesSet)}
			/>
			{sets
				.filter((set) => !isSameLanguageSet(set, preferencesSet))
				.map((set) => (
					<LanguageSetItem
						key={`${set.langFrom} ${set.langTo.join()}`}
						set={set}
						selected={isSameLanguageSet(selected, set)}
						onSelect={() => select(set)}
						onDelete={() => {
							setSets(sets.filter((item) => !isSameLanguageSet(item, set)));
							showToast(
								Toast.Style.Success,
								"Language set deleted",
								formatLanguageSet(set),
							);
						}}
					/>
				))}
		</List>
	);
}

const MANAGE = "manage";

export function LanguageSetDropdown() {
	const navigation = useNavigation();
	const [selected, setSelected] = useSelectedLanguageSet();
	const sets = useAllLanguageSets();

	return (
		<List.Dropdown
			tooltip="Language Set"
			value={JSON.stringify(selected)}
			onChange={(value) => {
				if (value === MANAGE) {
					navigation.push(<LanguageSetsList />);
					return;
				}
				try {
					const set = JSON.parse(value) as LanguageSet;
					if (!isSameLanguageSet(set, selected)) setSelected(set);
				} catch {
					// not a language set value
				}
			}}
		>
			<List.Dropdown.Item
				icon={Icon.Pencil}
				title="Manage Language Sets…"
				value={MANAGE}
			/>
			{!sets.some((set) => isSameLanguageSet(set, selected)) && (
				<List.Dropdown.Item
					title={formatLanguageSet(selected)}
					value={JSON.stringify(selected)}
				/>
			)}
			{sets.map((set) => (
				<List.Dropdown.Item
					key={JSON.stringify(set)}
					title={formatLanguageSet(set)}
					value={JSON.stringify(set)}
				/>
			))}
		</List.Dropdown>
	);
}

/** Previous/next language set, also usable with keyboard shortcuts. */
export function LanguageSetShifterActions() {
	const [selected, setSelected] = useSelectedLanguageSet();
	const sets = useAllLanguageSets();
	const index = sets.findIndex((set) => isSameLanguageSet(set, selected));
	const move = (step: number) => {
		if (!sets.length) return;
		const next = index < 0 ? 0 : (index + step + sets.length) % sets.length;
		setSelected(sets[next]);
	};

	return (
		<ActionPanel.Section title="Language Set">
			<Action
				title="Previous Language Set"
				icon={Icon.ArrowUp}
				shortcut={Keyboard.Shortcut.Common.MoveUp}
				onAction={() => move(-1)}
			/>
			<Action
				title="Next Language Set"
				icon={Icon.ArrowDown}
				shortcut={Keyboard.Shortcut.Common.MoveDown}
				onAction={() => move(1)}
			/>
			<Action.Push
				title="Manage Language Sets…"
				icon={Icon.Pencil}
				target={<LanguageSetsList />}
			/>
		</ActionPanel.Section>
	);
}
