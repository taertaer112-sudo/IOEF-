/**
 * IOEF Pre-Launch Stress, Security & Integrity Test Suite
 * Runs against the live server on http://127.0.0.1:3000 and measures real
 * concurrency latency (avg/p95/max), throughput, RBAC gates, clean seed state,
 * AI subsystems readiness, and backup snapshots without leaving synthetic data.
 */

interface TimedResult {
  status: number;
  ok: boolean;
  latency: number;
  data?: any;
  error?: string;
}

async function timedFetch(url: string, options?: RequestInit): Promise<TimedResult> {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const latency = performance.now() - start;
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, latency, data };
  } catch (err: any) {
    const latency = performance.now() - start;
    return { status: 0, ok: false, latency, error: err?.message || 'Network error' };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function runConcurrencyTier(baseUrl: string, count: number, endpoints: string[]) {
  const started = performance.now();
  const promises = Array.from({ length: count }, (_, i) => {
    const ep = endpoints[i % endpoints.length];
    return timedFetch(`${baseUrl}${ep}`);
  });
  const results = await Promise.all(promises);
  const totalMs = performance.now() - started;
  const okCount = results.filter((r) => r.ok).length;
  const errCount = count - okCount;
  const latencies = results.map((r) => r.latency).sort((a, b) => a - b);
  const avgMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95Ms = percentile(latencies, 95);
  const maxMs = latencies[latencies.length - 1] || 0;
  const throughput = count / (totalMs / 1000);

  return { count, okCount, errCount, totalMs, avgMs, p95Ms, maxMs, throughput };
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('IOEF PRE-LAUNCH COMPREHENSIVE STRESS, SECURITY & DATA AUDIT');
  console.log('================================================================\n');

  const BASE_URL = 'http://127.0.0.1:3000';
  let passedTests = 0;
  let totalTests = 0;

  // TEST 1: Health & System Baseline
  totalTests++;
  console.log('[TEST 1] System Baseline & Health API...');
  const healthRes = await timedFetch(`${BASE_URL}/api/system/health`);
  if (healthRes.ok && healthRes.data?.data?.status === 'healthy') {
    const m = healthRes.data.data;
    console.log(
      `PASS: Status=${m.status} | Latency=${healthRes.latency.toFixed(1)}ms | Heap=${m.memory.heapUsedMb}MB/${m.memory.heapTotalMb}MB | Uptime=${m.uptimeSeconds}s`
    );
    passedTests++;
  } else {
    console.error('FAIL: Health check failed', healthRes);
  }

  // TEST 2: Clean Pre-Season Data Integrity (6 Federations, 27 Tournaments, 96 Teams, 0 Fabricated Players/Fixtures)
  totalTests++;
  console.log('\n[TEST 2] Clean Pre-Season Database Integrity...');
  const [divRes, tourRes, teamRes, playerRes, fixtureRes, rulesRes, settingsRes] = await Promise.all([
    timedFetch(`${BASE_URL}/api/divisions`),
    timedFetch(`${BASE_URL}/api/tournaments`),
    timedFetch(`${BASE_URL}/api/teams`),
    timedFetch(`${BASE_URL}/api/players`),
    timedFetch(`${BASE_URL}/api/fixtures`),
    timedFetch(`${BASE_URL}/api/rules`),
    timedFetch(`${BASE_URL}/api/settings`),
  ]);

  const divCount = Array.isArray(divRes.data) ? divRes.data.length : -1;
  const tourCount = Array.isArray(tourRes.data) ? tourRes.data.length : -1;
  const teamCount = Array.isArray(teamRes.data) ? teamRes.data.length : -1;
  const playerCount = Array.isArray(playerRes.data) ? playerRes.data.length : -1;
  const fixtureCount = Array.isArray(fixtureRes.data) ? fixtureRes.data.length : -1;
  const ruleCount = Array.isArray(rulesRes.data) ? rulesRes.data.length : -1;
  const activeModel = settingsRes.data?.aiConfig?.activeModel || 'unknown';
  const allTeamsClean =
    Array.isArray(teamRes.data) &&
    teamRes.data.every(
      (t: any) =>
        t.wins === 0 &&
        t.draws === 0 &&
        t.losses === 0 &&
        t.goalsFor === 0 &&
        t.goalsAgainst === 0 &&
        t.points === 0 &&
        t.registrationStatus === 'available'
    );

  if (divCount === 6 && tourCount === 27 && teamCount === 234 && playerCount === 0 && fixtureCount === 0 && ruleCount >= 5 && allTeamsClean) {
    console.log(
      `PASS: Divisions=${divCount}, Tournaments=${tourCount}, Teams=${teamCount} (all at 0-0-0 / 0 pts), Players=${playerCount}, Fixtures=${fixtureCount}, Rules=${ruleCount}, AI Model=${activeModel}`
    );
    passedTests++;
  } else {
    console.error(
      `FAIL: Unexpected counts -> divisions=${divCount}, tournaments=${tourCount}, teams=${teamCount}, players=${playerCount}, fixtures=${fixtureCount}, rules=${ruleCount}, allTeamsClean=${allTeamsClean}`
    );
  }

  // TEST 3: Tiered Concurrency Read Load (50, 100, 200 concurrent requests)
  totalTests++;
  console.log('\n[TEST 3] Tiered Concurrency Read Load (50 / 100 / 200 concurrent users)...');
  const readEndpoints = [
    '/api/divisions',
    '/api/tournaments?divisionId=div_ksa',
    '/api/teams?divisionId=div_ksa',
    '/api/teams?divisionId=div_eng',
    '/api/news',
    '/api/rules',
    '/api/store/products',
    '/api/system/health',
  ];

  const tier50 = await runConcurrencyTier(BASE_URL, 50, readEndpoints);
  const tier100 = await runConcurrencyTier(BASE_URL, 100, readEndpoints);
  const tier200 = await runConcurrencyTier(BASE_URL, 200, readEndpoints);

  for (const t of [tier50, tier100, tier200]) {
    console.log(
      `Tier ${t.count} reqs: ${t.okCount}/${t.count} OK (${t.errCount} err) | Total=${t.totalMs.toFixed(1)}ms | Throughput=${t.throughput.toFixed(
        0
      )} req/s | Avg=${t.avgMs.toFixed(1)}ms | P95=${t.p95Ms.toFixed(1)}ms | Max=${t.maxMs.toFixed(1)}ms`
    );
  }

  if (tier50.okCount === 50 && tier100.okCount === 100 && tier200.okCount === 200) {
    console.log('PASS: All 350 tiered concurrent requests succeeded with 0% error rate.');
    passedTests++;
  } else {
    console.error('FAIL: Some concurrent read requests failed.');
  }

  // TEST 4: Concurrent Registration Duplicate Check API
  totalTests++;
  console.log('\n[TEST 4] Concurrent Registration Duplicate Checks (20 parallel calls)...');
  const checkStart = performance.now();
  const checkResults = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      timedFetch(
        `${BASE_URL}/api/registrations/check?whatsapp=${encodeURIComponent(`+9665000000${i}`)}&gamerTag=${encodeURIComponent(`IOEF_Player_${i}`)}`
      )
    )
  );
  const checkOk = checkResults.filter((r) => r.ok && r.data?.exists === false).length;
  console.log(`PASS/CHECK: ${checkOk}/20 duplicate checks responded cleanly in ${(performance.now() - checkStart).toFixed(1)}ms`);
  if (checkOk === 20) passedTests++;

  // TEST 5: RFC 7519 JWT (HS256) & Strict 3-Role RBAC Isolation Verification
  totalTests++;
  console.log('\n[TEST 5] RFC 7519 JWT (HS256), Tamper Rejection & 3-Role RBAC Isolation...');
  const unauthAdmins = await timedFetch(`${BASE_URL}/api/admins`);
  const unauthRegs = await timedFetch(`${BASE_URL}/api/registrations`);
  const fakeAlgNoneJwt =
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') +
    '.' +
    Buffer.from(JSON.stringify({ sub: 'admin_pres', role: 'president' })).toString('base64url') +
    '.';
  const tamperedJwtRes = await timedFetch(`${BASE_URL}/api/admins`, {
    headers: { Authorization: `Bearer ${fakeAlgNoneJwt}` },
  });

  const badLogin = await timedFetch(`${BASE_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'president', password: 'WrongPassword123' }),
  });

  const [presLogin, dirLogin, orgLogin] = await Promise.all([
    timedFetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.TEST_ADMIN_USER || 'president',
        password: process.env.TEST_ADMIN_PASS || 'IOEF-Pres-2026!',
      }),
    }),
    timedFetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'director',
        password: process.env.TEST_DIR_PASS || 'IOEF-Dir-2026!',
      }),
    }),
    timedFetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'organizer',
        password: process.env.TEST_ORG_PASS || 'IOEF-Org-2026!',
      }),
    }),
  ]);

  const presToken: string | undefined = presLogin.data?.token;
  const dirToken: string | undefined = dirLogin.data?.token;
  const orgToken: string | undefined = orgLogin.data?.token;

  const isValidJwtShape = (tok?: string) => !!tok && tok.split('.').length === 3;
  const jwtHeader = presToken ? JSON.parse(Buffer.from(presToken.split('.')[0], 'base64url').toString('utf-8')) : null;
  const jwtValidFormat =
    isValidJwtShape(presToken) &&
    isValidJwtShape(dirToken) &&
    isValidJwtShape(orgToken) &&
    jwtHeader?.alg === 'HS256' &&
    jwtHeader?.typ === 'JWT';

  const [
    presAdmins,
    presMatrix,
    dirAuditLogs,
    dirForbiddenAdmins,
    dirForbiddenSettings,
    dirForbiddenRestore,
    orgRegs,
    orgForbiddenAuditLogs,
    orgForbiddenAdmins,
    orgForbiddenSettings,
    orgForbiddenTour,
    orgForbiddenDupes,
  ] = await Promise.all([
    presToken ? timedFetch(`${BASE_URL}/api/admins`, { headers: { Authorization: `Bearer ${presToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    presToken ? timedFetch(`${BASE_URL}/api/auth/rbac-matrix`, { headers: { Authorization: `Bearer ${presToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    dirToken ? timedFetch(`${BASE_URL}/api/audit-logs`, { headers: { Authorization: `Bearer ${dirToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    dirToken ? timedFetch(`${BASE_URL}/api/admins`, { headers: { Authorization: `Bearer ${dirToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    dirToken
      ? timedFetch(`${BASE_URL}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dirToken}` },
          body: JSON.stringify({ settings: { maintenanceMode: false } }),
        })
      : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    dirToken
      ? timedFetch(`${BASE_URL}/api/system/backups/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${dirToken}` },
          body: JSON.stringify({ filename: 'nonexistent.json' }),
        })
      : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    orgToken ? timedFetch(`${BASE_URL}/api/registrations`, { headers: { Authorization: `Bearer ${orgToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    orgToken ? timedFetch(`${BASE_URL}/api/audit-logs`, { headers: { Authorization: `Bearer ${orgToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    orgToken ? timedFetch(`${BASE_URL}/api/admins`, { headers: { Authorization: `Bearer ${orgToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    orgToken
      ? timedFetch(`${BASE_URL}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgToken}` },
          body: JSON.stringify({ settings: { maintenanceMode: false } }),
        })
      : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    orgToken
      ? timedFetch(`${BASE_URL}/api/tournaments/tour_eng_d1`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgToken}` },
          body: JSON.stringify({ status: 'ongoing' }),
        })
      : Promise.resolve({ status: 0, ok: false, latency: 0 }),
    orgToken ? timedFetch(`${BASE_URL}/api/ai/detect-duplicates`, { headers: { Authorization: `Bearer ${orgToken}` } }) : Promise.resolve({ status: 0, ok: false, latency: 0 }),
  ]);

  // Verify JWT revocation on logout for director token
  if (dirToken) {
    await timedFetch(`${BASE_URL}/api/auth/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${dirToken}` },
    });
  }
  const dirAfterLogout = dirToken
    ? await timedFetch(`${BASE_URL}/api/audit-logs`, { headers: { Authorization: `Bearer ${dirToken}` } })
    : { status: 0, ok: false, latency: 0 };

  if (
    unauthAdmins.status === 401 &&
    unauthRegs.status === 401 &&
    tamperedJwtRes.status === 401 &&
    badLogin.status === 401 &&
    jwtValidFormat &&
    presLogin.ok &&
    presAdmins.ok &&
    presMatrix.ok &&
    dirLogin.ok &&
    dirAuditLogs.ok &&
    dirForbiddenAdmins.status === 403 &&
    dirForbiddenSettings.status === 403 &&
    dirForbiddenRestore.status === 403 &&
    orgLogin.ok &&
    orgRegs.ok &&
    orgForbiddenAuditLogs.status === 403 &&
    orgForbiddenAdmins.status === 403 &&
    orgForbiddenSettings.status === 403 &&
    orgForbiddenTour.status === 403 &&
    orgForbiddenDupes.status === 403 &&
    dirAfterLogout.status === 401
  ) {
    console.log(
      'PASS: JWT HS256 validated, alg=none rejected (401), President/Director/Organizer RBAC isolated (403 on cross-role endpoints), and JWT revocation verified (401 after logout).'
    );
    passedTests++;
  } else {
    console.error('FAIL: JWT/RBAC check mismatch', {
      unauthAdmins: unauthAdmins.status,
      unauthRegs: unauthRegs.status,
      tamperedJwtRes: tamperedJwtRes.status,
      badLogin: badLogin.status,
      jwtValidFormat,
      presLogin: presLogin.status,
      presAdmins: presAdmins.status,
      presMatrix: presMatrix.status,
      dirAuditLogs: dirAuditLogs.status,
      dirForbiddenAdmins: dirForbiddenAdmins.status,
      dirForbiddenSettings: dirForbiddenSettings.status,
      dirForbiddenRestore: dirForbiddenRestore.status,
      orgRegs: orgRegs.status,
      orgForbiddenAuditLogs: orgForbiddenAuditLogs.status,
      orgForbiddenAdmins: orgForbiddenAdmins.status,
      orgForbiddenSettings: orgForbiddenSettings.status,
      orgForbiddenTour: orgForbiddenTour.status,
      orgForbiddenDupes: orgForbiddenDupes.status,
      dirAfterLogout: dirAfterLogout.status,
    });
  }

  // TEST 6: 12 AI Subsystems Registry & Queue Health
  totalTests++;
  console.log('\n[TEST 6] 12 AI Subsystems Registry & Operational Status...');
  const aiRes = await timedFetch(`${BASE_URL}/api/ai/subsystems`);
  if (aiRes.ok && aiRes.data?.subsystems?.length === 12) {
    console.log(`PASS: All 12 AI Subsystems Active & Registered (Queue active=${aiRes.data?.queueStats?.active ?? 0}, queued=${aiRes.data?.queueStats?.queued ?? 0})`);
    passedTests++;
  } else {
    console.error('FAIL: AI Subsystems check failed', aiRes);
  }

  // TEST 7: Authenticated Backup Snapshot Creation
  totalTests++;
  console.log('\n[TEST 7] Authenticated Database Backup Snapshot...');
  let preTest9BackupFilename = '';
  if (presToken) {
    const backupRes = await timedFetch(`${BASE_URL}/api/system/backups/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${presToken}`,
      },
      body: JSON.stringify({}),
    });
    if (backupRes.ok && backupRes.data?.filename) {
      preTest9BackupFilename = backupRes.data.filename;
      console.log(`PASS: Backup created: ${preTest9BackupFilename}`);
      passedTests++;
    } else {
      console.error('FAIL: Backup creation failed', backupRes);
    }
  } else {
    console.error('FAIL: Skipped backup test because president login failed');
  }

  // TEST 8: Input Validation Gate (Reject invalid registration & ticket payloads cleanly with 400)
  totalTests++;
  console.log('\n[TEST 8] Input Validation Gate (400 rejection on incomplete payloads)...');
  const [badReg, badTicket] = await Promise.all([
    timedFetch(`${BASE_URL}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Incomplete' }),
    }),
    timedFetch(`${BASE_URL}/api/support/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderName: '' }),
    }),
  ]);
  if (badReg.status === 400 && badTicket.status === 400) {
    console.log('PASS: Incomplete registration (400) and incomplete ticket (400) rejected without side effects.');
    passedTests++;
  } else {
    console.error('FAIL: Validation gate unexpected status', { badReg: badReg.status, badTicket: badTicket.status });
  }

  // TEST 9: E2E Digital Membership, QR Verification (Zero PII), Subscriptions, Duplicate Ref 409, Club Transfer & RBAC 403
  totalTests++;
  console.log('\n[TEST 9] Digital Membership, QR Verify, Payments, Transfers, RBAC 403 & AI Audit...');
  if (presToken && orgToken) {
    // 9a. Organizer must get 403 on all Membership/Payment/Transfer/AI Audit endpoints
    const [orgMemForbidden, orgPayForbidden, orgAuditForbidden] = await Promise.all([
      timedFetch(`${BASE_URL}/api/memberships`, { headers: { Authorization: `Bearer ${orgToken}` } }),
      timedFetch(`${BASE_URL}/api/payments`, { headers: { Authorization: `Bearer ${orgToken}` } }),
      timedFetch(`${BASE_URL}/api/ai/membership-audit`, { headers: { Authorization: `Bearer ${orgToken}` } }),
    ]);

    // 9b. Submit a synthetic registration -> approve -> check auto-issued card + public zero-PII verify
    const ksaTeams: any[] = Array.isArray(teamRes.data) ? teamRes.data.filter((t: any) => t.divisionId === 'div_ksa') : [];
    const clubA = ksaTeams[0];
    const clubB = ksaTeams[1];

    const regCreate = await timedFetch(`${BASE_URL}/api/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'لاعب اختبار آلي مؤقت',
        gamerTag: 'TEST_QR_PLAYER_99',
        whatsapp: '+966599999999',
        country: 'السعودية',
        divisionId: 'div_ksa',
        requestedTier: clubA?.divisionTier || 1,
        realClubId: clubA?.realClubId,
        teamName: clubA?.name || 'الهلال',
        squadImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        termsAccepted: true,
        aiAnalysis: { squadRating: 3250, formation: '4-2-1-3', recommendedTier: 1, passedRequirements: true, reasoning: 'Test OK', analyzedAt: new Date().toISOString() },
      }),
    });

    const regId = regCreate.data?.registration?.id;
    let regApprove: any = { ok: false };
    if (regId) {
      regApprove = await timedFetch(`${BASE_URL}/api/registrations/${regId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${presToken}` },
        body: JSON.stringify({ status: 'approved', notes: 'Auto-approved in stress verification' }),
      });
    }

    const memListRes = await timedFetch(`${BASE_URL}/api/memberships`, { headers: { Authorization: `Bearer ${presToken}` } });
    const issuedMem = Array.isArray(memListRes.data) ? memListRes.data[0] : null;
    const playerId = issuedMem?.playerId;
    const origPlayerCode = issuedMem?.playerCode;
    const origMemNum = issuedMem?.membershipNumber;
    const oldToken = issuedMem?.qrVerificationToken;

    // Public QR verify (must expose valid=true & zero PII whatsapp/email)
    const verifyValidRes = oldToken ? await timedFetch(`${BASE_URL}/api/verify/${oldToken}`) : { ok: false, data: null };
    const zeroPiiOk =
      verifyValidRes.ok &&
      verifyValidRes.data?.valid === true &&
      !verifyValidRes.data?.card?.whatsapp &&
      !verifyValidRes.data?.card?.email;

    // Submit payment proof + test 409 duplicate transactionRef
    const paySubmit1 = playerId
      ? await timedFetch(`${BASE_URL}/api/payments/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            paymentMethod: 'vodafone_cash',
            amount: 25,
            senderReference: '01099887766',
            transactionRef: 'VFC-UNIQUE-TEST-99',
            proofImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            season: '2027/2028',
          }),
        })
      : { ok: false, data: null };

    const paySubmitDup = playerId
      ? await timedFetch(`${BASE_URL}/api/payments/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            paymentMethod: 'vodafone_cash',
            amount: 25,
            senderReference: '01099887766',
            transactionRef: 'VFC-UNIQUE-TEST-99',
            proofImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            season: '2027/2028',
          }),
        })
      : { status: 0 };

    const paymentId = paySubmit1.data?.payment?.id;
    const payApprove = paymentId
      ? await timedFetch(`${BASE_URL}/api/payments/${paymentId}/review`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${presToken}` },
          body: JSON.stringify({ decision: 'approved', notes: 'Approved in E2E' }),
        })
      : { ok: false };

    // Club transfer keeping playerCode & membershipNumber immutable
    const transferRes =
      playerId && clubB?.id
        ? await timedFetch(`${BASE_URL}/api/players/${playerId}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${presToken}` },
            body: JSON.stringify({ toTeamId: clubB.id, notes: 'Transfer E2E test' }),
          })
        : { ok: false, data: null };

    const idsImmutable =
      transferRes.ok &&
      transferRes.data?.player?.playerCode === origPlayerCode &&
      transferRes.data?.player?.membershipId === issuedMem?.id;

    // Reissue QR card -> old QR token must become revoked/invalid!
    const reissueRes = issuedMem?.id
      ? await timedFetch(`${BASE_URL}/api/memberships/${issuedMem.id}/reissue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${presToken}` },
          body: JSON.stringify({ reason: 'E2E reissue check' }),
        })
      : { ok: false, data: null };

    const verifyOldAfterReissue = oldToken ? await timedFetch(`${BASE_URL}/api/verify/${oldToken}`) : { data: null };
    const newToken = reissueRes.data?.membership?.qrVerificationToken;
    const verifyNewAfterReissue = newToken ? await timedFetch(`${BASE_URL}/api/verify/${newToken}`) : { data: null };

    // AI Membership Audit report
    const aiAuditRes = await timedFetch(`${BASE_URL}/api/ai/membership-audit`, {
      headers: { Authorization: `Bearer ${presToken}` },
    });

    // Cleanly restore DB snapshot from TEST 7 so ioef_data.json remains clean for launch!
    let restoredClean = false;
    if (preTest9BackupFilename) {
      const restoreRes = await timedFetch(`${BASE_URL}/api/system/backups/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${presToken}` },
        body: JSON.stringify({ filename: preTest9BackupFilename }),
      });
      restoredClean = restoreRes.ok;
    }

    // Revoke session tokens after all tests finish
    await timedFetch(`${BASE_URL}/api/auth/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${presToken}` },
    });
    await timedFetch(`${BASE_URL}/api/auth/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgToken}` },
    });

    if (
      orgMemForbidden.status === 403 &&
      orgPayForbidden.status === 403 &&
      orgAuditForbidden.status === 403 &&
      regCreate.ok &&
      regApprove.ok &&
      zeroPiiOk &&
      paySubmit1.ok &&
      paySubmitDup.status === 409 &&
      payApprove.ok &&
      idsImmutable &&
      reissueRes.ok &&
      verifyOldAfterReissue.data?.valid === false &&
      verifyNewAfterReissue.data?.valid === true &&
      aiAuditRes.ok &&
      restoredClean
    ) {
      console.log(
        `PASS: Organizer 403 locked, permanent IDs (${origPlayerCode} / ${origMemNum}) kept across transfer, QR reissue invalidated old token, duplicate TX returned 409, AI Audit succeeded, & clean state restored.`
      );
      passedTests++;
    } else {
      console.error('FAIL: TEST 9 assertion failure', {
        orgMemForbidden: orgMemForbidden.status,
        orgPayForbidden: orgPayForbidden.status,
        orgAuditForbidden: orgAuditForbidden.status,
        regCreate: regCreate.status,
        regApprove: regApprove.status,
        zeroPiiOk,
        paySubmit1: paySubmit1.status,
        paySubmitDup: paySubmitDup.status,
        payApprove: payApprove.status,
        idsImmutable,
        reissueOk: reissueRes.ok,
        oldValidAfterReissue: verifyOldAfterReissue.data?.valid,
        newValidAfterReissue: verifyNewAfterReissue.data?.valid,
        aiAuditOk: aiAuditRes.ok,
        restoredClean,
      });
    }
  } else {
    console.error('FAIL: Skipped TEST 9 because login tokens missing');
  }

  // Final Health Snapshot after stress load
  const postHealth = await timedFetch(`${BASE_URL}/api/system/health`);
  if (postHealth.ok && postHealth.data?.data) {
    const d = postHealth.data.data;
    console.log(
      `\n[POST-TEST HEALTH] TotalRequests=${d.totalRequests} | Errors=${d.totalErrors} (${d.errorRatePercent}%) | AvgLatency=${d.averageLatencyMs}ms | HeapUsed=${d.memory?.heapUsedMb}MB`
    );
  }

  console.log('\n================================================================');
  console.log(`TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exitCode = 1;
  }
}

runTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
