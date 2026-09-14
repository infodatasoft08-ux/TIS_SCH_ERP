// Known valid Top-Level Domains (gTLDs, ccTLDs, modern brand/generic TLDs)
const VALID_TLDS = new Set([
  // Generic & Standard TLDs
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro',
  'museum', 'coop', 'aero',
  // Common Modern & Tech TLDs
  'io', 'ai', 'app', 'dev', 'tech', 'online', 'store', 'site', 'xyz', 'me', 'co',
  'cloud', 'digital', 'global', 'systems', 'solutions', 'academy', 'expert',
  'community', 'network', 'center', 'agency', 'design', 'blog', 'live', 'life',
  'world', 'today', 'space', 'media', 'group', 'email', 'school', 'education',
  'institute', 'college', 'university', 'club', 'shop', 'link', 'work', 'one',
  'page', 'fun', 'vip', 'fit', 'art', 'icu', 'top',
  // Country Code TLDs (ccTLDs)
  'in', 'uk', 'us', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'ru', 'br', 'za', 'sg',
  'ae', 'nz', 'nl', 'it', 'es', 'se', 'no', 'fi', 'dk', 'ch', 'at', 'be', 'pl',
  'ie', 'id', 'my', 'ph', 'pk', 'bd', 'np', 'lk', 'mx', 'ar', 'cl', 'pe', 'kr',
  'tw', 'hk', 'th', 'vn', 'sa', 'eg', 'ng', 'ke', 'tr', 'gr', 'cz', 'ro', 'hu',
  'ua', 'il', 'ir'
]);

// Recognized multi-part TLD endings (e.g. .co.in, .edu.in, .gov.in, .ac.in, .co.uk)
const VALID_MULTI_TLDS = new Set([
  'co.in', 'gov.in', 'edu.in', 'res.in', 'ac.in', 'org.in', 'net.in', 'nic.in',
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.nz', 'ac.nz', 'govt.nz', 'org.nz', 'net.nz',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'com.br', 'net.br', 'org.br', 'gov.br',
  'com.sg', 'edu.sg', 'gov.sg', 'org.sg',
  'ac.ae', 'gov.ae', 'co.ae',
  'com.mx', 'edu.mx', 'gob.mx',
  'com.tr', 'edu.tr', 'gov.tr',
  'com.my', 'edu.my', 'gov.my',
  'com.pk', 'edu.pk', 'gov.pk',
  'com.bd', 'edu.bd', 'gov.bd',
  'com.np', 'edu.np', 'gov.np',
  'co.za', 'gov.za', 'edu.za'
]);

// Common domain typos to explicitly reject
const COMMON_DOMAIN_TYPOS = new Set([
  'con', 'coom', 'cm', 'cmo', 'comm', 'coms', 'comc', 'comg', 'comt', 'ckm',
  'cpm', 'xom', 'som', 'fom', 'gmal', 'gmai', 'gamil', 'gmial', 'yaho', 'outlok'
]);

/**
 * Validates whether an email string is formatted correctly and uses a legitimate TLD.
 * - Must match username@domain.tld structure
 * - Username and Domain labels must follow strict RFC standards
 * - Top-Level Domain (TLD) must be a recognized gTLD / ccTLD / multi-part ccTLD
 * - Rejects malformed/excessive TLDs like .comsfdsf, .comcggvvgcfcgcgcgg
 * - Rejects double dots (..) or leading/trailing dots/hyphens
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length < 6 || trimmed.length > 254) return false;

  // Split into username and domain parts
  const parts = trimmed.split('@');
  if (parts.length !== 2) return false;

  const [username, domain] = parts;

  // Validate Username
  if (!username || username.length > 64) return false;
  if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) return false;
  if (!/^[a-z0-9._%+-]+$/.test(username)) return false;

  // Validate Domain
  if (!domain || domain.length > 253) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) return false;
  if (domain.includes('..')) return false;
  if (!domain.includes('.')) return false;

  const domainParts = domain.split('.');
  if (domainParts.length < 2) return false;

  // Check each domain segment
  for (const part of domainParts) {
    if (!part || part.length > 63) return false;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(part)) return false;
  }

  // Check TLD validity
  const primaryTld = domainParts[domainParts.length - 1];
  const lastTwoParts = domainParts.length >= 3 ? `${domainParts[domainParts.length - 2]}.${primaryTld}` : null;

  // If last two parts make a known multi-part ccTLD (like .co.in, .ac.in), it is valid
  if (lastTwoParts && VALID_MULTI_TLDS.has(lastTwoParts)) {
    return true;
  }

  // Otherwise, primary TLD must be in VALID_TLDS and not a typo
  if (!VALID_TLDS.has(primaryTld)) {
    return false;
  }

  // Check for common TLD typos
  if (COMMON_DOMAIN_TYPOS.has(primaryTld)) {
    return false;
  }

  return true;
};

