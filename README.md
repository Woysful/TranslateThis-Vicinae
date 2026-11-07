# TranslateThis [Vicinae extension]

A translator for [Vicinae](https://github.com/vicinaehq/vicinae) with selectable providers: **Google Translate** (no setup) and **DeepL** (your own API key). Translate as you type (or on Enter, to save API characters), to several languages at once, or straight into the clipboard or the previous window.

> Built on the ideas of the Raycast [Google Translate](https://github.com/raycast/extensions/tree/main/extensions/google-translate) extension, rewritten for Vicinae with a provider layer, so more services can be added later.

## Features

- Two providers: Google Translate and DeepL (Free and Pro keys). Pick the default in the preferences, switch with `Ctrl+Shift+P` in any view
- **Language sets**: a source language plus one or more target languages. Switch sets from the search bar dropdown or with the previous/next actions
- Smart direction: with one target language you also get the opposite direction, so you can type in either language. With two target languages (Primary and Secondary) text that is already in the primary language goes to the secondary one
- Translate to many languages at once in **Translate Quick**
- **Translate as You Type** can be turned off: then text is translated only when you press `Enter`, so DeepL characters are not spent on every keystroke
- Instant commands: type the text after the command and get the translation in the clipboard or pasted into the window you came from
- Optional pronunciation (romanization) from Google Translate, text-to-speech playback, "open in Google Translate / DeepL" on the web
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
| `Translate` | Translates with the selected language set. Starts with the selected text |
| `Translate Quick` | Translates the text into every language of your list at once. Add, remove and reorder languages in the view |
| `Translate Form` | Form for longer texts: provider, source and target languages, DeepL formality, swap languages |
| `Instant Translate Copy` | Translates the text typed after the command and copies the translation |
| `Instant Translate Paste` | Translates the text typed after the command and pastes the translation into the window that was active before Vicinae |

### Instant commands

Type the command name, press `Tab`, type or paste the text and press `Enter`:

```
Instant Translate Paste  ⇥  see you tomorrow
```

The text goes to the primary language of the preferences, or to the secondary one when it is already in the primary language. When nothing is typed after the command, the selected text is used (see **Text Source**).

- **Selected text** comes from the primary selection (the text you highlighted last). Vicinae reads it with the `ext-data-control` Wayland protocol, which recent versions of Sway, Hyprland, niri, KDE Plasma and other compositors support, and only while clipboard monitoring is on in the Vicinae Clipboard History settings. GNOME doesn't have the protocol, so there type the text after the command.
- **Paste** uses the Vicinae input server (Settings → Advanced → Input server, on by default). Vicinae puts the translation into the clipboard, sends the paste shortcut to the previous window and then restores your clipboard.

## Shortcuts

| Shortcut | Action |
|:--|:--|
| `Enter` | Copy (or paste, see **Default Action**) the translation. With **Translate as You Type** off: translate |
| `Ctrl+Enter` | Translate (Translate Form, with **Translate as You Type** off) |
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
| Translate as You Type | On: translate while typing (with a short pause). Off: translate only on `Enter` in Translate and Translate Quick and on `Ctrl+Enter` in Translate Form. Changing the provider or the languages also waits for the next `Enter` |
| Pronunciation | Show the Latin romanization from Google Translate, e.g. "Vsem privet" under "Всем привет" |
| Text Source | Selected text, selected text then clipboard, or clipboard then selected text. Used when a view opens and by the instant commands when nothing is typed after the command |
| Default Action | What `Enter` does: copy or paste |
| Result Ordering | Move same-language results (English → English) to the bottom |
| Text-to-Speech Player | A command that plays an MP3 file, `{file}` is replaced with its path (e.g. `mpv --volume=80 {file}`). Empty means the first of `mpv`, `ffplay`, `mpg123`, `pw-play`, `cvlc` found on `PATH` |
| HTTP Proxy URL | Used for every request, e.g. `http://proxy.example.com:8080` |

## Troubleshooting

- **"DeepL is not set up":** add the API key in the preferences, or switch to Google Translate with `Ctrl+Shift+P`.
- **"Quota exceeded" (DeepL):** the monthly character limit is used up. **Show DeepL Usage** shows the numbers.
- **Too many requests (Google):** Google limits its free endpoint. Wait a minute or use DeepL.
- **No text-to-speech:** install `mpv` (or another player from the list above), or set **Text-to-Speech Player**. Speech uses Google's voices for every provider.
- **Selected text is not picked up:** your compositor may not support `ext-data-control` (GNOME), or clipboard monitoring is off in the Vicinae Clipboard History settings. Type the text after the command, or set **Text Source** to use the clipboard as well.
- **Instant Translate Paste does not paste:** check that the input server is on in the Vicinae settings (Settings → Advanced). The translation then stays in the clipboard, paste it with `Ctrl+V`.

## Development

```bash
npm install
npm run dev            # vici develop
npm test               # provider, translation, manifest and query tests
npm run typecheck
npm run lint           # vici lint
```

### Adding a provider

1. Create `src/providers/<name>.ts` that implements `TranslationProvider` from [`src/providers/types.ts`](src/providers/types.ts): language mapping (`languages`, `resolve`), `translate`, `configurationError`, and optionally `webUrl` and `getUsage`.
2. Add its id to `ProviderId` and register it in `PROVIDERS` in [`src/providers/index.ts`](src/providers/index.ts).
3. If it needs a key, add a password preference to `package.json` and read it in `providerSettings` in [`src/lib/preferences.ts`](src/lib/preferences.ts).
4. Run `npm run sync-manifest` to regenerate the provider and language dropdowns of the preferences.

All commands, language pickers, error views and the provider switch pick the new provider up automatically. Languages use shared codes from [`src/lib/languages.ts`](src/lib/languages.ts); each provider maps them to its own codes.

## Credits

Parts of this extension are adapted from other MIT-licensed projects:

- [Raycast Google Translate extension](https://github.com/raycast/extensions/tree/main/extensions/google-translate): the commands and their layout, language sets and how they are stored, and the translation logic (choosing between the primary and secondary language, translating to several languages and in both directions). Ported to the Vicinae API and rewritten around providers.
- [iamtraction/google-translate](https://github.com/iamtraction/google-translate), vendored by the Raycast extension: the Google Translate language codes and names, and the request to the free Google Translate endpoint with its response parsing.
- [google-tts-api](https://github.com/zlargon/google-tts): the text-to-speech URL and splitting long texts into 200-character parts, reimplemented without the dependency.
- [Raycast DeepCast extension](https://github.com/raycast/extensions/tree/main/extensions/deepcast): a reference for the DeepL API (Free and Pro hosts, quota errors). The DeepL provider itself follows the [DeepL API documentation](https://developers.deepl.com/docs).

## License

MIT
