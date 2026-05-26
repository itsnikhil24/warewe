const dns = require('node:dns/promises');

async function resolveMxRecords(domain, resolveMx = dns.resolveMx) {
  const records = await resolveMx(domain);

  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  return records
    .slice()
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .map((record) => record.exchange)
    .filter(Boolean);
}

module.exports = resolveMxRecords;