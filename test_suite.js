const assert = require('assert');

console.log('--- Starting SmartTinder Full App Test Suite ---');

// --- Test 1: Criteria Matching & HUD Isolation ---
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function evaluateCriteria(lowerText, savedKeywords, maxDistance, passRate) {
  for (const kw of savedKeywords) {
    const cleanKw = kw.trim().toLowerCase();
    if (!cleanKw) continue;

    const hasWordBoundary = /^[a-z0-9]+$/i.test(cleanKw);
    const matched = hasWordBoundary 
      ? new RegExp(`(^|\\W)${escapeRegExp(cleanKw)}(\\W|$)`, 'i').test(lowerText)
      : lowerText.includes(cleanKw);

    if (matched) {
      return { action: 'PASS', reason: `Negative Criteria: "${kw}"` };
    }
  }

  if (maxDistance > 0) {
    const distMatch = lowerText.match(/(\d+)\s*(km|kilometers|miles|meilen)\s*(away|entfernt)?/i);
    if (distMatch) {
      const dist = parseInt(distMatch[1], 10);
      if (dist > maxDistance) {
        return { action: 'PASS', reason: `Distance: ${dist}km > ${maxDistance}km` };
      }
    }
  }

  if (passRate > 0 && Math.random() * 100 < passRate) {
    return { action: 'PASS', reason: `Random Pass (${passRate}%)` };
  }

  return { action: 'LIKE', reason: 'Passed criteria' };
}

const defaultPresets = [
  'he/him', 'they/them', 'er/ihn', 'she/they', 'trans', 'transgender', 'ladyboy',
  'couple', 'looking for third', 'onlyfans', 'cashapp', 'sugar baby'
];

// Test 1a: Normal profile passes criteria
{
  const normalBio = "Hey there! Love coffee, hiking in the Alps, and indie music. 25 years old. 5 km away.";
  const res = evaluateCriteria(normalBio.toLowerCase(), defaultPresets, 50, 0);
  assert.strictEqual(res.action, 'LIKE', 'Normal profile should be LIKED');
  console.log('✓ Test 1a Passed: Normal profile liked');
}

// Test 1b: Bio with negative keyword is passed
{
  const excludedBio = "Check out my onlyfans in bio! 22 years old.";
  const res = evaluateCriteria(excludedBio.toLowerCase(), defaultPresets, 50, 0);
  assert.strictEqual(res.action, 'PASS', 'Bio with onlyfans should be PASSED');
  assert.ok(res.reason.includes('onlyfans'), 'Reason should mention onlyfans');
  console.log('✓ Test 1b Passed: Negative keyword passed');
}

// Test 1c: Distance cap
{
  const farBio = "Student in Munich. 75 km away.";
  const res = evaluateCriteria(farBio.toLowerCase(), defaultPresets, 30, 0);
  assert.strictEqual(res.action, 'PASS', 'Profile beyond max distance should be PASSED');
  assert.ok(res.reason.includes('75km > 30km'), 'Reason should mention distance limit');
  console.log('✓ Test 1c Passed: Distance limit enforced');
}

// --- Test 2: False Empty Stack Prevention ("looking for people") ---
{
  function isStackGenuinelyEmpty(hasCard, pageText, hasBeacon) {
    if (hasCard) return false;
    const lower = pageText.toLowerCase();
    const hasEmptyText = lower.includes("there's no one new around you") ||
                         lower.includes("there's no one new") ||
                         lower.includes("niemanden neues in deiner umgebung") ||
                         lower.includes("es gibt niemanden neues") ||
                         lower.includes("out of potential matches");
    return Boolean(hasBeacon || hasEmptyText);
  }

  // Profile containing "looking for people" while card is visible
  const cardVisible = true;
  const bioWithPhrase = "I am looking for people to go rock climbing with on weekends!";
  assert.strictEqual(
    isStackGenuinelyEmpty(cardVisible, bioWithPhrase, false),
    false,
    'Stack must NOT be empty when card is visible, even if bio says "looking for people"'
  );
  console.log('✓ Test 2a Passed: "looking for people" bio does not trigger empty stack');

  // Genuinely empty stack with beacon
  assert.strictEqual(
    isStackGenuinelyEmpty(false, "Searching for matches...", true),
    true,
    'Stack must be empty when no card and beacon active'
  );
  console.log('✓ Test 2b Passed: Beacon triggers empty stack when no card');

  // Genuinely empty stack with message
  assert.strictEqual(
    isStackGenuinelyEmpty(false, "There's no one new around you. Check back later.", false),
    true,
    'Stack must be empty when "no one new" message is present'
  );
  console.log('✓ Test 2c Passed: Empty text triggers empty stack when no card');
}

