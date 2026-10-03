/**
 * Heuristic CV parser.
 * Splits raw text on common section headers and picks out bullets, dates, etc.
 * Good enough for a demo — can be replaced by an AI call later.
 */

const SECTION_PATTERNS = [
  { key: 'summary',       re: /^(professional\s+)?(summary|profile|objective|about(\s+me)?)\s*:?\s*$/i },
  { key: 'experience',    re: /^(work\s+)?(experience|employment|professional\s+experience)\s*:?\s*$/i },
  { key: 'education',     re: /^(education|academic|qualifications)\s*:?\s*$/i },
  { key: 'skills',        re: /^(technical\s+)?(skills|competencies|expertise)\s*:?\s*$/i },
  { key: 'projects',      re: /^(personal\s+)?(projects|portfolio)\s*:?\s*$/i },
  { key: 'certifications',re: /^(certifications?|licenses?|courses?)\s*:?\s*$/i },
  { key: 'languages',     re: /^languages?\s*:?\s*$/i },
  { key: 'awards',        re: /^(awards?|honors?|achievements?)\s*:?\s*$/i },
];

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /(https?:\/\/[^\s]+|(?:www\.|linkedin\.com\/|github\.com\/)[^\s]+)/i;
const DATE_RANGE_RE = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4})\s*[-–—to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current)/i;

function cleanLine(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function isBullet(line) {
  return /^[•·▪◦‣\-*\u2022\u25CF]\s+/.test(line);
}

function stripBullet(line) {
  return line.replace(/^[•·▪◦‣\-*\u2022\u25CF]\s+/, '').trim();
}

/** Split text into sections using header heuristics. */
function splitSections(lines) {
  const sections = { header: [] };
  let current = 'header';

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    const match = SECTION_PATTERNS.find((p) => p.re.test(line));
    if (match) {
      current = match.key;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(raw);
  }
  return sections;
}

/** Extract name/email/phone/links from the header block. */
function parseHeader(lines) {
  const info = { name: '', email: '', phone: '', location: '', linkedin: '', github: '' };
  const joined = lines.join('\n');

  const emailMatch = joined.match(EMAIL_RE);
  if (emailMatch) info.email = emailMatch[0];

  const phoneMatch = joined.match(PHONE_RE);
  if (phoneMatch) info.phone = phoneMatch[0].trim();

  const linkedinMatch = joined.match(/((?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,|·]+)/i);
  if (linkedinMatch) info.linkedin = linkedinMatch[0];

  const githubMatch = joined.match(/((?:https?:\/\/)?(?:www\.)?github\.com\/[^\s,|·]+)/i);
  if (githubMatch) info.github = githubMatch[0];

  // Name: the first line that isn't an email/phone/URL and looks title-cased
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || URL_RE.test(line)) continue;
    if (line.length > 60) continue;
    // Reject obvious section headers
    if (SECTION_PATTERNS.some((p) => p.re.test(line))) continue;
    // Reject lines that are ALL CAPS but contain common keywords
    if (/^(resume|curriculum vitae|cv)$/i.test(line)) continue;
    info.name = line;
    break;
  }

  // Location: look for "City, Country" pattern in the header block
  const locMatch = joined.match(/([A-Z][a-zA-Z .'-]+,\s*[A-Z][a-zA-Z .'-]+)/);
  if (locMatch) info.location = locMatch[1];

  return info;
}

/** Parse experience/education-style block into entries. */
function parseEntries(lines) {
  const entries = [];
  let current = null;

  const push = () => {
    if (current && (current.title || current.subtitle || current.bullets.length)) {
      entries.push(current);
    }
  };

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    if (isBullet(line)) {
      if (!current) current = { title: '', subtitle: '', meta: '', bullets: [] };
      current.bullets.push(stripBullet(line));
      continue;
    }

    // Detect a heading line: has a date range, or is short and title-cased
    const hasDate = DATE_RANGE_RE.test(line);
    const isShortTitle = line.length < 80 && /[A-Za-z]/.test(line) && !line.endsWith('.');

    if (hasDate || isShortTitle) {
      // If the current entry has bullets, treat this as a new entry
      if (current && current.bullets.length > 0) {
        push();
        current = null;
      }
      if (!current) current = { title: '', subtitle: '', meta: '', bullets: [] };

      const dateMatch = line.match(DATE_RANGE_RE);
      if (dateMatch) {
        current.meta = dateMatch[0];
        const rest = line.replace(dateMatch[0], '').replace(/[|,·•\-–—]\s*$/, '').trim();
        if (rest && !current.title) current.title = rest;
        else if (rest && !current.subtitle) current.subtitle = rest;
      } else if (!current.title) {
        current.title = line;
      } else if (!current.subtitle) {
        current.subtitle = line;
      }
      continue;
    }

    // Otherwise treat as continuation of subtitle
    if (current && !current.subtitle) current.subtitle = line;
    else if (current) current.bullets.push(line);
    else {
      current = { title: line, subtitle: '', meta: '', bullets: [] };
    }
  }
  push();
  return entries;
}

/** Parse a skills block into { technical: [], soft: [] }. */
function parseSkills(lines) {
  const joined = lines.join('\n');
  const cleaned = joined
    .replace(/\n/g, ',')
    .split(/[,•·|]/)
    .map((s) => s.trim())
    .filter((s) => s && s.length < 40);

  return { technical: cleaned, soft: [] };
}

/** Parse projects into { name, description, tech, link }. */
function parseProjects(lines) {
  const projects = [];
  let current = null;
  const push = () => { if (current && current.name) projects.push(current); };

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) continue;

    if (isBullet(line)) {
      if (!current) current = { name: '', description: '', tech: [], link: '' };
      const body = stripBullet(line);
      current.description = current.description ? `${current.description} ${body}` : body;
      continue;
    }

    if (line.length < 80) {
      push();
      current = { name: line, description: '', tech: [], link: '' };
      const urlMatch = line.match(URL_RE);
      if (urlMatch) current.link = urlMatch[0];
      continue;
    }
    if (!current) current = { name: 'Project', description: '', tech: [], link: '' };
    current.description = current.description ? `${current.description} ${line}` : line;
  }
  push();
  return projects;
}

/** Top-level: raw text → structured CV object. */
export function structureCV(rawText) {
  const lines = rawText.split(/\r?\n/);
  const sections = splitSections(lines);

  const header = parseHeader(sections.header || []);
  const summary = (sections.summary || []).map(cleanLine).filter(Boolean).join(' ');

  const experience = parseEntries(sections.experience || []).map((e, i) => ({
    id: `exp-${i}`,
    role: e.title || '',
    company: e.subtitle || '',
    startDate: (e.meta || '').split(/[-–—to]+/i)[0]?.trim() || '',
    endDate: (e.meta || '').split(/[-–—to]+/i)[1]?.trim() || '',
    bullets: e.bullets.length ? e.bullets : [''],
  }));

  const education = parseEntries(sections.education || []).map((e, i) => ({
    id: `edu-${i}`,
    degree: e.title || '',
    institution: e.subtitle || '',
    year: e.meta || '',
    gpa: '',
  }));

  const skills = parseSkills(sections.skills || []);

  const projects = parseProjects(sections.projects || []).map((p, i) => ({
    id: `prj-${i}`,
    ...p,
  }));

  return {
    personalInfo: header,
    summary,
    experience,
    education,
    skills,
    projects,
    certifications: (sections.certifications || []).map(cleanLine).filter(Boolean),
    languages: (sections.languages || []).map(cleanLine).filter(Boolean),
    awards: (sections.awards || []).map(cleanLine).filter(Boolean),
    _raw: rawText,
  };
}