/**
 * 简易测试框架
 */
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

export function describe(name, fn) {
    console.group(`📦 ${name}`);
    fn();
    console.groupEnd();
}

export function it(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, status: 'passed' });
        console.log(`  ✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'failed', error: error.message });
        console.error(`  ❌ ${name}`);
        console.error(`     ${error.message}`);
    }
}

export function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${expected} but got ${actual}`);
            }
        },
        toEqual(expected) {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
            }
        },
        toContain(item) {
            if (!actual.includes(item)) {
                throw new Error(`Expected array to contain ${item}`);
            }
        },
        toBeTruthy() {
            if (!actual) {
                throw new Error(`Expected truthy value but got ${actual}`);
            }
        },
        toBeFalsy() {
            if (actual) {
                throw new Error(`Expected falsy value but got ${actual}`);
            }
        },
        toThrow() {
            let threw = false;
            try {
                actual();
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error('Expected function to throw');
            }
        }
    };
}

export function beforeEach(fn) {
    // 简化实现，实际会在每个 it 前调用
}

export function getResults() {
    return { ...results };
}

export function printSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`   Passed: ${results.passed}`);
    console.log(`   Failed: ${results.failed}`);
    console.log(`   Total: ${results.passed + results.failed}`);
    return results.failed === 0;
}
