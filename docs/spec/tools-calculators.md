# ToolsCalculators — extracted spec (reference for P1 · ToolsCalculators)

Source: client_requirements/thefinalfinalfiles (V7)/iqcommune-main-landing-page.html

## Markup
```html
</section>

<!-- ── TOOLS & CALCULATORS ── -->
<section class="tools-section">
  <div class="container">
    <div class="section-tag"><span class="pill">Tools &amp; Calculators</span></div>
    <h2 class="section-headline" style="color:#fff;">Try the numbers before you attend.</h2>
    <p class="section-sub" style="color:rgba(255,255,255,0.5);">Six live calculators — one per module. Built on the same frameworks the sessions use. No sign-up, no data stored.</p>

    <div class="tools-grid">

      <!-- ── TOOL 1: 50/30/20 Budget Checker ── -->
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-module">Foundations of Personal Finance</div>
          <div class="tool-name">50/30/20 Budget Checker</div>
          <div class="tool-desc">Enter your monthly take-home. See instantly how your spending maps against the 50/30/20 benchmark.</div>
        </div>
        <div class="tool-widget">
          <div class="tw-header"><span class="tw-title">Budget Checker</span><span class="tw-tag">Try it</span></div>
          <div class="tw-body">
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Monthly take-home <span id="t1-iv">&#x20B9;60,000</span></div>
              <input type="range" class="tw-range" min="15000" max="300000" step="5000" value="60000" oninput="t1calc(this.value)">
            </div>
            <div class="tw-seg" id="t1-seg"></div>
            <div class="tw-res c3" style="margin-top:7px;">
              <div class="tw-box"><div class="tw-box-lbl">Needs (50%)</div><div class="tw-box-val" id="t1-needs">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Wants (30%)</div><div class="tw-box-val" id="t1-wants">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Savings (20%)</div><div class="tw-box-val pos" id="t1-save">&#x2014;</div></div>
            </div>
            <div class="tw-flag" id="t1-msg"></div>
          </div>
        </div>
      </div>

      <!-- ── TOOL 2: Retirement Corpus Calculator ── -->
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-module">Retirement &amp; Goal-Based Planning</div>
          <div class="tool-name">Retirement Corpus Calculator</div>
          <div class="tool-desc">Your age, monthly savings, and inflation. We calculate what you need at retirement and the SIP to get there.</div>
        </div>
        <div class="tool-widget">
          <div class="tw-header"><span class="tw-title">Retirement Corpus</span><span class="tw-tag">Try it</span></div>
          <div class="tw-body">
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Current age <span id="t2-av">32</span></div>
              <input type="range" class="tw-range" min="22" max="55" step="1" value="32" oninput="t2calc()">
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Monthly savings <span id="t2-sv">&#x20B9;20,000</span></div>
              <input type="range" class="tw-range" min="5000" max="150000" step="5000" value="20000" oninput="t2calc()">
            </div>
            <div class="tw-res c2">
              <div class="tw-box"><div class="tw-box-lbl">Corpus needed</div><div class="tw-box-val warn" id="t2-corpus">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">SIP required</div><div class="tw-box-val pos" id="t2-sip">&#x2014;</div></div>
            </div>
            <div class="tw-msg" id="t2-msg"></div>
          </div>
        </div>
      </div>

      <!-- ── TOOL 3: P/E Valuation Check ── -->
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-module">Equity Investing Simplified</div>
          <div class="tool-name">P/E Valuation Quick-Check</div>
          <div class="tool-desc">Enter a stock&apos;s market price and EPS. Instant P/E verdict against the broad market benchmark.</div>
        </div>
        <div class="tool-widget">
          <div class="tw-header"><span class="tw-title">Valuation Check</span><span class="tw-tag">Try it</span></div>
          <div class="tw-body">
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Market price (&#x20B9;) <span id="t3-pv">&#x20B9;450</span></div>
              <input type="range" class="tw-range" min="10" max="5000" step="10" value="450" oninput="t3calc()">
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">EPS (&#x20B9;) <span id="t3-ev">&#x20B9;22</span></div>
              <input type="range" class="tw-range" min="1" max="500" step="1" value="22" oninput="t3calc()">
            </div>
            <div class="tw-res c3">
              <div class="tw-box"><div class="tw-box-lbl">P/E Ratio</div><div class="tw-box-val" id="t3-pe">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Market avg</div><div class="tw-box-val">22&#xD7;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Verdict</div><div class="tw-box-val" id="t3-verdict">&#x2014;</div></div>
            </div>
            <div class="tw-flag" id="t3-msg"></div>
          </div>
        </div>
      </div>

      <!-- ── TOOL 4: Post-Tax Return Comparator ── -->
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-module">Debt &amp; Fixed Income Investing</div>
          <div class="tool-name">Post-Tax Return Comparator</div>
          <div class="tool-desc">FD vs. debt fund vs. G-Sec. Enter amount and tenure &#x2014; see post-tax returns side by side.</div>
        </div>
        <div class="tool-widget">
          <div class="tw-header"><span class="tw-title">Debt Comparator</span><span class="tw-tag">Try it</span></div>
          <div class="tw-body">
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Amount (&#x20B9;) <span id="t4-av">&#x20B9;1,00,000</span></div>
              <input type="range" class="tw-range" min="10000" max="1000000" step="10000" value="100000" oninput="t4calc()">
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Tenure (years) <span id="t4-tv">3 yrs</span></div>
              <input type="range" class="tw-range" min="1" max="10" step="1" value="3" oninput="t4calc()">
            </div>
            <div class="tw-res c3">
              <div class="tw-box"><div class="tw-box-lbl">FD (post-tax)</div><div class="tw-box-val" id="t4-fd">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Debt Fund</div><div class="tw-box-val pos" id="t4-mf">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">G-Sec</div><div class="tw-box-val pos" id="t4-gs">&#x2014;</div></div>
            </div>
            <div class="tw-msg">Assumes 30% tax slab. Illustrative only &#x2014; actual returns vary with rate cycles and tax slab.</div>
          </div>
        </div>
      </div>

      <!-- ── TOOL 5: Portfolio Balance Scorecard ── -->
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-module">Asset Allocation &amp; Portfolio Construction</div>
          <div class="tool-name">Portfolio Balance Scorecard</div>
          <div class="tool-desc">Enter your asset mix. Get a live balance score and rebalancing cue for your risk profile.</div>
        </div>
        <div class="tool-widget">
          <div class="tw-header"><span class="tw-title">Portfolio Scorecard</span><span class="tw-tag">Try it</span></div>
          <div class="tw-body">
            <div class="tw-chips">
              <div class="tw-chip on" id="t5c0" onclick="t5profile(0)">Conservative</div>
              <div class="tw-chip" id="t5c1" onclick="t5profile(1)">Moderate</div>
              <div class="tw-chip" id="t5c2" onclick="t5profile(2)">Aggressive</div>
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Equity % <span id="t5-ev">40%</span></div>
              <input type="range" class="tw-range" min="0" max="100" step="5" value="40" id="t5-er" oninput="t5calc()">
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Debt % <span id="t5-dv">45%</span></div>
              <input type="range" class="tw-range" min="0" max="100" step="5" value="45" id="t5-dr" oninput="t5calc()">
            </div>
            <div class="tw-res c2">
              <div class="tw-box"><div class="tw-box-lbl">Balance score</div><div class="tw-box-val warn" id="t5-score">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Gold + Cash</div><div class="tw-box-val" id="t5-rest">15%</div></div>
            </div>
            <div class="tw-flag" id="t5-msg"></div>
          </div>
        </div>
      </div>

      <!-- ── TOOL 6: SIP Growth Visualiser ── -->
      <div class="tool-card">
        <div class="tool-card-top">
          <div class="tool-module">Investment Solutions &amp; Portfolio Strategies</div>
          <div class="tool-name">SIP Growth Visualiser</div>
          <div class="tool-desc">Monthly SIP + years + return rate. Watch your corpus build year by year.</div>
        </div>
        <div class="tool-widget">
          <div class="tw-header"><span class="tw-title">SIP Growth</span><span class="tw-tag">Try it</span></div>
          <div class="tw-body">
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Monthly SIP <span id="t6-sv">&#x20B9;10,000</span></div>
              <input type="range" class="tw-range" min="1000" max="100000" step="1000" value="10000" oninput="t6calc()">
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Years <span id="t6-yv">15</span></div>
              <input type="range" class="tw-range" min="3" max="30" step="1" value="15" oninput="t6calc()">
            </div>
            <div class="tw-ctrl">
              <div class="tw-ctrl-lbl">Return % <span id="t6-rv">12%</span></div>
              <input type="range" class="tw-range" min="6" max="18" step="0.5" value="12" oninput="t6calc()">
            </div>
            <div class="tw-res c3">
              <div class="tw-box"><div class="tw-box-lbl">Invested</div><div class="tw-box-val" id="t6-inv">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Corpus</div><div class="tw-box-val pos" id="t6-corp">&#x2014;</div></div>
              <div class="tw-box"><div class="tw-box-lbl">Gains</div><div class="tw-box-val pos" id="t6-gain">&#x2014;</div></div>
            </div>
            <div class="tw-bars" id="t6-bars"></div>
          </div>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ── CTA ── -->
<section class="cta-section">
  <div class="container">
    <div class="section-tag"><span class="pill">Get Started</span></div>
    <h2 class="section-headline">If you are serious to improve your financial literacy</h2>
    <p class="section-sub">Tell us your topic, your group, and a preferred date window. We'll handle the rest offline.</p>
    <button class="btn-gold" onclick="openModal()">
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Request a Session
    </button>
    <div class="cta-reassurance">
      <div class="cta-re-item">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        No fixed slots — we schedule around you
      </div>
```

