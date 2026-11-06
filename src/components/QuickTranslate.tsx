import {
	Action,
	ActionPanel,
	clearSearchBar,
	Icon,
	Keyboard,
	List,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import {
	ALL_LANGUAGE_CODES,
	AUTO_DETECT,
	languageName,
} from "../lib/languages";
import { useSourceLanguage, useTargetLanguages } from "../lib/state";
import { supportNote } from "../providers";
import { languageTitle } from "./LanguageSets";

function supportAccessory(code: string) {
	const note = supportNote(code, "target");
	return note ? [{ text: note }] : undefined;
}

export function TargetLanguageList() {
	const [targets, setTargets] = useTargetLanguages();

	const move = (code: string, step: number) => {
		const index = targets.indexOf(code);
		const next = index + step;
		if (index < 0 || next < 0 || next >= targets.length) return;
		const updated = [...targets];
		updated.splice(next, 0, updated.splice(index, 1)[0]);
		setTargets(updated);
	};

	return (
		<List
			navigationTitle="Target Languages"
			searchBarPlaceholder="Search languages"
		>
			<List.Section
				title="Selected Languages"
				subtitle={String(targets.length)}
			>
				{targets.map((code) => (
					<List.Item
						key={code}
						title={languageName(code)}
						subtitle={code}
						accessories={supportAccessory(code)}
						actions={
							<ActionPanel>
								<Action
									title="Remove"
									icon={Icon.Minus}
									style={Action.Style.Destructive}
									shortcut={Keyboard.Shortcut.Common.Remove}
									onAction={() => {
										if (targets.length === 1) {
											showToast(
												Toast.Style.Failure,
												"Keep at least one target language",
											);
											return;
										}
										setTargets(targets.filter((item) => item !== code));
										clearSearchBar();
									}}
								/>
								<Action
									title="Move Up"
									icon={Icon.ArrowUp}
									shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
									onAction={() => move(code, -1)}
								/>
								<Action
									title="Move Down"
									icon={Icon.ArrowDown}
									shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
									onAction={() => move(code, 1)}
								/>
							</ActionPanel>
						}
					/>
				))}
			</List.Section>
			<List.Section title="Available Languages">
				{ALL_LANGUAGE_CODES.filter((code) => !targets.includes(code)).map(
					(code) => (
						<List.Item
							key={code}
							title={languageName(code)}
							subtitle={code}
							accessories={supportAccessory(code)}
							actions={
								<ActionPanel>
									<Action
										title="Add"
										icon={Icon.Plus}
										shortcut={Keyboard.Shortcut.Common.New}
										onAction={() => {
											setTargets((previous) => [...previous, code]);
											clearSearchBar();
										}}
									/>
								</ActionPanel>
							}
						/>
					),
				)}
			</List.Section>
		</List>
	);
}

const MANAGE_TARGETS = "manageTargetLanguages";

export function SourceLanguageDropdown() {
	const navigation = useNavigation();
	const [source, setSource] = useSourceLanguage();
	const [targets] = useTargetLanguages();

	return (
		<List.Dropdown
			tooltip="Source Language"
			value={source}
			onChange={(value) => {
				if (value === MANAGE_TARGETS) navigation.push(<TargetLanguageList />);
				else if (value !== source) setSource(value);
			}}
		>
			<List.Dropdown.Item
				icon={Icon.Pencil}
				title={`Translate to → ${targets.map(languageName).join(", ")}`}
				value={MANAGE_TARGETS}
			/>
			<List.Dropdown.Section title="Translate from">
				<List.Dropdown.Item title="Auto-Detect" value={AUTO_DETECT} />
				{ALL_LANGUAGE_CODES.map((code) => (
					<List.Dropdown.Item
						key={code}
						title={languageTitle(code, "source")}
						value={code}
					/>
				))}
			</List.Dropdown.Section>
		</List.Dropdown>
	);
}
