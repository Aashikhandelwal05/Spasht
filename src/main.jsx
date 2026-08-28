import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileSearch,
  Home,
  Landmark,
  Languages,
  LockKeyhole,
  Menu,
  Pencil,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import heroScene from './assets/civic-service-scene.svg';
import './styles.css';

const steps = [
  'Tell us what you need',
  'Find the right service',
  'Check readiness',
  'Review details',
  'Check documents',
  'Review packet',
  'Track status',
];

const demoRequests = [
  'I need proof of where I live for college.',
  'I need a certificate for college.',
  'My scholarship form asks me to show Rajasthan residence.',
];

const requirementPresets = [
  {
    id: 'ready',
    title: 'Ready example',
    duration: '3+ years',
    docs: ['Aadhaar', 'Electricity bill', 'School leaving certificate'],
  },
  {
    id: 'short',
    title: 'Short residence',
    duration: 'Less than 1 year',
    docs: ['Aadhaar', 'Electricity bill', 'School leaving certificate'],
  },
  {
    id: 'missing',
    title: 'Missing proof',
    duration: '3+ years',
    docs: ['Aadhaar', 'School leaving certificate'],
  },
];

const statusStages = [
  ['done', 'Application received', "We've received your application."],
  ['done', 'Documents being checked', 'Your supporting documents are being reviewed.'],
  ['current', 'Application review', 'The application is being reviewed.'],
  ['todo', 'Certificate preparation', 'If approved, the certificate will be prepared.'],
  ['todo', 'Certificate available', "You'll be able to access the certificate once the process is complete."],
];

const serviceFacts = [
  ['Used for', 'College admission, scholarships, hostel forms, and state-resident quota checks.'],
  ['Where to apply', 'Usually through a local eMitra/service center or an official Rajasthan service portal.'],
  ['Before visiting', 'Carry originals and copies of identity, address, and residence-support documents.'],
  ['Important', 'Rules, fees, and timelines vary. Confirm them on the official service page or at the center.'],
];

const reviewItems = [
  'Applicant details match the supporting document',
  'Residence duration is filled',
  'Purpose is written in plain language',
  'No real Aadhaar, OTP, password, payment, or document number was entered',
];

const siteLinks = [
  ['Services', '#services'],
  ['How it works', '#how-it-works'],
  ['Try demo', '#start'],
  ['Trust', '#trust'],
];

const initialState = {
  step: 0,
  request: demoRequests[0],
  clarificationNeeded: false,
  clarification: '',
  serviceReason: '',
  duration: '',
  docs: [],
  gap: null,
  started: false,
  name: 'Priya Chowdhary',
  address: '22 Lake Road, Jaipur, Rajasthan',
  parentName: 'Anita Chowdhary',
  purpose: 'College admission',
  documentName: 'Priya Choudhary',
  validation: null,
  reference: '',
};

function analyzeIntent(text, clarification) {
  const input = `${text} ${clarification}`.toLowerCase();
  const residenceSignals = ['live', 'residence', 'resident', 'domicile', 'address', 'where i live', 'rajasthan'];
  const vagueCollege = input.includes('certificate') && input.includes('college') && !residenceSignals.some((s) => input.includes(s));

  if (vagueCollege && !clarification) {
    return {
      clear: false,
      question: "Is this to prove where you live, your family's income, or something else?",
      visibleReason: 'Your request mentions college and a certificate, but not what the certificate must prove.',
    };
  }

  if (residenceSignals.some((s) => input.includes(s)) || clarification.toLowerCase().includes('where')) {
    return {
      clear: true,
      intent: 'prove_residence',
      visibleReason: 'You mentioned proof of where you live or residence for a college-related need.',
    };
  }

  return {
    clear: false,
    question: "Is this to prove where you live, your family's income, or something else?",
    visibleReason: 'Spasht needs the purpose before suggesting a service.',
  };
}

function classifyService(state) {
  const context = `${state.request} ${state.clarification}`.toLowerCase();
  return {
    service: 'Domicile Certificate',
    explanation: 'A domicile certificate helps show that you are a resident of a particular state or place.',
    reasoning: context.includes('college')
      ? 'You said you need to prove where you live for college, so Spasht matched your need to a domicile certificate.'
      : 'Your request is about proving residence, so Spasht matched it to a domicile certificate.',
  };
}

