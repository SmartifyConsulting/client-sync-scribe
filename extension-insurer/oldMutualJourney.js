// OMP Life guest route, observed 5 November 2026. No application or email actions.
// Serialized by chrome.scripting: all helpers must stay inside this function.
function driveOldMutualQuote(request, origin, redirectDomain) {
  const url = new URL(location.href);
  const stop = detail => ({ state: 'blocked', detail });
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['secure.adviserweb.oldmutual.co.za','secure.oldmutual.co.za','my.oldmutual.co.za'].includes(url.hostname) ||
      !(url.origin === origin || redirectDomain === 'oldmutual.co.za'))
    return stop('Open the authenticated OM Adviser quote workspace before requesting an OMP Life quote.');
  const visible = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const all = selector => [...document.querySelectorAll(selector)].filter(visible);
  const unique = list => list.length === 1 ? list[0] : null;
  const one = selector => unique(all(selector));
  const text = e => norm(e.textContent);
  const exact = (selector, value) => unique(all(selector).filter(e => text(e).toLowerCase() === value.toLowerCase()));
  const action = name => exact('button,a', name);
  const click = e => { if (!e || e.disabled) return false; e.click(); return true; };
  const fields = request.fields || [];
  const field = label => { const f = fields.filter(f => f.label === label); return f.length === 1 ? f[0].value : ''; };
  const context = { ...(request.context || {}) };
  const step = request.step || 'start';
  const next = (s, detail) => ({ state: 'navigate', next: s, context, detail });
  const wait = detail => next(step, detail);
  const numeric = value => Number(String(value).replace(/[R ,]/g, ''));
  const set = (e, value, commit = true) => {
    if (!e || e.disabled || e.readOnly) return false;
    if (!commit) e.focus();
    if (e.tagName === 'SELECT') {
      const option = unique([...e.options].filter(o => !o.disabled && norm(o.text) === value));
      if (!option) return false;
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(e, option.value);
    } else Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, value);
    e.dispatchEvent(new Event('input', { bubbles: true }));
    if (commit) {
      e.dispatchEvent(new Event('change', { bubbles: true }));
      e.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    return true;
  };
  const selectWith = value => unique(all('select').filter(e => [...e.options].some(o => norm(o.text) === value)));
  const selected = e => e?.tagName === 'SELECT' ? norm(e.selectedOptions[0]?.text) : '';
  const values = {
    dob: field('Date of birth'), gender: field('Gender'), marital: field('Marital status'),
    smoker: field('Smoking status'), education: field('Education'), membership: field('Professional membership'),
    occupation: field('Occupation'), industry: field('Industry'), employment: field('Employment type'),
    admin: field('Admin (%)'), physical: field('Physical (%)'), travel: field('Travelling (%)'),
    income: field('Gross taxable monthly income'), passive: field('Passive taxable monthly income'),
    day: field('Salary Payment Day'), cover: field('Benefit amount'), premium: field('Compulsory yearly premium increase'),
    growth: field('Scheduled yearly cover increase'), underwriting: field('Underwriting method'),
    guarantee: field('Guarantee term'), term: field('Premium term'), cashback: field('Cashback')
  };
  const missing = Object.entries(values).filter(([,v]) => typeof v !== 'string' || !v.trim()).map(([k]) => k);
  if (missing.length) return stop('Missing OMP Life inputs: ' + missing.join(', ') + '. No quote was created.');
  if (fields.some(f => f.product && f.product !== 'Life cover') || field('Old Mutual product') !== 'OMP Life')
    return stop('This verified Old Mutual route supports OMP Life only. Request life cover separately.');
  // Expand only after the corresponding route has been demonstrated. Never infer rating answers.
  if (!['Male','Female'].includes(values.gender) || !['Non-Smoker','Smoker'].includes(values.smoker) ||
      values.membership !== 'None' || values.occupation !== 'Programmer and Analyst' || values.employment !== 'Self-employed' || values.industry !== 'General' ||
      !['0% Annual Increase','5% Annual Increase','Increase with Age'].includes(values.premium) ||
      !['0% fixed rate','5% fixed rate','10% fixed rate'].includes(values.growth) ||
      !['No medical tests - only questions','Medical tests, questions or both'].includes(values.underwriting) ||
      !['5 years','10 years','15 years'].includes(values.guarantee) || !['Retirement','Benefit term'].includes(values.term) || values.cashback !== 'Included')
    return stop('An OMP Life input is outside the verified route. No alternative value was substituted.');
  if (![values.admin,values.physical,values.travel].every(v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 100) ||
      Number(values.admin)+Number(values.physical)+Number(values.travel) !== 100 || !(Number(values.income)>0) || !(Number(values.passive)>=0) ||
      !(Number(values.cover)>0) || !Number.isInteger(Number(values.day)) || Number(values.day)<1 || Number(values.day)>31 || !/^\d{4}-\d{2}-\d{2}$/.test(values.dob))
    return stop('Check the approved birth date, work split, income, payment day and cover before requesting a quote.');
  if (all('input').some(e => e.type === 'password' || e.autocomplete === 'one-time-code')) return stop('Old Mutual sign-in or verification is required.');
  if (all('#spinnerElement').length || all('h5').some(e => text(e) === 'LOADING')) return wait('Waiting for Old Mutual to finish loading');
  const dialogs = all('dialog[open],[role="dialog"],[role="alertdialog"]');
  const serviceNotice='You are accessing this service outside of contracted service hours. As such some functionality may not be available.';
  if(step==='start' && dialogs.length===1 && norm(dialogs[0].textContent).includes(serviceNotice) &&
     dialogs[0].querySelector('#buttonOk') && !dialogs[0].querySelector('input,select,textarea')) {
    if(click(one('#buttonOk')))return wait('Service-hours notice acknowledged; checking quote availability');
  }
  if (dialogs.length && !(dialogs.length === 1 && ['growth-select','growth-save','growth-closed'].includes(step) && dialogs[0].querySelector('#selectCoverIncreaseOptionModal') && /SELECT A COVER INCREASE OPTION/i.test(dialogs[0].textContent))) return stop('An unexpected Old Mutual dialog needs review. No quote action was taken.');
  const ref = url.pathname.match(/^\/protection\/quote\/(\d+)\//)?.[1];
  if (context.reference && ref && ref !== context.reference) return stop('The portal changed to another quote. Automation stopped to protect the existing case.');
  const on = suffix => url.pathname.endsWith(suffix);
  if (step === 'start') {
    if(url.hostname==='secure.adviserweb.oldmutual.co.za' && on('/adviser-workbench/landing'))return wait('Waiting for the OM Adviser dashboard');
    if(url.hostname === 'secure.oldmutual.co.za' && /^\/(?:home\/?)?$/i.test(url.pathname)) {
      const link=unique(all('a').filter(e=>e.href==='https://secure.adviserweb.oldmutual.co.za/adviser-workbench/landing'));
      if(!link)return stop('The authenticated OM Adviser link is not available.');
      location.assign(link.href); return next('start','Opening OM Adviser');
    }
    if(url.hostname === 'my.oldmutual.co.za' && url.pathname.startsWith('/app/secure')) {
      const link=unique(all('a').filter(e=>/^https:\/\/secure\.oldmutual\.co\.za\/?$/.test(e.href)));
      if(!link)return stop('The authenticated Secure Services link is not available.');
      location.assign(link.href);return next('start','Opening Old Mutual Secure Services');
    }
    if (ref) return stop('An existing quote is open. Return to Sales dashboard before starting a fresh option; it will not be overwritten.');
    if (!on('/dashboard/sales-dashboard')) return stop('Open OM Adviser → Standalone Quote to start this verified route.');
    if (click(one('#CreateNewQuote'))) return next('type', 'Opening a new OMP Life draft');
    const tab = one('[id="Standalone Quote"]');
    if (click(tab)) return next('new', 'Selecting Standalone Quote');
    return stop('The unique Standalone Quote control was not found.');
  }
  if (step === 'new') { if (click(one('#CreateNewQuote'))) return next('type','Opening a fresh quote'); return wait('Waiting for Create New Quote'); }
  if (step === 'type') { if (!on('/dashboard/select-lob')) return wait('Waiting for quote types'); if (click(action('PROTECTION'))) return next('type-next','Selecting Protection'); return stop('Protection action not found.'); }
  if (step === 'type-next') { if (!on('/dashboard/select-lob')) return stop('Quote type screen changed unexpectedly.'); if (click(action('NEXT'))) return next('anonymous','Opening customer selection'); return stop('Protection selection was not accepted.'); }
  if (step === 'anonymous') { if (!on('/search/all')) return wait('Waiting for customer selection'); const a=unique(all('a').filter(e=>norm(e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent).toLowerCase()==='anonymous')); if(click(a))return next('guest','Opening the guest quote'); return stop('Anonymous quote action not found.'); }
  if (step === 'guest') {
    if (!on('/search/life-covered-anonymous')) return wait('Waiting for guest details');
    const dob=values.dob.split('-').reverse().join('/');
    if(!set(one('#create-annon'),dob) || !click(exact('.x-option',values.gender)))return stop('Guest date or gender control not found.');
    return next('guest-check','Checking birth date and selected gender');
  }
  if (step === 'guest-check') {
    if(one('#create-annon')?.value !== values.dob.split('-').reverse().join('/') || !exact('.x-option.x-selected',values.gender))return stop('Old Mutual did not retain the birth date or gender.');
    if(click(one('#nextButton')))return next('benefit','Opening benefits'); return stop('Guest details did not validate.');
  }
  if (step === 'benefit') { if(!on('/protection/quote/select-benefit'))return wait('Waiting for benefit selection'); if(click(exact('h3','OMP Life')))return next('benefit-check','Selecting OMP Life only'); return stop('The OMP Life benefit was not uniquely available.'); }
  if (step === 'benefit-check') { if(!exact('h3','OMP Life - 1'))return stop('OMP Life was not selected.'); if(click(one('#next')))return next('summary','Creating the new draft'); return stop('Benefit selection did not validate.'); }
  if (step === 'summary') {
    if(!on('/quick-summary') || !ref)return wait('Waiting for the new draft reference');
    context.reference=ref;
    if(!set(one('input[name="premiumCollectionDay_name_ind"]'),values.day) || !set(one('input[currencymask]'),values.cover))return stop('Cover or salary payment day could not be set.');
    const cash=unique([...document.querySelectorAll('input[type="checkbox"]')]);
    if(!cash?.checked)return stop('Cashback is not included as requested; no premium was accepted.');
    return next('summary-check','Checking cover, salary day and cashback');
  }
  if(step==='summary-check') {
    if(numeric(one('input[currencymask]')?.value)!==Number(values.cover) || one('input[name="premiumCollectionDay_name_ind"]')?.value!==values.day)return stop('Cover or salary day did not persist.');
    if(click(action('NEXT')))return next('rating','Opening required rating information'); return stop('Build Quote did not validate.');
  }
  if(step==='rating') {
    if(!url.pathname.includes('/risk-factor/'))return wait('Waiting for rating fields');
    if(!set(one('#form-select-0'),values.marital)||!set(one('#form-select-1'),values.education)||!set(one('input[name="identifier"]'),values.membership)||!click(exact('.x-option',values.smoker)))return stop('An approved rating choice is unavailable.');
    if(!set(one('#identifier'),'Program',false))return stop('Occupation search unavailable.');
    return next('occupation','Waiting for the exact occupation match');
  }
  if(step==='occupation') {
    const match=exact('[role="option"]',values.occupation);
    if(!match)return wait('Waiting for the exact insurer occupation result');
    if(click(match))return next('employment','Applying the insurer occupation');
  }
  if(step==='employment') {
    if(!one('#form-select-4'))return wait('Waiting for occupation-dependent fields');
    if(!set(one('#form-select-4'),values.industry)||!set(one('#form-select-2'),values.employment))return stop('Industry or employment choice unavailable.');
    return next('income','Waiting for employment-dependent income fields');
  }
  if(step==='income') {
    const split=all('input[type="number"]');
    if(split.length!==3 || !document.body.innerText.includes('Admin (%)') || !document.body.innerText.includes('Physical (%)') || !document.body.innerText.includes('Travelling (%)'))return stop('Work split controls changed.');
    if(!split.every((e,i)=>set(e,[values.admin,values.physical,values.travel][i])) || !set(one('#form-number-10'),values.income)||!set(one('#form-number-8'),values.passive))return stop('Income controls changed.');
    return next('rating-check','Checking all saved rating inputs');
  }
  if(step==='rating-check') {
    const split=all('input[type="number"]');
    if(selected(one('#form-select-0'))!==values.marital || selected(one('#form-select-1'))!==values.education || one('input[name="identifier"]')?.value!==values.membership || !exact('.x-option.x-selected',values.smoker) ||
      one('#identifier')?.value!==values.occupation || selected(one('#form-select-4'))!==values.industry || selected(one('#form-select-2'))!==values.employment ||
      split.length!==3 || !split.every((e,i)=>Number(e.value)===Number([values.admin,values.physical,values.travel][i])) || numeric(one('#form-number-10')?.value)!==Number(values.income) || numeric(one('#form-number-8')?.value)!==Number(values.passive))return stop('A rating answer did not persist. No calculation was accepted.');
    if(click(one('#next')))return next('premium','Calculating the initial insurer quote'); return stop('Insurer rating validation needs review.');
  }
  if(step==='premium') { if(!on('/your-quote-tableview'))return wait('Waiting for the calculated quote'); if(click(action(values.premium)))return next('terms','Applying approved premium pattern'); return stop('Premium pattern action unavailable.'); }
  if(step==='terms') {
    if(selected(selectWith(values.premium))!==values.premium)return wait('Waiting for the premium pattern to persist');
    if(!set(selectWith(values.underwriting),values.underwriting)||!set(selectWith(values.guarantee),values.guarantee)||!set(selectWith(values.term),values.term))return stop('A required quote term is unavailable.');
    const growth=unique(all('input[title]').filter(e=>/fixed rate|Inflation-linked|Currency-linked/.test(e.title)));
    if(click(growth))return next('growth-select','Opening scheduled cover increase'); return stop('Scheduled cover increase control unavailable.');
  }
  if(step==='growth-select') { const choice=selectWith(values.growth); if(!choice)return wait('Waiting for the cover-growth choices'); if(set(choice,values.growth))return next('growth-save','Applying approved fixed cover growth'); return stop('Approved growth choice unavailable.'); }
  if(step==='growth-save') { if(selected(selectWith(values.growth))!==values.growth)return stop('Cover growth did not retain its selected value.'); if(click(action('SAVE')))return next('growth-closed','Saving cover growth'); return stop('Unique cover-growth Save action unavailable.'); }
  if(step==='growth-closed') { if(selectWith(values.growth))return wait('Waiting for cover-growth dialog to close'); if(click(action('RECALCULATE')))return next('verify','Recalculating approved terms'); return stop('Recalculate action unavailable; result was not recorded.'); }
  if(step==='verify') {
    if(!ref || ref!==context.reference || !on('/your-quote-tableview'))return stop('Quote identity could not be verified.');
    const growth=unique(all('input[title]').filter(e=>/fixed rate|Inflation-linked|Currency-linked/.test(e.title)));
    if(numeric(one('#deathcoveramount_0_0_0')?.value)!==Number(values.cover)||norm(growth?.value)!==values.growth || selected(selectWith(values.premium))!==values.premium || selected(selectWith(values.underwriting))!==values.underwriting || selected(selectWith(values.guarantee))!==values.guarantee || selected(selectWith(values.term))!==values.term || selected(one('#your-cart-table-payment-frequency'))!=='Monthly')return stop('The recalculated quote differs from the requested terms. No result was recorded.');
    const life=numeric(one('#premium-input')?.value);
    const cash=numeric(unique(all('input[placeholder="Type number"]').filter(e=>e.id!=='deathcoveramount_0_0_0'))?.value);
    const total=unique(all('h2').filter(e=>/^R\s*[\d ,]+(?:\.\d+)?$/.test(text(e))));
    const monthly=numeric(total?.textContent);
    if(!document.body.innerText.includes('CASHBACK') || !Number.isFinite(monthly)||monthly<=0 || !Number.isFinite(cash)||cash<0 || Math.abs(monthly-life-cash)>0.01)return stop('The premium and cashback total could not be verified.');
    return {state:'verified',context,detail:'OMP Life calculation verified; PDF not yet filed.',result:{number:ref,monthlyPremium:monthly,cashbackPremium:cash,product:'Life cover'}};
  }
  return stop('The OMP Life quote step needs review. No application action was taken.');
}
