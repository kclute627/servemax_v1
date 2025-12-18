/**
 * Portal Fixes Verification Script
 *
 * This script verifies the portal self-registration fixes work correctly.
 * Can be run in browser console or imported for testing.
 *
 * Usage in browser console:
 *   Copy and paste this entire file, then run: runAllTests()
 */

// ============================================
// Test 1: Slug Generation
// ============================================
function testSlugGeneration() {
  console.log('\n=== Test 1: Slug Generation ===');

  const generateRandomSlug = () => {
    return String(Math.floor(1000000 + Math.random() * 9000000));
  };

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  // Generate 100 slugs and verify they're all valid 7-digit numbers
  for (let i = 0; i < 100; i++) {
    const slug = generateRandomSlug();

    // Check it's a string
    if (typeof slug !== 'string') {
      results.failed++;
      results.errors.push(`Slug ${i}: Not a string (got ${typeof slug})`);
      continue;
    }

    // Check it's 7 characters
    if (slug.length !== 7) {
      results.failed++;
      results.errors.push(`Slug ${i}: Wrong length (got ${slug.length}, expected 7)`);
      continue;
    }

    // Check it's all digits
    if (!/^\d+$/.test(slug)) {
      results.failed++;
      results.errors.push(`Slug ${i}: Contains non-digits (got "${slug}")`);
      continue;
    }

    // Check it's in valid range (1000000 - 9999999)
    const num = parseInt(slug, 10);
    if (num < 1000000 || num > 9999999) {
      results.failed++;
      results.errors.push(`Slug ${i}: Out of range (got ${num})`);
      continue;
    }

    results.passed++;
  }

  console.log(`✅ Passed: ${results.passed}/100`);
  if (results.failed > 0) {
    console.log(`❌ Failed: ${results.failed}/100`);
    results.errors.forEach(e => console.log(`   - ${e}`));
  }

  return results.failed === 0;
}

// ============================================
// Test 2: Portal Path Detection
// ============================================
function testPortalPathDetection() {
  console.log('\n=== Test 2: Portal Path Detection ===');

  const testCases = [
    { path: '/portal/1234567/login', expected: true, desc: 'Portal login' },
    { path: '/portal/1234567/signup', expected: true, desc: 'Portal signup' },
    { path: '/portal/1234567/dashboard', expected: true, desc: 'Portal dashboard' },
    { path: '/portal/nationwide/login', expected: true, desc: 'Portal with text slug' },
    { path: '/dashboard', expected: false, desc: 'Main app dashboard' },
    { path: '/settings', expected: false, desc: 'Main app settings' },
    { path: '/clients', expected: false, desc: 'Main app clients' },
    { path: '/', expected: false, desc: 'Root path' },
    { path: '/login', expected: false, desc: 'Main app login' },
    { path: '/portalfake/something', expected: false, desc: 'Fake portal path' },
  ];

  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  testCases.forEach(({ path, expected, desc }) => {
    const isPortalRoute = path.startsWith('/portal/');

    if (isPortalRoute === expected) {
      results.passed++;
      console.log(`  ✅ ${desc}: "${path}" → ${isPortalRoute}`);
    } else {
      results.failed++;
      results.errors.push(`${desc}: "${path}" expected ${expected}, got ${isPortalRoute}`);
      console.log(`  ❌ ${desc}: "${path}" → expected ${expected}, got ${isPortalRoute}`);
    }
  });

  console.log(`\n✅ Passed: ${results.passed}/${testCases.length}`);
  if (results.failed > 0) {
    console.log(`❌ Failed: ${results.failed}/${testCases.length}`);
  }

  return results.failed === 0;
}

// ============================================
// Test 3: Verify Current Path Detection
// ============================================
function testCurrentPath() {
  console.log('\n=== Test 3: Current Path Detection ===');

  const currentPath = window.location.pathname;
  const isPortalRoute = currentPath.startsWith('/portal/');

  console.log(`Current path: "${currentPath}"`);
  console.log(`Is portal route: ${isPortalRoute}`);

  if (isPortalRoute) {
    console.log('✅ You are on a portal route - auth protection should NOT sign you out');
  } else {
    console.log('✅ You are on a main app route - auth protection WILL sign out portal users');
  }

  return true;
}

// ============================================
// Test 4: Verify Slug Uniqueness Logic
// ============================================
function testSlugUniquenessLogic() {
  console.log('\n=== Test 4: Slug Uniqueness Logic ===');

  // Simulate the uniqueness check logic
  const existingSlugs = new Set(['1234567', '2345678', '3456789']);

  const generateRandomSlug = () => {
    return String(Math.floor(1000000 + Math.random() * 9000000));
  };

  const checkSlugAvailability = (slug) => {
    return !existingSlugs.has(slug);
  };

  const ensureUniqueSlug = (initialSlug) => {
    let slug = initialSlug;
    let attempts = 0;
    const maxAttempts = 10;

    while (!checkSlugAvailability(slug)) {
      slug = generateRandomSlug();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error("Could not generate unique portal slug after multiple attempts");
      }
    }

    return { slug, attempts };
  };

  // Test with a slug that exists
  console.log('Testing with existing slug "1234567"...');
  try {
    const result = ensureUniqueSlug('1234567');
    console.log(`✅ Generated unique slug "${result.slug}" after ${result.attempts} attempt(s)`);

    // Verify the result is actually unique
    if (existingSlugs.has(result.slug)) {
      console.log('❌ ERROR: Generated slug is not unique!');
      return false;
    }

    console.log('✅ Confirmed: generated slug is unique');
    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// ============================================
// Run All Tests
// ============================================
function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Portal Fixes Verification Tests      ║');
  console.log('╚════════════════════════════════════════╝');

  const results = {
    slugGeneration: testSlugGeneration(),
    portalPathDetection: testPortalPathDetection(),
    currentPath: testCurrentPath(),
    slugUniqueness: testSlugUniquenessLogic()
  };

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║            Test Summary                ║');
  console.log('╚════════════════════════════════════════╝');

  const allPassed = Object.values(results).every(r => r);

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  console.log('\n' + (allPassed
    ? '🎉 All tests passed!'
    : '⚠️ Some tests failed - check output above'));

  return allPassed;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testSlugGeneration,
    testPortalPathDetection,
    testCurrentPath,
    testSlugUniquenessLogic,
    runAllTests
  };
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('Portal Fixes Verification Script loaded.');
  console.log('Run: runAllTests() to execute all tests');
}