function checkRequirements(duration, docs) {
  const issues = [];
  if (duration !== '3+ years') {
    issues.push({
      type: 'duration',
      text: `You have lived at this address for ${duration.toLowerCase()}, which is less than this demo's 3-year check.`,
    });
  }
  if (!docs.includes('Aadhaar') || (!docs.includes('Electricity bill') && !docs.includes('Ration card'))) {
    issues.push({
      type: 'document',
      text: 'You may be missing a document commonly used for identity or address proof in this demo.',
    });
  }
  if (!issues.length) return null;
  return {
    issues,
    why: 'Submitting without enough proof can lead to delay or rejection during verification.',
    next: [
      'Check whether you have an older electricity bill, ration card, school record, or rent proof with this address.',
      'Ask the service center whether a supporting affidavit route is accepted for your situation.',
      'You can update your answers here or continue exploring the demo process.',
    ],
  };
}

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z]/g, '');
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

function validateNames(applicationName, documentName) {
  const a = normalizeName(applicationName);
  const b = normalizeName(documentName);
  const distance = levenshtein(a, b);
  if (a === b) {
    return { status: 'clean', distance, message: 'No common name-matching problems found.' };
  }
  if (distance <= 3) {
    return {
      status: 'near',
      distance,
      message: 'The names are very similar, but the spelling is different.',
      why: 'Small differences in names can cause problems during document verification.',
    };
  }
  return {
    status: 'different',
    distance,
    message: 'The application name and document name look different.',
    why: 'A larger mismatch may need correction before official submission.',
  };
}

