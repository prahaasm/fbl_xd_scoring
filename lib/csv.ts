export interface ParsedPlayerRow {
  name: string;
}

export interface CsvParseResult<T> {
  rows: T[];
  errors: string[];
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Parses a single-column "PlayerName" CSV (with or without a header row). */
export function parsePlayersCsv(text: string): CsvParseResult<ParsedPlayerRow> {
  const lines = splitLines(text);
  const errors: string[] = [];
  const rows: ParsedPlayerRow[] = [];
  const seen = new Set<string>();

  const startIndex = lines[0]?.toLowerCase().replace(/["\s]/g, '') === 'playername' ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const name = lines[i].replace(/^"|"$/g, '').trim();
    const lineNumber = i + 1;

    if (!name) {
      errors.push(`Line ${lineNumber}: empty row`);
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push(`Line ${lineNumber}: duplicate player "${name}"`);
      continue;
    }
    seen.add(key);
    rows.push({ name });
  }

  return { rows, errors };
}

export interface ParsedTeamRow {
  group: string;
  player1: string;
  player2: string;
}

/** Parses a "Group,Player1,Player2" CSV (with or without a header row). */
export function parseTeamsCsv(text: string): CsvParseResult<ParsedTeamRow> {
  const lines = splitLines(text);
  const errors: string[] = [];
  const rows: ParsedTeamRow[] = [];
  const seen = new Set<string>();

  const startIndex = lines[0]?.toLowerCase().replace(/\s/g, '') === 'group,player1,player2' ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const lineNumber = i + 1;
    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());

    if (cols.length < 3 || cols.some((c) => !c)) {
      errors.push(`Line ${lineNumber}: missing or empty values (expected Group,Player1,Player2)`);
      continue;
    }

    const [group, player1, player2] = cols;
    const key = `${player1.toLowerCase()}|${player2.toLowerCase()}`;
    if (seen.has(key)) {
      errors.push(`Line ${lineNumber}: duplicate team "${player1} & ${player2}"`);
      continue;
    }
    seen.add(key);
    rows.push({ group, player1, player2 });
  }

  return { rows, errors };
}