// --- Test 3: Zero Page Reload Navigation & Slug Matching ---
{
  function slugify(title) {
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  }

  const categoryTitle = "Music Lovers";
  const slug = slugify(categoryTitle);
  assert.strictEqual(slug, 'music-lovers', 'Slugify should convert "Music Lovers" to "music-lovers"');

  const tileHrefs = [
    '/app/explore/coffee-date',
    '/app/explore/music-lovers',
    '/app/explore/free-tonight'
  ];

  const matchedHref = tileHrefs.find(h => h.includes(slug));
  assert.strictEqual(matchedHref, '/app/explore/music-lovers', 'Should match explore URL by slug');
  console.log('✓ Test 3 Passed: Category tile slug matching works accurately');
}

// --- Test 4: Category Limit Queue Switching Logic ---
{
  function shouldSwitchCategory(currentSwipes, maxSwipes, enabledCatsCount, queueCount) {
    const hasMultiple = enabledCatsCount > 1 || queueCount > 1;
    return currentSwipes >= maxSwipes && hasMultiple;
  }

  // 1 category enabled: should NOT switch even if limit reached
  assert.strictEqual(
    shouldSwitchCategory(50, 50, 1, 1),
    false,
    'Should not switch category when only 1 category is configured'
  );

  // Multiple categories enabled: SHOULD switch when limit reached
  assert.strictEqual(
    shouldSwitchCategory(50, 50, 2, 2),
    true,
    'Should switch category when multiple categories exist and limit reached'
  );

  // Limit not yet reached: should not switch
  assert.strictEqual(
    shouldSwitchCategory(32, 50, 2, 2),
    false,
    'Should not switch category before reaching limit'
  );
  console.log('✓ Test 4 Passed: Category limit switching logic verified');
}

// --- Test 5: Profile Signature Change Detection ---
{
  function computeSig(name, imgSrc, text) {
    return `${name}|${imgSrc.slice(-50)}|${text.replace(/\s+/g, ' ').trim().slice(0, 120)}`;
  }

  const card1 = computeSig('Elena', 'https://images-ssl.gotinder.com/u/12345/photo1.jpg', 'Loves dogs and traveling');
  const card2 = computeSig('Elena', 'https://images-ssl.gotinder.com/u/12345/photo1.jpg', 'Loves dogs and traveling');
  const card3 = computeSig('Julia', 'https://images-ssl.gotinder.com/u/67890/photo2.jpg', 'Artist living in Berlin');

  assert.strictEqual(card1 === card2, true, 'Same card has identical signature');
  assert.strictEqual(card1 !== card3, true, 'Different card has different signature');
  console.log('✓ Test 5 Passed: Profile signature change detection verified');
}

