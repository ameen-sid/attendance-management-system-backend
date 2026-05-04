/**
 * Checks if a given date is after the specified time in the given timezone.
 * @param date The date to check (JS Date object)
 * @param thresholdTime Time in "HH:mm" format (24h)
 * @param timeZone The target timezone (default: Asia/Kolkata)
 */
export const isTimeAfter = (date: Date, thresholdTime: string, timeZone: string = 'Asia/Kolkata'): boolean => {
    try {
        // Use Intl.DateTimeFormat to get the time in the specified timezone
        const formatter = new Intl.DateTimeFormat('en-GB', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        const parts = formatter.formatToParts(date);
        const hours = parts.find(p => p.type === 'hour')?.value || '00';
        const minutes = parts.find(p => p.type === 'minute')?.value || '00';
        
        const currentTime = `${hours}:${minutes}`;
        return currentTime > thresholdTime;
    } catch (error) {
        console.error("Error in isTimeAfter calculation:", error);
        // Fallback to local time if timezone is invalid
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}` > thresholdTime;
    }
};
