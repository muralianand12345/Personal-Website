export const MAX_ENTRIES = 1000;
export const MAX_RESULTS = 100;
export const MAX_TITLE = 80;
export const DURATION_RANGE = { min: 2, max: 15 } as const;

export const DEFAULT_TITLE = 'True or false?';
export const DEFAULT_ENTRIES = ['True', 'False'];

export type PaletteId = 'mono' | 'ember' | 'spectrum' | 'pink_purple_blue' | 'rainbow';

/**
 * Slice colors, in order. Neighbouring steps are far apart in lightness so
 * adjacent slices never blur together, whatever the entry count.
 */
export const PALETTES: Record<PaletteId, { label: string; colors: string[] }> = {
    // The site itself: white, black and the greys between.
    mono: { label: 'Mono', colors: ['#f5f5f5', '#262626', '#a3a3a3', '#4a4a4a'] },
    // Steps of the site accent, oklch(0.6 0.2 40).
    ember: {
        label: 'Ember',
        colors: ['#dc4400', '#f3dab2', '#7a2a0c', '#f3821d', '#3a1408', '#f2b966'],
    },
    // The dataviz categorical order (dark steps), same as the rate history chart.
    spectrum: {
        label: 'Spectrum',
        colors: [
            '#3987e5',
            '#d95926',
            '#199e70',
            '#c98500',
            '#d55181',
            '#008300',
            '#9085e9',
            '#e66767',
        ],
    },
    pink_purple_blue: {
        label: 'Chummi',
        colors: ['#ffb3c1', '#d9a1ff', '#a1b3ff', '#ff7f9e', '#c985ff', '#7faaff'],
    },
    rainbow: {
        label: 'Rainbow',
        colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8f00ff'],
    },
};

export type Settings = {
    duration: number;
    sound: boolean;
    confetti: boolean;
    autoRemove: boolean;
    palette: PaletteId;
};

export const DEFAULT_SETTINGS: Settings = {
    duration: 6,
    sound: true,
    confetti: true,
    autoRemove: false,
    palette: 'mono',
};

export type Result = { name: string; color: string; at: number };

/** One entry per non-blank line. Duplicates stay: listing a name twice doubles its odds. */
export const parseEntries = (text: string) =>
    text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_ENTRIES);

/** Drop the index-th entry from the raw text, leaving every other line as typed. */
export const removeEntryAt = (text: string, index: number) => {
    const lines = text.split('\n');
    let seen = -1;
    const at = lines.findIndex((line) => line.trim() && ++seen === index);
    if (at === -1) return text;
    lines.splice(at, 1);
    return lines.join('\n');
};

const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio, used here to tell neighbouring slices apart. */
const contrast = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

/**
 * Cycle the palette around the wheel. The last slice also touches the first,
 * so when the cycle would put the same color on both, it swaps in whichever
 * other color stands out most against both of its neighbours.
 */
export const sliceColors = (count: number, palette: string[]) => {
    const colors = Array.from({ length: count }, (_, i) => palette[i % palette.length]);
    const first = colors[0];
    const before = colors[count - 2];
    if (count > 2 && colors[count - 1] === first) {
        const score = (c: string) => Math.min(contrast(c, first), contrast(c, before));
        const candidates = palette.filter((c) => c !== first && c !== before);
        if (candidates.length) {
            colors[count - 1] = candidates.reduce((best, c) => (score(c) > score(best) ? c : best));
        }
    }
    return colors;
};

/** Black or white, whichever contrasts more with the slice. */
export const inkFor = (hex: string) => {
    const l = luminance(hex);
    return (l + 0.05) / 0.05 > 1.05 / (l + 0.05) ? '#0a0a0a' : '#ffffff';
};

/** Uniform in [0, 1) from the platform CSPRNG, so no spin is predictable from the last. */
export const secureRandom = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

export const shuffled = <T>(items: T[]) => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(secureRandom() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
};

// ---------------------------------------------------------------------------
// Share links: the wheel travels in the URL fragment, which browsers never
// send to the server, so a shared list stays between the people who have it.
// ---------------------------------------------------------------------------

const SHARE_PARAM = 'w';

const toBase64Url = (text: string) => {
    let binary = '';
    for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value: string) => {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
};

export const shareUrl = (title: string, entries: string[]) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.hash = `${SHARE_PARAM}=${toBase64Url(JSON.stringify({ t: title, e: entries }))}`;
    return url.toString();
};

export const readShared = (hash: string): { title: string; entries: string[] } | null => {
    const value = new URLSearchParams(hash.replace(/^#/, '')).get(SHARE_PARAM);
    if (!value) return null;
    try {
        const { t, e } = JSON.parse(fromBase64Url(value));
        if (!Array.isArray(e) || !e.every((x) => typeof x === 'string')) return null;
        return {
            title: typeof t === 'string' ? t.slice(0, MAX_TITLE) : '',
            entries: parseEntries(e.join('\n')),
        };
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// Persistence. Everything stays in this browser; a bad or outdated record
// falls back field by field rather than wiping the rest.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'lucky-wheel:v1';

export type SavedWheel = { text: string; title: string; settings: Settings; results: Result[] };

const isResult = (r: unknown): r is Result =>
    !!r &&
    typeof (r as Result).name === 'string' &&
    typeof (r as Result).color === 'string' &&
    typeof (r as Result).at === 'number';

export const loadWheel = (): Partial<SavedWheel> => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        if (!raw || typeof raw !== 'object') return {};
        const s = raw.settings ?? {};
        return {
            text: typeof raw.text === 'string' ? raw.text : undefined,
            title: typeof raw.title === 'string' ? raw.title.slice(0, MAX_TITLE) : undefined,
            settings: {
                duration:
                    Number.isFinite(s.duration) &&
                    s.duration >= DURATION_RANGE.min &&
                    s.duration <= DURATION_RANGE.max
                        ? s.duration
                        : DEFAULT_SETTINGS.duration,
                sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
                confetti: typeof s.confetti === 'boolean' ? s.confetti : DEFAULT_SETTINGS.confetti,
                autoRemove:
                    typeof s.autoRemove === 'boolean' ? s.autoRemove : DEFAULT_SETTINGS.autoRemove,
                palette: Object.hasOwn(PALETTES, s.palette) ? s.palette : DEFAULT_SETTINGS.palette,
            },
            results: Array.isArray(raw.results)
                ? raw.results.filter(isResult).slice(0, MAX_RESULTS)
                : undefined,
        };
    } catch {
        return {};
    }
};

export const saveWheel = (wheel: SavedWheel) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wheel));
    } catch {}
};