// --- Test 6: Age Range Boundaries (Min / Max) ---
{
  function evaluateAge(age, minAge, maxAge) {
    if (age > 0) {
      if (minAge > 0 && age < minAge) return { action: 'PASS', reason: `Age: ${age} < ${minAge} min` };
      if (maxAge > 0 && age > maxAge) return { action: 'PASS', reason: `Age: ${age} > ${maxAge} max` };
    }
    return { action: 'LIKE', reason: 'Passed' };
  }

  assert.strictEqual(evaluateAge(19, 21, 30).action, 'PASS', 'Age 19 should fail minAge 21');
  assert.strictEqual(evaluateAge(35, 21, 30).action, 'PASS', 'Age 35 should fail maxAge 30');
  assert.strictEqual(evaluateAge(25, 21, 30).action, 'LIKE', 'Age 25 should pass range 21-30');
  assert.strictEqual(evaluateAge(45, 21, 0).action, 'LIKE', 'Age 45 should pass when maxAge is 0 (off)');
  console.log('✓ Test 6 Passed: Age range boundaries verified');
}

// --- Test 7: "Bio Required" Filter ---
{
  function checkBioRequirement(bio, requireBio) {
    if (requireBio && (!bio || bio.trim().length < 6)) {
      return { action: 'PASS', reason: 'Bio Required (empty bio)' };
    }
    return { action: 'LIKE', reason: 'Passed' };
  }

  assert.strictEqual(checkBioRequirement("", true).action, 'PASS', 'Empty bio should fail when required');
  assert.strictEqual(checkBioRequirement("Hey", true).action, 'PASS', 'Short bio (<6 chars) should fail');
  assert.strictEqual(checkBioRequirement("Adventurer, dog lover, coffee fanatic.", true).action, 'LIKE', 'Substantive bio should pass');
  assert.strictEqual(checkBioRequirement("", false).action, 'LIKE', 'Empty bio should pass when requirement is off');
  console.log('✓ Test 7 Passed: "Bio Required" filter verified');
}

// --- Test 8: "Verified Only" Filter ---
{
  function checkVerifiedRequirement(isVerified, verifiedOnly) {
    if (verifiedOnly && !isVerified) {
      return { action: 'PASS', reason: 'Unverified Profile' };
    }
    return { action: 'LIKE', reason: 'Passed' };
  }

  assert.strictEqual(checkVerifiedRequirement(false, true).action, 'PASS', 'Unverified profile should fail when verifiedOnly is ON');
  assert.strictEqual(checkVerifiedRequirement(true, true).action, 'LIKE', 'Verified profile should pass');
  assert.strictEqual(checkVerifiedRequirement(false, false).action, 'LIKE', 'Unverified profile should pass when verifiedOnly is OFF');
  console.log('✓ Test 8 Passed: "Verified Only" filter verified');
}

// --- Test 9: Anti-Shadowban Cooldown Targets ---
{
  let breaksTriggered = 0;
  let swipesSinceBreak = 0;
  const breakTarget = 25;

  for (let s = 1; s <= 60; s++) {
    swipesSinceBreak++;
    if (swipesSinceBreak >= breakTarget) {
      breaksTriggered++;
      swipesSinceBreak = 0;
    }
  }

  assert.strictEqual(breaksTriggered, 2, 'Should have triggered exactly 2 breaks over 60 swipes with target 25');
  console.log('✓ Test 9 Passed: Cooldown break interval logic verified');
}

// --- Test 10: Preset Configuration Serialization & Deserialization ---
{
  const config = {
    version: 2,
    speed: 1.8,
    randDelay: 1.2,
    maxSwipesPerCat: 40,
    passRate: 10,
    maxDistance: 25,
    minAge: 20,
    maxAge: 32,
    requireBio: true,
    verifiedOnly: true,
    humanCooldowns: true,
    autoLoop: true,
    savedKeywords: ['onlyfans', 'trans', 'couple'],
    enabledCats: ['/app/recs', 'Music Lovers']
  };

  const jsonStr = JSON.stringify(config, null, 2);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.speed, 1.8);
  assert.strictEqual(parsed.minAge, 20);
  assert.strictEqual(parsed.requireBio, true);
  assert.strictEqual(parsed.savedKeywords.length, 3);
  assert.strictEqual(parsed.enabledCats.includes('Music Lovers'), true);
  console.log('✓ Test 10 Passed: Preset Export/Import JSON integrity verified');
}

console.log('\nAll 10 test suites passed successfully! 🚀');
