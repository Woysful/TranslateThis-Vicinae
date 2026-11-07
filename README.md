# TranslateThis [Vicinae extension]

A translator for [Vicinae](https://github.com/vicinaehq/vicinae) with **Google Translate** (no setup) and **DeepL** (your own API key).

## Installation

Download `translate-this-<version>.tar.gz` from the [latest release](https://github.com/Woysful/TranslateThis-Vicinae/releases/latest) and unpack it:

```bash
mkdir -p ~/.local/share/vicinae/extensions
tar -xzf translate-this-*.tar.gz -C ~/.local/share/vicinae/extensions
```

Or build it from the source:

```bash
git clone https://github.com/Woysful/TranslateThis-Vicinae.git
cd ./TranslateThis-Vicinae
npm install
npm run build
```

Restart Vicinae if the commands don't show up.

## Commands

| Command | What it does |
|:--|:--|
| `Translate` | Form with provider, languages, DeepL formality and language swap |
| `Translate List` | Translates with the selected language set: to several languages at once, or in both directions |
| `Translate & Copy` | Translates the text typed after the command and copies the translation |
| `Translate & Paste` | Translates the text typed after the command and pastes it into the previous window |

For Translate & Copy and Translate & Paste, type the command name, press `Tab`, then type the text and press `Enter`. With nothing typed they can take the text from the clipboard (**Autofill \| Copy/Paste** preference). Paste needs the Vicinae input server (Settings → Advanced).

Press `Ctrl+Shift+P` in any view to switch the provider.

## DeepL API key

1. Create a free account at [deepl.com/pro-api](https://www.deepl.com/pro-api) (500 000 characters a month).
2. Copy the key from [your account page](https://www.deepl.com/your-account/keys).
3. Paste it into **DeepL API Key** in the extension preferences.

## Development

```bash
npm install
npm run dev
npm test
```

To add a provider, implement `TranslationProvider` from [`src/providers/types.ts`](src/providers/types.ts), register it in [`src/providers/index.ts`](src/providers/index.ts) and run `npm run sync-manifest`.

## Credits

Adapted in part from these MIT-licensed projects:

- [Raycast Google Translate extension](https://github.com/raycast/extensions/tree/main/extensions/google-translate): commands, language sets and translation logic
- [iamtraction/google-translate](https://github.com/iamtraction/google-translate): Google Translate languages and request
- [google-tts-api](https://github.com/zlargon/google-tts): text-to-speech URL and text splitting
- [Raycast DeepCast extension](https://github.com/raycast/extensions/tree/main/extensions/deepcast): DeepL API reference

## License

MIT
