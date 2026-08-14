const DEFAULT_LOCALE = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

const DEFAULT_TIMEZONE = typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

export function formatUtcTimestamp(
    utcTimestamp: string | Date | null | undefined,
    options?: {
        locale?: string;
        timezone?: string;
        includeDate?: boolean;
        includeTime?: boolean;
        includeSeconds?: boolean;
    },
): string {
    if (!utcTimestamp) return '—';

    const date = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
    if (isNaN(date.getTime())) return '—';

    const locale = options?.locale ?? DEFAULT_LOCALE;
    const timezone = options?.timezone ?? DEFAULT_TIMEZONE;
    const includeDate = options?.includeDate ?? true;
    const includeTime = options?.includeTime ?? true;
    const includeSeconds = options?.includeSeconds ?? true;

    const parts: Intl.DateTimeFormatOptions[] = [];

    if (includeDate) {
        parts.push({
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    if (includeTime) {
        parts.push({
            hour: '2-digit',
            minute: '2-digit',
            ...(includeSeconds ? { second: '2-digit' } : {}),
            hour12: false,
        });
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        ...parts.reduce((acc, p) => ({ ...acc, ...p }), {}),
    };

    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
}

export function formatUtcDate(utcTimestamp: string | Date | null | undefined, locale?: string): string {
    return formatUtcTimestamp(utcTimestamp, { locale, includeTime: false });
}

export function formatUtcTime(utcTimestamp: string | Date | null | undefined, locale?: string): string {
    return formatUtcTimestamp(utcTimestamp, { locale, includeDate: false });
}

export function toUtcIsoString(date: Date): string {
    return date.toISOString();
}

export function getCurrentUtcTimestamp(): string {
    return new Date().toISOString();
}
