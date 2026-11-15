# VMJAM Sales Web Dashboard — 60-second showreel

1920 × 1080 / 60 fps / H.264 video / AAC stereo / exactly 60 seconds.

Visual thesis: warm black and gold, oversized type, and sharply framed report screens bring an owner's daily review into focus.

Content plan: brand → synchronization → overview → sales → profitability → inventory → customers → cash flow → targets → reports → feature montage → signature.

Motion thesis: kinetic type marks chapters; progressive chart drawings and counters explain the data; camera moves across actual demonstration screens connect detail to the whole workspace.

## Watch or edit

- `vmjam-sales-web-dashboard-60s.mp4`: finished video.
- `storyboard.jpg` and `stills/`: twelve composition previews.
- `film.js`: deterministic animation and timing.
- `audio.mjs`: original synthesized electronic score and sound effects.
- `assets/`: real dashboard screenshots from the repository's feature guide, plus fonts and their licenses.

Run `npm install` and `npm run preview`, then open http://127.0.0.1:4177. Play, pause, seek, replay, or download the MP4. Run `npm run render` to regenerate the soundtrack and video, or `npm run stills` for composition checks. Set `CHROME_PATH` if Chrome is installed in a different location.

Screenshots use the synthetic fixtures in `scripts/feature-guide/generate-feature-guide.spec.ts`; no live account or business database is accessed. Enlarged metrics repeat those demo values. The film describes synchronized snapshots, not real-time reporting. The dashboard's cost-coverage qualifications remain visible. This project is separate from the Angular application.

| Seconds | Scene |
| --- | --- |
| 0–4 | VMJAM Sales Web Dashboard |
| 4–9 | From counter to browser, through a synchronized snapshot |
| 9–15 | Overview and the daily numbers |
| 15–20 | Sales records |
| 20–26 | Recorded profit and cost coverage |
| 26–32 | Inventory and reorder planning |
| 32–37 | Customer insights |
| 37–42 | Cash flow |
| 42–47 | Sales targets |
| 47–52 | Reports and saved views |
| 52–56 | Review / Compare / Plan / Decide |
| 56–60 | Closing brand signature |
