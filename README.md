# TranslateThis [Vicinae extension]

A translator for [Vicinae](https://github.com/vicinaehq/vicinae) with selectable providers: **Google Translate** (no setup) and **DeepL** (your own API key). Translate as you type, to several languages at once, or straight from the selected text with one hotkey.

> Built on the ideas of the Raycast [Google Translate](https://github.com/raycast/extensions/tree/main/extensions/google-translate) extension, rewritten for Vicinae with a provider layer, so more services can be added later.

## Features

- Two providers: Google Translate and DeepL (Free and Pro keys). Pick the default in the preferences, switch with `Ctrl+Shift+P` in any view
- **Language sets**: a source language plus one or more target languages. Switch sets from the search bar dropdown or with the previous/next actions
- Smart direction: with one target language you also get the opposite direction, so you can type in either language. With two target languages (Primary and Secondary) text that is already in the primary language goes to the secondary one
- Translate to many languages at once in **Quick Translate**
- Instant commands that translate the selected text (or the argument) and copy it, paste it over the selection, or show it in a notification
- Pronunciation (romanization) from Google Translate, text-to-speech playback, "open in Google Translate / DeepL" on the web
- DeepL formality (more or less formal), DeepL usage of the current billing period
- Clear errors: missing key, unsupported language for the chosen provider, quota exceeded, network problems, each with an action that fixes it
- Optional HTTP proxy

## Installation

Build it from the source:

```bash
git clone https://github.com/Woysful/TranslateThis-Vicinae.git
cd ./TranslateThis-Vicinae
npm install
npm run build
```

> The extension is built to `~/.local/share/vicinae/extensions/translate-this/`

## Providers

| Provider | Setup | Languages | Notes |
|:--|:--|:--|:--|
| Google Translate | None | About 250 | Pronunciation, auto-detect, long texts are sent with POST |
| DeepL | API key | About 120 | Formality, usage, better quality for European languages |

### DeepL API key

1. Create a free account at [deepl.com/pro-api](https://www.deepl.com/pro-api) (500 000 characters a month on the Free plan).
2. Copy the key from [your account page](https://www.deepl.com/your-account/keys).
3. Paste it into **DeepL API Key** in the extension preferences.

Free keys end in `:fx` and use `api-free.deepl.com`; other keys use `api.deepl.com`. The extension picks the right one.

Languages that only one provider supports are marked in the language lists, for example "Abkhaz (Google Translate only)". When the active provider can't translate a language, the view says so and offers to switch the provider.

## Commands

| Command | What it does |
|:--|:--|
| `Translate` | Translates as you type with the selected language set. Starts with the selected text |
| `Quick Translate` | Translates the text into every language of your list at once. Add, remove and reorder languages in the view |
| `Translate Form` | Form for longer texts: provider, source and target languages, DeepL formality, swap languages |
| `Instant Translate Copy` | Translates the selected text (or the argument) and copies the translation |
| `Instant Translate Paste` | Translates the selected text (or the argument) and pastes the translation into the active window, replacing the selection |
| `Instant Translate View` | Translates the selected text (or the argument) and shows the translation in a desktop notification or a HUD |

> **Tip:** assign hotkeys to the instant commands in the Vicinae settings. Select text anywhere, press the hotkey, and the translation is copied or pasted.

The instant commands use the default language set: **Translate From**, **Primary Language** and **Secondary Language**.

## Shortcuts

| Shortcut | Action |
|:--|:--|
| `Enter` | Copy (or paste, see **Default Action**) the translation |
| `Ctrl+Shift+P` | Change provider |
| `Ctrl+F` | Toggle full text |
| `Ctrl+T` | Play text-to-speech |
| `Alt+Enter` | Open the translation on the provider's website |
| `Ctrl+Shift+R` | Copy pronunciation |
| `Ctrl+Shift+O` | Copy original text |
| `Ctrl+L` | Manage language sets |
| `Ctrl+Shift+S` | Swap languages (Translate Form) |
| `Ctrl+Shift+F` / `Ctrl+Shift+T` | Focus the source / target language (Translate Form) |
| `Ctrl+,` | Open the extension preferences |

The provider chosen with `Ctrl+Shift+P` (or in Translate Form) is remembered for every command until you change **Provider** in the preferences.

## Preferences

| Preference | Notes |
|:--|:--|
| Provider | Default translation service |
| DeepL API Key | Needed only for DeepL |
| DeepL Formality | Default, more formal or less formal. Languages without formality ignore it |
| Translate From, Primary Language, Secondary Language | The default language set. The secondary language is used when the text is already in the primary one |
| Autofill Input | Start the views with the selected text |
| Text Source | Selected text, selected text then clipboard, or clipboard then selected text |
| Default Action | What `Enter` does: copy or paste |
| Result Ordering | Move same-language results (English → English) to the bottom |
| Instant Translate View | Desktop notification or HUD |
| Text-to-Speech Player | A command that plays an MP3 file, `{file}` is replaced with its path (e.g. `mpv --volume=80 {file}`). Empty means the first of `mpv`, `ffplay`, `mpg123`, `pw-play`, `cvlc` found on `PATH` |
| HTTP Proxy URL | Used for every request, e.g. `http://proxy.example.com:8080` |

## Troubleshooting

- **"DeepL is not set up":** add the API key in the preferences, or switch to Google Translate with `Ctrl+Shift+P`.
- **"Quota exceeded" (DeepL):** the monthly character limit is used up. **Show DeepL Usage** shows the numbers.
- **Too many requests (Google):** Google limits its free endpoint. Wait a minute or use DeepL.
- **No text-to-speech:** install `mpv` (or another player from the list above), or set **Text-to-Speech Player**. Speech uses Google's voices for every provider.
- **Selected text is not picked up:** some applications don't expose the selection. Set **Text Source** to use the clipboard as well.

## Development

```bash
npm install
npm run dev            # vici develop
npm test               # provider, translation and manifest tests
npm run typecheck
npm run lint           # vici lint
```

### Adding a provider

1. Create `src/providers/<name>.ts` that implements `TranslationProvider` from [`src/providers/types.ts`](src/providers/types.ts): language mapping (`languages`, `resolve`), `translate`, `configurationError`, and optionally `webUrl` and `getUsage`.
2. Add its id to `ProviderId` and register it in `PROVIDERS` in [`src/providers/index.ts`](src/providers/index.ts).
3. If it needs a key, add a password preference to `package.json` and read it in `providerSettings` in [`src/lib/preferences.ts`](src/lib/preferences.ts).
4. Run `npm run sync-manifest` to regenerate the provider and language dropdowns of the preferences.

All commands, language pickers, error views and the provider switch pick the new provider up automatically. Languages use shared codes from [`src/lib/languages.ts`](src/lib/languages.ts); each provider maps them to its own codes.

## License

MIT
