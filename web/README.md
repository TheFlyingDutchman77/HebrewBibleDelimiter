# Hebrew Bible Delimiter Web App

This is a separate, static browser version of the desktop app. It does not modify or depend on the Python app, and Hebrew text is processed locally in your browser.

## Run locally

Open `index.html` in a modern browser. No server, Python installation, or external JavaScript library is required.

## Publish with GitHub Pages

The repository-level workflow at `.github/workflows/pages.yml` publishes this `web` folder whenever changes are pushed to the `main` branch (and can also be run manually). In GitHub, open **Settings → Pages** and set the source to **GitHub Actions**. After the first successful workflow run, GitHub Pages will show the website URL.

If the repository's default branch is not `main`, update the workflow's branch filter to match it.

## Notes

- Accent marking and line-break processing are performed in the browser; pasted text is not uploaded to a server.
- **RTL Preview** opens a direction-aware view in a new tab. The regular output field preserves logical Unicode text order and may not display every mixed-direction line identically in all browsers.
- **Save Word** downloads a real `.docx` with RTL paragraphs, right alignment, and SBL Hebrew font settings. SBL Hebrew must be installed on the computer opening the file.
- Browser security does not allow a webpage to launch Word directly or close a tab it did not open; use the browser's tab close button to exit.