function Badge({ children, tone = 'mock' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/**
 * StampMark — seal-red ink stamp used only on real pass states.
 * Rotate slightly so it reads as a physical rubber stamp impression.
 */
function StampMark({ size = 36 }) {
  const r = size / 2;
  const rOuter = r - 2;
  const rInner = r - 7;
  return (
    <svg
      className="stampMark stampIcon"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {/* outer ring */}
      <circle cx={r} cy={r} r={rOuter} fill="none" stroke="#B23A34" strokeWidth="2" />
      {/* inner ring */}
      <circle cx={r} cy={r} r={rInner} fill="none" stroke="#B23A34" strokeWidth="1.2" />
      {/* tick mark */}
      <polyline
        points={`${r - 6},${r + 1} ${r - 1},${r + 6} ${r + 7},${r - 5}`}
        fill="none"
        stroke="#B23A34"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Button({ children, onClick, variant = 'primary', icon: Icon, disabled = false }) {
  return (
    <button className={`button ${variant}`} onClick={onClick} disabled={disabled}>
      {Icon && <Icon size={18} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function HelperNote({ title, children }) {
  return (
    <div className="helperNote">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="siteHeader">
      <a className="brandMark" href="#top" aria-label="Spasht home">
        <Sparkles size={21} aria-hidden="true" />
        <span>Spasht</span>
      </a>
      <button className="menuButton" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open navigation">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={open ? 'siteNav open' : 'siteNav'} aria-label="Primary navigation">
        {siteLinks.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <a className="navCta" href="#start" onClick={() => setOpen(false)}>Start demo</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero sectionShell" id="top">
      <div className="heroCopy">
        <Badge>Hackathon demo</Badge>
        <h1>Clear help for public service applications.</h1>
        <p>
          Spasht guides citizens from a plain-language need to the right service, checks readiness, and prepares a simple review packet before they use an official channel.
        </p>
        <div className="heroActions">
          <a className="buttonLink primary" href="#start">Try the Domicile Certificate demo</a>
          <a className="buttonLink secondary" href="#how-it-works">See how it works</a>
        </div>
        <div className="heroAssurance">
          <ShieldAlert size={17} />
          <span>Prototype only. Not affiliated with eMitra or any government body.</span>
        </div>
      </div>
      <div className="heroVisual" aria-label="Illustration of a citizen service journey">
        <img src={heroScene} alt="Citizen using a simple mobile checklist at a public service center" />
        <div className="floatingCard readyCard">
          <Check size={18} />
          <span>Ready to apply</span>
        </div>
        <div className="floatingCard statusCard">
          <Clock3 size={18} />
          <span>Status is clear</span>
        </div>
      </div>
    </section>
  );
}

function ServiceIntro() {
  return (
    <section className="sectionShell serviceIntro" id="services">
      <div className="sectionLead">
        <Badge>Core service</Badge>
        <h2>Domicile Certificate guidance, from first question to status check.</h2>
        <p>
          The demo focuses on one common journey: a student needs proof of residence for college or scholarship work. The same pattern can extend to many citizen services.
        </p>
      </div>
      <div className="serviceGrid">
        {serviceFacts.map(([label, copy]) => (
          <article key={label} className="serviceCard">
            <strong>{label}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const items = [
    ['1', 'Say the need', 'Citizens describe their situation in normal language, without knowing the official service name.'],
    ['2', 'Get matched', 'Spasht explains the likely service and why it fits, using plain language.'],
    ['3', 'Check readiness', 'A lightweight mock rule check shows missing information before a citizen travels or submits.'],
    ['4', 'Review and track', 'The demo prepares a clean packet and shows a simple status experience.'],
  ];
  return (
    <section className="sectionShell howItWorks" id="how-it-works">
      <div className="sectionLead narrow">
        <Badge>How it works</Badge>
        <h2>Built for first-time smartphone users.</h2>
        <p>Every step is short, direct, and reversible. The interface avoids official jargon until it is needed.</p>
      </div>
      <div className="stepsGrid">
        {items.map(([number, title, copy]) => (
          <article key={number} className="stepCard">
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function JourneySection() {
  const [state, setState] = useState(initialState);
  return (
    <section className="journeySection" id="start">
      <div className="sectionShell journeyIntro">
        <div>
          <Badge>Interactive demo</Badge>
          <h2>Try the complete Domicile Certificate journey.</h2>
          <p>Use the sample data below. This demo does not submit anything and does not ask for real private numbers.</p>
        </div>
        <div className="demoStats" aria-label="Demo summary">
          <span><strong>8</strong> screens</span>
          <span><strong>0</strong> real submissions</span>
          <span><strong>1</strong> core service</span>
        </div>
      </div>
      <JourneyShell state={state} setState={setState}>
        {state.step === 0 && <Intake state={state} setState={setState} />}
        {state.step === 1 && <Service state={state} setState={setState} />}
        {state.step === 2 && <Requirements state={state} setState={setState} />}
        {state.step === 3 && <Readiness setState={setState} />}
        {state.step === 4 && <FormFill state={state} setState={setState} />}
        {state.step === 5 && <Validation state={state} setState={setState} />}
        {state.step === 6 && <Submission state={state} setState={setState} />}
        {state.step === 7 && <Status setState={setState} />}
      </JourneyShell>
    </section>
  );
}

function JourneyShell({ state, setState, children }) {
  const activeIndex = Math.min(state.step, steps.length - 1);
  const progress = ((activeIndex + 1) / steps.length) * 100;
  return (
    <div className="demoWrap">
      <aside className="demoAside">
        <Badge>Mock experience</Badge>
        <h3>Citizen journey</h3>
        <p>This panel shows how Spasht could help a citizen prepare before using an official service.</p>
        <ol>
          {steps.map((label, index) => (
            <li key={label} className={index === activeIndex ? 'active' : index < activeIndex ? 'done' : ''}>
              <span>{index < activeIndex ? '✓' : index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </aside>
      <main className="demoPanel">
        <div className="demoTopbar">
          <div>
            <span>Step {activeIndex + 1} of {steps.length}</span>
            <strong>{steps[activeIndex]}</strong>
          </div>
          <div className="progressTrack"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="demoNotice">
          <ShieldAlert size={16} />
          <span>Mock only. Not official advice, verification, or submission.</span>
        </div>
        {children}
        {state.step > 0 && state.step < 6 && (
          <footer className="backbar">
            <button onClick={() => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }))}>
              <ArrowLeft size={16} /> Back
            </button>
          </footer>
        )}
      </main>
    </div>
  );
}

function Intake({ state, setState }) {
  const intent = useMemo(() => analyzeIntent(state.request, state.clarification), [state.request, state.clarification]);

  function continueIntent() {
    if (!intent.clear) {
      setState((s) => ({ ...s, clarificationNeeded: true }));
      return;
    }
    const classified = classifyService(state);
    setState((s) => ({ ...s, ...classified, serviceReason: classified.reasoning, step: 1 }));
  }

  return (
    <div className="screen">
      <h2>What do you need help with?</h2>
      <p className="lead">You can write it like you would say it to a person at a help desk.</p>
      <label className="field">
        <span>Write it in your own words</span>
        <textarea value={state.request} onChange={(e) => setState((s) => ({ ...s, request: e.target.value }))} />
      </label>
      <div className="quickGroup" aria-label="Sample requests">
        {demoRequests.map((request) => (
          <button key={request} onClick={() => setState((s) => ({ ...s, request, clarification: '', clarificationNeeded: false }))}>{request}</button>
        ))}
      </div>

      {state.clarificationNeeded && (
        <div className="guidance">
          <h3>{intent.question}</h3>
          <div className="choiceGrid">
            {['To prove where I live', "To prove my family's income", 'Something else'].map((answer) => (
              <button key={answer} className={state.clarification === answer ? 'selected' : ''} onClick={() => setState((s) => ({ ...s, clarification: answer }))}>
                {answer}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="intentConfirm">
        <strong>Here&rsquo;s what we understood</strong>
        <p>{intent.visibleReason}</p>
      </div>
      <Button onClick={continueIntent} icon={ChevronRight} disabled={state.clarificationNeeded && !state.clarification}>Continue</Button>
    </div>
  );
}

function Service({ state, setState }) {
  return (
    <div className="screen">
      <h2>You may need a Domicile Certificate.</h2>
      <p className="lead">{state.explanation}</p>
      <div className="reasonBox">
        <strong>Why this fits</strong>
        <p>{state.serviceReason}</p>
      </div>
      <div className="factGrid">
        {serviceFacts.map(([label, copy]) => (
          <div key={label} className="fact">
            <strong>{label}</strong>
            <p>{copy}</p>
          </div>
        ))}
      </div>
      <div className="compare">
        <h3>Similar names, different use</h3>
        <p><b>Residence Certificate:</b> may serve a different purpose depending on the service or state.</p>
        <p><b>Migration Certificate:</b> usually relates to moving between educational boards or universities.</p>
      </div>
      <div className="demoNotice inline"><span>Mock recommendation only. This is not an official government decision.</span></div>
      <Button onClick={() => setState((s) => ({ ...s, step: 2 }))} icon={ClipboardCheck}>Check if I am ready</Button>
    </div>
  );
}

function Requirements({ state, setState }) {
  function toggleDoc(doc) {
    setState((s) => ({
      ...s,
      docs: s.docs.includes(doc) ? s.docs.filter((d) => d !== doc) : [...s.docs, doc],
    }));
  }
  function usePreset(preset) {
    setState((s) => ({ ...s, duration: preset.duration, docs: preset.docs, gap: null }));
  }
  function check() {
    const result = checkRequirements(state.duration, state.docs);
    setState((s) => ({ ...s, gap: result }));
    if (!result) setState((s) => ({ ...s, step: 3 }));
  }

  return (
    <div className="screen">
      <Badge>Mock rule</Badge>
      <h2>Let us check if you are ready.</h2>
      <p className="rule">For this demo, we check 3+ years of residence and basic identity plus address proof.</p>
      <div className="quickGroup compact">
        {requirementPresets.map((preset) => (
          <button key={preset.id} onClick={() => usePreset(preset)}>{preset.title}</button>
        ))}
      </div>
      <h3>How long have you lived at this address?</h3>
      <div className="choiceGrid">
        {['Less than 1 year', '1-2 years', '3+ years'].map((option) => (
          <button key={option} className={state.duration === option ? 'selected' : ''} onClick={() => setState((s) => ({ ...s, duration: option }))}>{option}</button>
        ))}
      </div>
      <h3>Which documents do you have?</h3>
      <div className="choiceGrid">
        {['Aadhaar', 'Electricity bill', 'Ration card', 'School leaving certificate'].map((doc) => (
          <button key={doc} className={state.docs.includes(doc) ? 'selected' : ''} onClick={() => toggleDoc(doc)}>
            {state.docs.includes(doc) && <Check size={16} />} {doc}
          </button>
        ))}
      </div>

      {state.gap && <RequirementGap gap={state.gap} setState={setState} />}

      <Button onClick={check} icon={FileSearch} disabled={!state.duration || state.docs.length === 0}>Check my readiness</Button>
    </div>
  );
}

function RequirementGap({ gap, setState }) {
  return (
    <div className="warning">
      <h3><AlertTriangle size={19} /> You may not be ready yet</h3>
      <h4>What we found</h4>
      {gap.issues.map((issue) => <p key={issue.type}>{issue.text}</p>)}
      <h4>Why this matters</h4>
      <p>{gap.why}</p>
      <h4>What can you do?</h4>
      <ul>
        {gap.next.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <Badge>Mock guidance</Badge>
      <div className="split">
        <Button variant="secondary" onClick={() => setState((s) => ({ ...s, duration: '3+ years', docs: ['Aadhaar', 'Electricity bill', 'School leaving certificate'], gap: null }))} icon={Pencil}>Fix answers</Button>
        <Button variant="ghost" onClick={() => setState((s) => ({ ...s, step: 3 }))} icon={ChevronRight}>Continue exploring</Button>
      </div>
    </div>
  );
}

function Readiness({ setState }) {
  return (
    <div className="screen successScreen">
      <Badge>Mock pre-check</Badge>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <StampMark size={44} />
        You&rsquo;re ready to apply.
      </h2>
      <p className="lead"><b>Service:</b> Domicile Certificate</p>
      <div className="checklist">
        {['Identity information', 'Residence duration', 'Required documents'].map((item) => (
          <p key={item}><StampMark size={28} /> {item}</p>
        ))}
      </div>
      <h3>Your application journey</h3>
      <div className="miniJourney">Eligibility <ChevronRight size={16} /> Documents <ChevronRight size={16} /> Application <ChevronRight size={16} /> Verification <ChevronRight size={16} /> Certificate</div>
      <div className="nextVisit">
        <Clock3 size={20} />
        <div>
          <strong>What Spasht would prepare</strong>
          <p>A plain-language summary of your answers, document checklist, and fields to review before using an official service.</p>
        </div>
      </div>
      <Button onClick={() => setState((s) => ({ ...s, step: 4, started: true }))} icon={FileCheck2}>Start application</Button>
    </div>
  );
}

function FormFill({ state, setState }) {
  return (
    <div className="screen">
      <Badge>Mock form</Badge>
      <h2>Review your details.</h2>
      <p className="lead">Do not enter real Aadhaar, PAN, OTP, payment, or password information in this prototype.</p>
      <FormField label="What is your name?" govt="Applicant name" value={state.name} onChange={(v) => setState((s) => ({ ...s, name: v }))} />
      <FormField label="Where do you currently live?" govt="Permanent residential address" value={state.address} onChange={(v) => setState((s) => ({ ...s, address: v }))} />
      <FormField label="How long have you lived there?" govt="Duration of continuous residence" value={state.duration || '3+ years'} onChange={(v) => setState((s) => ({ ...s, duration: v }))} />
      <FormField label="Why do you need this certificate?" govt="Purpose of application" value={state.purpose} onChange={(v) => setState((s) => ({ ...s, purpose: v }))} />
      <FormField label="Name shown on uploaded mock document" govt="Supporting document holder name" value={state.documentName} onChange={(v) => setState((s) => ({ ...s, documentName: v }))} />
      <div className="quickGroup compact">
        <button onClick={() => setState((s) => ({ ...s, name: 'Priya Chowdhary', documentName: 'Priya Choudhary' }))}>Near-miss mismatch</button>
        <button onClick={() => setState((s) => ({ ...s, name: 'Priya Chowdhary', documentName: 'Priya Chowdhary' }))}>Clean match</button>
      </div>
      <Button onClick={() => setState((s) => ({ ...s, validation: validateNames(s.name, s.documentName), step: 5 }))} icon={FileSearch}>Check these details</Button>
    </div>
  );
}

function FormField({ label, govt, value, onChange }) {
  return (
    <label className="field mapped">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
      <small>Mock form field: {govt}</small>
    </label>
  );
}

function Validation({ state, setState }) {
  const validation = state.validation || validateNames(state.name, state.documentName);
  const clean = validation.status === 'clean';
  return (
    <div className="screen">
      <Badge>Mock pre-check - not official verification</Badge>
      <h2>{clean ? 'No common name-matching problems found.' : 'We found something to check.'}</h2>
      <div className={clean ? 'clean' : 'warning'}>
        <h3>{clean ? <StampMark size={26} /> : <AlertTriangle size={20} />} {validation.message}</h3>
        <p><b>Application:</b> {state.name}</p>
        <p><b>Document:</b> {state.documentName}</p>
        {!clean && <p><b>Why we are flagging this:</b> {validation.why}</p>}
      </div>
      {!clean ? (
        <div className="split">
          <Button onClick={() => setState((s) => ({ ...s, name: s.documentName, validation: validateNames(s.documentName, s.documentName) }))} icon={Pencil}>Fix application name</Button>
          <Button variant="secondary" onClick={() => setState((s) => ({ ...s, documentName: s.name, validation: validateNames(s.name, s.name) }))} icon={FileSearch}>Review document</Button>
        </div>
      ) : (
        <Button onClick={() => setState((s) => ({ ...s, reference: `SPASHT-DEMO-${Math.floor(10000 + Math.random() * 89999)}`, step: 6 }))} icon={ChevronRight}>Review packet</Button>
      )}
      {!clean && <Button variant="ghost" onClick={() => setState((s) => ({ ...s, validation: validateNames(s.name, s.documentName) }))} icon={RotateCcw}>Run check again</Button>}
    </div>
  );
}

function Submission({ state, setState }) {
  const reference = state.reference || 'SPASHT-DEMO-48271';
  return (
    <div className="screen successScreen">
      <Badge>Mock review packet</Badge>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <StampMark size={44} />
        Your application packet is ready.
      </h2>
      <p className="ref">{reference}</p>
      <p className="lead">This is the information Spasht would help you review before you use an official eMitra or government service.</p>
      <div className="summaryPanel">
        <div>
          <span>Service</span>
          <strong>Domicile Certificate</strong>
        </div>
        <div>
          <span>Applicant</span>
          <strong>{state.name}</strong>
        </div>
        <div>
          <span>Purpose</span>
          <strong>{state.purpose}</strong>
        </div>
      </div>
      <div className="checklist">
        {reviewItems.map((item) => (
          <p key={item}><StampMark size={28} /> {item}</p>
        ))}
      </div>
      <div className="demoNotice inline"><span>This button does not connect to eMitra. It opens a mock status screen.</span></div>
      <Button onClick={() => setState((s) => ({ ...s, step: 7 }))} icon={Landmark}>Continue to eMitra</Button>
    </div>
  );
}

function Status({ setState }) {
  return (
    <div className="screen">
      <Badge>Mock status</Badge>
      <h2>Your application</h2>
      <div className="timeline">
        {statusStages.map(([status, title, copy]) => (
          <div key={title} className={`stage ${status}`}>
            <span>{status === 'done' ? <Check size={18} /> : status === 'current' ? '->' : 'o'}</span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
              {status === 'current' && <Badge tone="soft">Current step</Badge>}
            </div>
          </div>
        ))}
      </div>
      <div className="actionNeeded">
        <h3>Do I need to do anything?</h3>
        <p><b>No.</b> Nothing is required from you right now.</p>
      </div>
      <div className="languageNote">
        <Languages size={19} />
        <span>Future production versions should support local-language explanations and official status messages where available.</span>
      </div>
      <Button onClick={() => setState(initialState)} icon={Home}>Restart demo</Button>
    </div>
  );
}

function TrustSection() {
  const items = [
    [ShieldAlert, 'Clear limits', 'Spasht separates mock guidance from official decisions so citizens know what is happening.'],
    [LockKeyhole, 'No sensitive data in demo', 'The prototype warns users not to enter real Aadhaar, OTP, password, payment, or document numbers.'],
    [Languages, 'Plain language first', 'Service names and form fields are explained in words a citizen can understand.'],
  ];
  return (
    <section className="sectionShell trustSection" id="trust">
      <div className="sectionLead narrow">
        <Badge>Trust and safety</Badge>
        <h2>Designed to reduce confusion, not replace official services.</h2>
        <p>Spasht is a preparation layer. It helps citizens understand, organize, and review before using official channels.</p>
      </div>
      <div className="trustGrid">
        {items.map(([Icon, title, copy]) => (
          <article key={title} className="trustCard">
            <Icon size={24} />
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="siteFooter">
      <div>
        <a className="brandMark" href="#top"><Sparkles size={20} /> <span>Spasht</span></a>
        <p>Hackathon prototype for a clearer citizen service journey.</p>
      </div>
      <p>Mock demo only. Not affiliated with, endorsed by, or operated by eMitra or any government body.</p>
    </footer>
  );
}

function App() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ServiceIntro />
        <HowItWorks />
        <JourneySection />
        <TrustSection />
      </main>
      <Footer />
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);