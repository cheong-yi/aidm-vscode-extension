#!/bin/bash

# Universal Test Runner with Enhanced Human-Readable JSON Output
# Enhanced parser with detailed output for debugging efficiency

set -euo pipefail

# Default values
LANGUAGE=""
TEST_PATH=""
OUTPUT_FILE="test-results/test-output.json"
FRAMEWORK=""

# Usage function
usage() {
    echo "Usage: $0 <language> [test-path]"
    echo ""
    echo "Languages supported:"
    echo "  typescript, ts, jest  - Run TypeScript/Jest tests"
    echo "  python, py, pytest   - Run Python/pytest tests"
    echo ""
    echo "Examples:"
    echo "  $0 typescript                           # Run all TypeScript tests"
    echo "  $0 jest src/__tests__/unit              # Run specific test directory"
    echo "  $0 ts --testPathPattern=\"TaskHTMLGenerator\"  # Run tests matching pattern"
    echo "  $0 python unit-tests/                   # Run all Python tests"
    echo "  $0 pytest test_file.py::test_function   # Run specific test function"
    echo ""
    exit 1
}

# Parse arguments
if [ $# -lt 1 ]; then
    usage
fi

LANGUAGE="$1"
shift
TEST_ARGS="$@"

# Normalize language input
case "${LANGUAGE,,}" in
    "typescript"|"ts"|"jest")
        FRAMEWORK="jest"
        ;;
    "python"|"py"|"pytest")
        FRAMEWORK="pytest"
        ;;
    *)
        echo "Error: Unsupported language '$LANGUAGE'"
        usage
        ;;
esac

# Create output directory
mkdir -p "$(dirname "$OUTPUT_FILE")"

# Current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "Running $FRAMEWORK tests with enhanced output..."
echo "Output will be saved to: $OUTPUT_FILE"

