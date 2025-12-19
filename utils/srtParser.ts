import { LyricLine } from '../types';

export const parseSRT = (srtContent: string): LyricLine[] => {
  const lines = srtContent.trim().split(/\r?\n\r?\n/);
  const result: LyricLine[] = [];

  lines.forEach((chunk, index) => {
    const parts = chunk.split(/\r?\n/);
    if (parts.length >= 2) {
      // Handle the case where index might be missing in some malformed SRTs
      let timeString = parts[1];
      let textLines = parts.slice(2);

      // Simple heuristic: if the first line looks like a timestamp, use it
      if (parts[0].includes('-->')) {
        timeString = parts[0];
        textLines = parts.slice(1);
      }

      const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3}) --> (\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);

      if (timeMatch) {
        const startSeconds =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;

        const endSeconds =
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;

        result.push({
          id: `line-${index}`,
          startTime: startSeconds,
          endTime: endSeconds,
          text: textLines.join('\n'),
        });
      }
    }
  });

  return result;
};

export const parsePlainLyrics = (text: string, totalDuration: number): LyricLine[] => {
  const lines = text.trim().split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];
  
  // Default to 3 minutes if duration is 0 or invalid, to give some structure
  const durationToUse = totalDuration > 0 ? totalDuration : 180;
  const durationPerLine = durationToUse / lines.length;
  
  return lines.map((line, index) => ({
    id: `line-${index}`,
    startTime: index * durationPerLine,
    endTime: (index + 1) * durationPerLine,
    text: line.trim()
  }));
};

export const detectAndParse = (content: string, totalDuration: number): LyricLine[] => {
    // Check for SRT signature
    if (content.includes('-->')) {
        return parseSRT(content);
    }
    // Fallback to plain text distribution
    return parsePlainLyrics(content, totalDuration);
};

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const formatSRTTime = (seconds: number): string => {
    const date = new Date(0);
    date.setMilliseconds(seconds * 1000);
    const iso = date.toISOString();
    // 1970-01-01T00:00:00.000Z -> 00:00:00,000
    return iso.substr(11, 8) + ',' + iso.substr(20, 3);
}

// Helper to convert LyricLine[] back to a string format for editing
export const lyricsToString = (lyrics: LyricLine[]): string => {
  return lyrics.map((line, index) => {
    const start = formatSRTTime(line.startTime);
    const end = formatSRTTime(line.endTime);
    return `${index + 1}\n${start} --> ${end}\n${line.text}\n`;
  }).join('\n');
};

export const generateSRT = (lyrics: LyricLine[]): string => {
  return lyrics.map((line, index) => {
    const start = formatSRTTime(line.startTime);
    const end = formatSRTTime(line.endTime);
    // Combine text and translation if available
    const content = line.translation ? `${line.text}\n${line.translation}` : line.text;
    return `${index + 1}\n${start} --> ${end}\n${content}`;
  }).join('\n\n');
};