## Calculator logic
```js
  function t1calc(v) {
    v = parseInt(v);
    document.getElementById('t1-iv').textContent = fmt(v);
    const needs = v * 0.5, wants = v * 0.3, save = v * 0.2;
    document.getElementById('t1-needs').textContent = fmt(needs);
    document.getElementById('t1-wants').textContent = fmt(wants);
    document.getElementById('t1-save').textContent  = fmt(save);
    const seg = document.getElementById('t1-seg');
    seg.innerHTML = `<div class="tw-seg-fill" style="width:50%;background:#c9982a;"></div><div class="tw-seg-fill" style="width:30%;background:#4a7abe;"></div><div class="tw-seg-fill" style="width:20%;background:#4ec994;"></div>`;
    const msg = document.getElementById('t1-msg');
    const yr = v * 12;
    msg.className = 'tw-flag good';
    msg.textContent = `₹${Math.round(save*12/1000)}K/yr goes to savings — over 10 years at 10% return that compounds to ${fmt(save*12*((Math.pow(1.10,10)-1)/0.10*(1.10)))}.`;
  }
  t1calc(60000);

  // T2: Retirement Corpus Calculator
  function t2calc() {
    const age  = parseInt(document.querySelector('#t2-av').closest('.tw-ctrl').querySelector('input').value);
    const sav  = parseInt(document.querySelector('#t2-sv').closest('.tw-ctrl').querySelector('input').value);
    document.getElementById('t2-av').textContent = age;
    document.getElementById('t2-sv').textContent = fmt(sav);
    const yearsLeft = 60 - age;
    const inflation = 0.06, retireMonths = 240; // 20yr retirement
    const monthlyExpense = sav * 0.7; // assume 70% of savings reflects current spend
    const futureMonthly = monthlyExpense * Math.pow(1+inflation, yearsLeft);
    const corpus = futureMonthly * ((1 - Math.pow(1.07/1.06, -retireMonths/12*12)) / (0.07/12 - inflation/12)) / 12;
    const r = 0.12/12, n = yearsLeft * 12;
    const sipNeeded = corpus * r / (Math.pow(1+r,n) - 1);
    document.getElementById('t2-corpus').textContent = fmt(corpus);
    document.getElementById('t2-sip').textContent    = fmt(sipNeeded);
    const msg = document.getElementById('t2-msg');
    msg.textContent = `${yearsLeft} years to retirement. Assumed 6% inflation, 7% withdrawal-phase return, 20-year retirement window.`;
  }
  (function(){
    const e = document.getElementById('t2-av').closest('.tw-body').querySelectorAll('input');
    e[0].oninput = e[1].oninput = t2calc;
    t2calc();
  })();

  // T3: P/E Valuation
  function t3calc() {
    const body = document.getElementById('t3-pe').closest('.tw-body');
    const inputs = body.querySelectorAll('input');
    const price = parseInt(inputs[0].value), eps = parseInt(inputs[1].value);
    document.getElementById('t3-pv').textContent = '₹' + price.toLocaleString('en-IN');
    document.getElementById('t3-ev').textContent = '₹' + eps;
    if (eps <= 0) { document.getElementById('t3-pe').textContent = 'N/A'; return; }
    const pe = price / eps;
    document.getElementById('t3-pe').textContent = fmtN(pe, 1) + '×';
    const msg = document.getElementById('t3-msg');
    const vd  = document.getElementById('t3-verdict');
    if (pe < 15) {
      vd.textContent = 'Cheap'; vd.className = 'tw-box-val pos';
      msg.className = 'tw-flag good'; msg.textContent = `P/E of ${fmtN(pe,1)}× is below 15 — trading at a discount to the market. Worth investigating why.`;
    } else if (pe <= 28) {
      vd.textContent = 'Fair'; vd.className = 'tw-box-val warn';
      msg.className = 'tw-flag warn'; msg.textContent = `P/E of ${fmtN(pe,1)}× is in line with market. Valuation is not the edge here — earnings quality is.`;
    } else {
      vd.textContent = 'Stretched'; vd.className = 'tw-box-val neg';
      msg.className = 'tw-flag bad'; msg.textContent = `P/E of ${fmtN(pe,1)}× is above 28 — priced for significant growth. Any miss will be punished.`;
    }
  }
  (function(){ document.getElementById('t3-pe').closest('.tw-body').querySelectorAll('input').forEach(i => i.oninput = t3calc); t3calc(); })();

  // T4: Post-Tax Debt Comparator
  function t4calc() {
    const body = document.getElementById('t4-fd').closest('.tw-body');
    const inputs = body.querySelectorAll('input');
    const amt = parseInt(inputs[0].value), yrs = parseInt(inputs[1].value);
    document.getElementById('t4-av').textContent = fmt(amt);
    document.getElementById('t4-tv').textContent = yrs + ' yr' + (yrs>1?'s':'');
    const fdRate = 0.069, mfRate = 0.077, gsRate = 0.073;
    const tax = 0.30;
    const fdGross  = amt * (Math.pow(1+fdRate, yrs) - 1);
    const fdNet    = amt + fdGross * (1 - tax);
    const mfGross  = amt * (Math.pow(1+mfRate, yrs) - 1);
    const mfNet    = amt + mfGross * (1 - tax); // now taxed at marginal rate post-2023 budget
    const gsGross  = amt * (Math.pow(1+gsRate, yrs) - 1);
    const gsNet    = amt + gsGross * (1 - tax);
    document.getElementById('t4-fd').textContent = fmt(fdNet);
    document.getElementById('t4-mf').textContent = fmt(mfNet);
    document.getElementById('t4-gs').textContent = fmt(gsNet);
  }
  (function(){ document.getElementById('t4-fd').closest('.tw-body').querySelectorAll('input').forEach(i => i.oninput = t4calc); t4calc(); })();

  // T5: Portfolio Balance Scorecard
  let t5Prof = 0;
  const t5Targets = [
    {eq:30, de:55, label:'Conservative'},
    {eq:55, de:35, label:'Moderate'},
    {eq:75, de:18, label:'Aggressive'}
  ];
  function t5profile(p) {
    t5Prof = p;
    [0,1,2].forEach(i => document.getElementById('t5c'+i).className = 'tw-chip'+(i===p?' on':''));
    const er = document.getElementById('t5-er'), dr = document.getElementById('t5-dr');
    er.value = t5Targets[p].eq; dr.value = t5Targets[p].de;
    t5calc();
  }
  function t5calc() {
    const eq = parseInt(document.getElementById('t5-er').value);
    const de = parseInt(document.getElementById('t5-dr').value);
    const rest = Math.max(0, 100 - eq - de);
    document.getElementById('t5-ev').textContent   = eq + '%';
    document.getElementById('t5-dv').textContent   = de + '%';
    document.getElementById('t5-rest').textContent = rest + '%';
    const tgt = t5Targets[t5Prof];
    const eqDiff = Math.abs(eq - tgt.eq), deDiff = Math.abs(de - tgt.de);
    const rawScore = Math.max(0, 10 - (eqDiff + deDiff) / 5);
    const score = Math.round(rawScore * 10) / 10;
    const scoreEl = document.getElementById('t5-score');
    scoreEl.textContent = score.toFixed(1) + '/10';
    scoreEl.className   = 'tw-box-val ' + (score>=8?'pos':score>=5?'warn':'neg');
    const msg = document.getElementById('t5-msg');
    if (score >= 8) {
      msg.className = 'tw-flag good'; msg.textContent = `Well-balanced for a ${tgt.label} profile. No rebalancing needed right now.`;
    } else if (score >= 5) {
      msg.className = 'tw-flag warn'; msg.textContent = `Slightly off-target for ${tgt.label}. Target: ~${tgt.eq}% equity, ~${tgt.de}% debt.`;
    } else {
      msg.className = 'tw-flag bad'; msg.textContent = `Significant drift from ${tgt.label} targets. Rebalance toward ${tgt.eq}% equity, ${tgt.de}% debt.`;
    }
  }
  t5calc();

  // T6: SIP Growth Visualiser
  function t6calc() {
    const body = document.getElementById('t6-inv').closest('.tw-body');
    const inputs = body.querySelectorAll('input');
    const sip = parseInt(inputs[0].value), yrs = parseInt(inputs[1].value), ret = parseFloat(inputs[2].value)/100/12;
    document.getElementById('t6-sv').textContent = fmt(sip);
    document.getElementById('t6-yv').textContent = yrs;
    document.getElementById('t6-rv').textContent = (parseFloat(inputs[2].value)) + '%';
    const n = yrs * 12;
    const corpus = sip * ((Math.pow(1+ret,n)-1)/ret) * (1+ret);
    const invested = sip * n;
    const gains = corpus - invested;
    document.getElementById('t6-inv').textContent  = fmt(invested);
    document.getElementById('t6-corp').textContent = fmt(corpus);
    document.getElementById('t6-gain').textContent = fmt(gains);
    const bars = document.getElementById('t6-bars');
    const steps = Math.min(yrs, 10);
    let html = '';
    let maxVal = 0;
    const vals = [];
    for (let y=1; y<=steps; y++) {
      const ny = Math.round(y * (yrs/steps)) * 12;
      const c = sip * ((Math.pow(1+ret,ny)-1)/ret) * (1+ret);
      vals.push(c); if (c>maxVal) maxVal=c;
    }
    vals.forEach((v,i) => {
      const h = Math.max(4, Math.round((v/maxVal)*36));
      const isLast = i===vals.length-1;
      html += `<div class="tw-bar" style="height:${h}px;background:${isLast?'#c9982a':'rgba(201,152,42,0.35)'};" title="${fmt(v)}"></div>`;
    });
    bars.innerHTML = html;
  }
  (function(){ document.getElementById('t6-inv').closest('.tw-body').querySelectorAll('input').forEach(i => i.oninput = t6calc); t6calc(); })();

</script>
```