# Function to parse Jest JSON output into enhanced format (from file)
parse_jest_output_from_file() {
    local json_file="$1"
    local execution_time="$2"
    
    # Use Node.js to parse Jest JSON output and create enhanced format
    node -e "
    const fs = require('fs');
    const jestResult = JSON.parse(fs.readFileSync('$json_file', 'utf8'));
    
    // Extract failing tests with detailed information
    const failingTestsList = [];
    
    jestResult.testResults.forEach(testFile => {
        if (testFile.status === 'failed' || testFile.assertionResults.some(test => test.status === 'failed')) {
            testFile.assertionResults.forEach(test => {
                if (test.status === 'failed') {
                    const failingTest = {
                        name: test.fullName || test.title,
                        file: testFile.name,
                        line: test.location ? test.location.line : null,
                        error: test.failureMessages.length > 0 ? 
                               test.failureMessages[0].split('\n')[0].trim() : 
                               'Test failed without specific error message',
                        errorType: extractErrorType(test.failureMessages[0] || ''),
                        duration: test.duration || 0,
                        stackTrace: test.failureMessages.join('\n')
                    };
                    failingTestsList.push(failingTest);
                }
            });
        }
    });
    
    function extractErrorType(message) {
        const errorTypeMatch = message.match(/^(\w+Error):/);
        if (errorTypeMatch) return errorTypeMatch[1];
        
        if (message.includes('expect')) return 'AssertionError';
        if (message.includes('TypeError')) return 'TypeError';
        if (message.includes('ReferenceError')) return 'ReferenceError';
        if (message.includes('timeout')) return 'TimeoutError';
        return 'UnknownError';
    }
    
    function generateSummary(failingTests) {
        if (failingTests.length === 0) {
            return {
                quickFix: 'All tests passed',
                actionRequired: 'No action needed'
            };
        }
        
        if (failingTests.length === 1) {
            const test = failingTests[0];
            const fileName = test.file.split('/').pop() || 'unknown file';
            return {
                quickFix: \`1 \${test.errorType.toLowerCase()} in \${fileName}\`,
                actionRequired: \`Check \${test.name} in \${fileName}\`
            };
        }
        
        const errorTypes = {};
        failingTests.forEach(test => {
            errorTypes[test.errorType] = (errorTypes[test.errorType] || 0) + 1;
        });
        
        const primaryError = Object.keys(errorTypes).reduce((a, b) => 
            errorTypes[a] > errorTypes[b] ? a : b);
        
        return {
            quickFix: \`\${failingTests.length} test failures, primarily \${primaryError.toLowerCase()}\`,
            actionRequired: \`Review \${failingTests.length} failing tests across multiple files\`
        };
    }
    
    const enhancedResult = {
        lastRunDate: '$TIMESTAMP',
        totalTests: jestResult.numTotalTests,
        passedTests: jestResult.numPassedTests,
        failedTests: jestResult.numFailedTests,
        executionTime: $execution_time,
        failingTestsList: failingTestsList,
        framework: 'jest',
        language: 'typescript',
        summary: generateSummary(failingTestsList)
    };
    
    console.log(JSON.stringify(enhancedResult, null, 2));
    "
}

# Function to run Jest tests
run_jest_tests() {
    local start_time=$(date +%s%3N)
    local temp_file=$(mktemp)
    
    # Skip pretest (compile + lint) for faster execution and run jest directly
    echo "Executing: npx jest --json --verbose --no-coverage $TEST_ARGS"
    
    # Run Jest directly with JSON output, capture both success and failure
    if timeout 240s npx jest --json --verbose --no-coverage --passWithNoTests $TEST_ARGS > "$temp_file" 2>&1; then
        test_exit_code=0
    else
        test_exit_code=$?
    fi
    
    local end_time=$(date +%s%3N)
    local execution_time=$((end_time - start_time))
    
    # Read the Jest output
    local jest_json_output=$(cat "$temp_file")
    
    # Try to extract JSON from the output (Jest output may have extra text)
    local json_start=$(echo "$jest_json_output" | grep -n '^{' | head -1 | cut -d: -f1)
    if [ -n "$json_start" ]; then
        jest_json_output=$(echo "$jest_json_output" | tail -n +$json_start)
    fi
    
    # Check if we have any JSON output
    if [ -z "$jest_json_output" ]; then
        echo "Warning: No Jest output received. Creating fallback output..."
        create_fallback_output "$execution_time" "No output from Jest execution"
    elif echo "$jest_json_output" | jq . >/dev/null 2>&1; then
        echo "Parsing Jest output into enhanced format..."
        # Write JSON to temporary file instead of passing as string to avoid escaping issues
        local json_temp_file=$(mktemp)
        echo "$jest_json_output" > "$json_temp_file"
        parse_jest_output_from_file "$json_temp_file" "$execution_time" > "$OUTPUT_FILE"
        rm -f "$json_temp_file"
    else
        echo "Warning: Jest output was not valid JSON. Creating fallback output..."
        echo "Raw Jest output (first 500 chars): $(echo "$jest_json_output" | head -c 500)"
        create_fallback_output "$execution_time" "$jest_json_output"
    fi
    
    # Cleanup
    rm -f "$temp_file"
    
    echo "Test execution completed with exit code: $test_exit_code"
    return $test_exit_code
}

# Function to create fallback output when JSON parsing fails
create_fallback_output() {
    local execution_time="$1"
    local raw_output="$2"
    
    # Create a basic structure when we can't parse Jest output
    cat > "$OUTPUT_FILE" << EOF
{
  "lastRunDate": "$TIMESTAMP",
  "totalTests": 0,
  "passedTests": 0,
  "failedTests": 0,
  "executionTime": $execution_time,
  "failingTestsList": [
    {
      "name": "Test execution failed",
      "file": "unknown",
      "line": null,
      "error": "Unable to parse test output - check console for details",
      "errorType": "ExecutionError",
      "duration": 0,
      "stackTrace": "Raw output was not in expected JSON format"
    }
  ],
  "framework": "$FRAMEWORK",
  "language": "typescript",
  "summary": {
    "quickFix": "Test execution failed - check configuration",
    "actionRequired": "Review test setup and ensure framework is properly configured"
  },
  "rawOutput": $(echo "$raw_output" | jq -Rs .)
}
EOF
}

# Function to parse pytest output into enhanced format
parse_pytest_output() {
    local pytest_output="$1"
    local execution_time="$2"
    
    # Use Python to parse pytest output and create enhanced format
    python3 -c "
import json
import re
import sys
from datetime import datetime

pytest_output = '''$pytest_output'''

# Parse pytest -v --tb=short output
def parse_pytest_output(output):
    lines = output.split('\n')
    failing_tests = []
    
    # Look for FAILURES section
    in_failures = False
    current_test = {}
    
    for line in lines:
        if line.startswith('FAILURES'):
            in_failures = True
            continue
        elif line.startswith('=') and 'short test summary' in line.lower():
            in_failures = False
            continue
            
        if in_failures:
            # Test failure header: _ TestClass.test_method _
            if line.startswith('_') and line.endswith('_'):
                test_name = line.strip('_ ')
                current_test = {'name': f'should {test_name.replace(\"_\", \" \")}'}
                continue
            
            # File and line info: path/file.py:123: in test_method
            file_match = re.match(r'^(.+):(\d+): in (\w+)', line)
            if file_match:
                current_test['file'] = file_match.group(1)
                current_test['line'] = int(file_match.group(2))
                continue
            
            # Error line starting with 'E   ' 
            if line.startswith('E   '):
                error_text = line[4:]  # Remove 'E   '
                if 'error' not in current_test:
                    current_test['error'] = error_text
                    current_test['errorType'] = extract_error_type(error_text)
                continue
                
            # If we have enough info, save the test
            if 'name' in current_test and 'error' in current_test and line.strip() == '':
                current_test['duration'] = 0  # pytest doesn't provide individual durations easily
                current_test['stackTrace'] = current_test.get('error', '')
                failing_tests.append(current_test)
                current_test = {}
    
    # Handle last test if not saved
    if 'name' in current_test and 'error' in current_test:
        current_test['duration'] = 0
        current_test['stackTrace'] = current_test.get('error', '')
        failing_tests.append(current_test)
    
    return failing_tests

def extract_error_type(error_text):
    if 'AssertionError:' in error_text:
        return 'AssertionError'
    elif 'TypeError:' in error_text:
        return 'TypeError'
    elif 'ValueError:' in error_text:
        return 'ValueError'
    elif 'FileNotFoundError:' in error_text:
        return 'FileNotFoundError'
    elif 'assert' in error_text.lower():
        return 'AssertionError'
    else:
        return 'UnknownError'

def extract_test_stats(output):
    # Look for test summary line like: 1 failed, 2 passed in 0.12s
    pattern = r'(\d+)\s+failed.*?(\d+)\s+passed'
    match = re.search(pattern, output)
    if match:
        failed = int(match.group(1))
        passed = int(match.group(2))
        return failed + passed, passed, failed
    return 0, 0, 0

def generate_summary(failing_tests):
    if len(failing_tests) == 0:
        return {
            'quickFix': 'All tests passed',
            'actionRequired': 'No action needed'
        }
    
    if len(failing_tests) == 1:
        test = failing_tests[0]
        file_name = test.get('file', 'unknown file').split('/')[-1]
        return {
            'quickFix': f'1 {test[\"errorType\"].lower()} in {file_name}',
            'actionRequired': f'Check {test[\"name\"]} in {file_name}'
        }
    
    error_types = {}
    for test in failing_tests:
        error_type = test['errorType']
        error_types[error_type] = error_types.get(error_type, 0) + 1
    
    primary_error = max(error_types, key=error_types.get)
    
    return {
        'quickFix': f'{len(failing_tests)} test failures, primarily {primary_error.lower()}',
        'actionRequired': f'Review {len(failing_tests)} failing tests across multiple files'
    }

# Parse the output
failing_tests = parse_pytest_output(pytest_output)
total_tests, passed_tests, failed_tests = extract_test_stats(pytest_output)

enhanced_result = {
    'lastRunDate': datetime.utcnow().isoformat() + 'Z',
    'totalTests': total_tests,
    'passedTests': passed_tests,
    'failedTests': failed_tests,
    'executionTime': $execution_time,
    'failingTestsList': failing_tests,
    'framework': 'pytest',
    'language': 'python',
    'summary': generate_summary(failing_tests)
}

print(json.dumps(enhanced_result, indent=2))
"
}

# Function to run pytest tests
run_pytest_tests() {
    local start_time=$(date +%s%3N)
    local temp_file=$(mktemp)
    
    echo "Executing: python -m pytest -v --tb=short $TEST_ARGS"
    
    # Run pytest with verbose output and short traceback
    if timeout 120s python -m pytest -v --tb=short $TEST_ARGS > "$temp_file" 2>&1; then
        test_exit_code=0
    else
        test_exit_code=$?
    fi
    
    local end_time=$(date +%s%3N)
    local execution_time=$((end_time - start_time))
    
    # Read the pytest output
    local pytest_output=$(cat "$temp_file")
    
    if [ -n "$pytest_output" ]; then
        echo "Parsing pytest output into enhanced format..."
        # Escape single quotes for safe passing to python
        local escaped_output=$(echo "$pytest_output" | sed "s/'/\\\'/g")
        parse_pytest_output "$escaped_output" "$execution_time" > "$OUTPUT_FILE"
    else
        echo "Warning: No pytest output received. Creating fallback output..."
        create_fallback_output "$execution_time" "No output from pytest execution"
    fi
    
    # Cleanup
    rm -f "$temp_file"
    
    echo "Test execution completed with exit code: $test_exit_code"
    return $test_exit_code
}

# Run tests based on framework
case "$FRAMEWORK" in
    "jest")
        run_jest_tests
        test_result=$?
        ;;
    "pytest")
        run_pytest_tests
        test_result=$?
        ;;
    *)
        echo "Error: Unsupported framework '$FRAMEWORK'"
        exit 1
        ;;
esac

# Display results summary
echo ""
echo "=== Test Results Summary ==="
if [ -f "$OUTPUT_FILE" ]; then
    echo "Results saved to: $OUTPUT_FILE"
    echo ""
    
    # Display quick summary using jq if available
    if command -v jq >/dev/null 2>&1; then
        echo "Quick Summary:"
        jq -r '.summary.quickFix' "$OUTPUT_FILE" 2>/dev/null || echo "Could not parse summary"
        echo ""
        echo "Action Required:"
        jq -r '.summary.actionRequired' "$OUTPUT_FILE" 2>/dev/null || echo "Could not parse action required"
        echo ""
        echo "Stats:"
        jq -r '"Total: " + (.totalTests | tostring) + " | Passed: " + (.passedTests | tostring) + " | Failed: " + (.failedTests | tostring) + " | Time: " + (.executionTime | tostring) + "ms"' "$OUTPUT_FILE" 2>/dev/null || echo "Could not parse stats"
        
        # Show failing tests if any
        local failing_count=$(jq -r '.failingTestsList | length' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        if [ "$failing_count" -gt "0" ]; then
            echo ""
            echo "Failing Tests:"
            jq -r '.failingTestsList[] | "• " + .name + " (" + .file + ":" + (.line | tostring) + ") - " + .error' "$OUTPUT_FILE" 2>/dev/null || echo "Could not parse failing tests"
        fi
    else
        echo "Install 'jq' for formatted output display"
        echo "Raw file created at: $OUTPUT_FILE"
    fi
else
    echo "Error: Output file was not created"
fi

echo ""
exit $test_result