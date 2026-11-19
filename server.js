const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ENTRIES_FILE = path.join(__dirname, 'data', 'entries.json');

function loadEntries() {
  try {
    return JSON.parse(fs.readFileSync(ENTRIES_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function saveEntries(entries) {
  fs.writeFileSync(ENTRIES_FILE, JSON.stringify(entries, null, 2));
}

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/entries', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || 'ALL').trim();
  const letter = String(req.query.letter || 'ALL').trim().toUpperCase();

  const entries = loadEntries().filter((item) => {
    const matchCat = category === 'ALL' || item.category === category;
    const matchLetter = letter === 'ALL' || item.term.trim().toUpperCase().startsWith(letter);
    const matchQuery =
      !q ||
      item.term.toLowerCase().includes(q) ||
      item.definition.toLowerCase().includes(q) ||
      item.details.toLowerCase().includes(q) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(q));
    return matchCat && matchLetter && matchQuery;
  });

  res.json(entries);
});

app.post('/api/entries', (req, res) => {
  const term = String(req.body.term || '').trim().slice(0, 120);
  const category = String(req.body.category || 'Records & Archive').trim().slice(0, 40);
  const partOfSpeech = String(req.body.partOfSpeech || 'Proper Noun / Institutional Record').trim().slice(0, 80);
  const definition = String(req.body.definition || '').trim().slice(0, 800);
  const details = String(req.body.details || '').trim().slice(0, 1200);
  const tags = String(req.body.tags || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!term || !definition) {
    return res.status(400).json({ error: 'Term and definition are required.' });
  }

  const entries = loadEntries();
  const newEntry = {
    id: `mnhs-${Date.now()}`,
    term,
    category,
    partOfSpeech,
    definition,
    details,
    tags,
    addedAt: new Date().toISOString().slice(0, 10)
  };

  entries.unshift(newEntry);
  saveEntries(entries);
  res.status(201).json(newEntry);
});

app.delete('/api/entries/:id', (req, res) => {
  const next = loadEntries().filter((item) => item.id !== req.params.id);
  saveEntries(next);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MNHS Reference Dictionary running at http://0.0.0.0:${PORT}`);
});
