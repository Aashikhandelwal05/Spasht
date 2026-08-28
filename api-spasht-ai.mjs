const RESPONSE_HEADERS = { 'Content-Type': 'application/json' };

function fallbackResult(task, payload = {}) {
  const request = `${payload.request || ''} ${payload.clarification || ''}`.toLowerCase();
  const residenceWords = ['live', 'where i live', 'residence', 'resident', 'domicile', 'address', 'rajasthan'];

  if (task === 'understand') {
    const vague = request.includes('certificate') && request.includes('college') && !residenceWords.some((word) => request.includes(word));
    if (vague && !payload.clarification) {
      return {
        clear: false,
        question: "Are you trying to prove where you live, your family's income, or something else?",
        visibleReason: 'Your request mentions college and a certificate, but not what the certificate must prove.',
      };
    }
    return {
      clear: true,
      intent: 'prove_residence',
      service: 'Domicile Certificate',
      explanation: 'A domicile certificate can be used to prove that you are a resident of a particular state or place.',
      reasoning: 'You told us you need to prove where you live for a college-related requirement.',
    };
  }

  if (task === 'requirements') {
    return {
      summary: "You're almost ready.",
      missing: 'Residence proof',
      why: "This proof helps establish where you've been living.",
      recovery: ['I have another document', 'I need to get this proof'],
    };
  }

  if (task === 'name_check') {
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    const a = normalize(payload.applicationName);
    const b = normalize(payload.documentName);
    const distance = levenshtein(a, b);
    if (a === b) return { status: 'clean', message: 'No common name-matching issues found.', why: '' };
    if (distance <= 3) {
      return {
        status: 'near',
        message: 'These names are very similar, but the spelling is different.',
        why: 'Fixing this now may help avoid problems during later verification.',
      };
    }
    return {
      status: 'different',
      message: 'These names look different.',
      why: 'A larger mismatch may need correction before official submission.',
    };
  }

  return {};
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function buildPrompt(task, payload) {
  return [
    'You are Spasht, a calm civic-tech guide for citizens in India.',
    'Return only valid JSON. Do not include markdown.',
    'All government information is mock prototype guidance, not official advice.',
    'Use plain language for a first-time smartphone user.',
    `Task: ${task}`,
    `Payload: ${JSON.stringify(payload)}`,
    'Schema for understand: {"clear":boolean,"question":string,"intent":string,"service":string,"explanation":string,"reasoning":string,"visibleReason":string}',
    'Schema for requirements: {"summary":string,"missing":string,"why":string,"recovery":string[]}',
    'Schema for name_check: {"status":"clean"|"near"|"different","message":string,"why":string}',
  ].join('\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, RESPONSE_HEADERS);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;
  const { task, payload } = JSON.parse(body || '{}');

  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(200, RESPONSE_HEADERS);
    res.end(JSON.stringify({ source: 'local-fallback', result: fallbackResult(task, payload) }));
    return;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.SPASHT_OPENAI_MODEL || 'gpt-5-mini',
      input: buildPrompt(task, payload),
      text: { format: { type: 'json_object' } },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    res.writeHead(200, RESPONSE_HEADERS);
    res.end(JSON.stringify({ source: 'local-fallback', error: detail, result: fallbackResult(task, payload) }));
    return;
  }

  const data = await response.json();
  const output = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.text)?.text || '{}';
  res.writeHead(200, RESPONSE_HEADERS);
  res.end(JSON.stringify({ source: 'openai', result: JSON.parse(output) }));
}