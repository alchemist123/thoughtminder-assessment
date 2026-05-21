'use strict';
const axios = require('axios');
const AppError = require('../utils/AppError');

const LANGUAGE_IDS = {
  python:     71,
  javascript: 63,
  cpp:        54,
};

// Status IDs that mean the submission is still being processed by Judge0
const PENDING_STATUSES = new Set([1, 2]); // 1 = In Queue, 2 = Processing

// Dedicated axios instance so we don't pollute the default config
const judgeAxios = axios.create({
  // baseURL is resolved at call time from env so hot-reload works in dev
  timeout: 12000,
});

// ── Error normalisation ───────────────────────────────────────────────────

const normaliseError = (err) => {
  if (err instanceof AppError) throw err;

  // Network-level failures (no HTTP response received)
  if (!err.response) {
    const code = err.code ?? '';
    if (code === 'ECONNREFUSED') {
      throw new AppError('Code execution service is unavailable (connection refused)', 503);
    }
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT') {
      throw new AppError('Code execution service did not respond in time', 503);
    }
    throw new AppError(`Code execution service unreachable: ${err.message}`, 503);
  }

  // HTTP error response from Judge0
  throw new AppError(
    `Code execution service returned ${err.response.status}: ${err.response.data?.message ?? 'unknown error'}`,
    502
  );
};

// ── Core methods ──────────────────────────────────────────────────────────

const submitCode = async ({ source_code, language, stdin = '' }) => {
  const language_id = LANGUAGE_IDS[language];
  if (!language_id) {
    throw new AppError(
      `Unsupported language '${language}'. Supported: ${Object.keys(LANGUAGE_IDS).join(', ')}`,
      400
    );
  }

  try {
    const { data } = await judgeAxios.post(
      `${process.env.JUDGE0_URL}/submissions`,
      {
        source_code,
        language_id,
        stdin: stdin ?? '',
        cpu_time_limit:  5,
        memory_limit:    128000,
      },
      { params: { base64_encoded: false, wait: false } }
    );
    return { token: data.token };
  } catch (err) {
    normaliseError(err);
  }
};

const getResult = async (token) => {
  try {
    const { data } = await judgeAxios.get(
      `${process.env.JUDGE0_URL}/submissions/${token}`,
      { params: { base64_encoded: false } }
    );
    return {
      status:         data.status,           // { id, description }
      stdout:         data.stdout  ?? null,
      stderr:         data.stderr  ?? null,
      compile_output: data.compile_output ?? null,
      time:           data.time    ?? null,
      memory:         data.memory  ?? null,
    };
  } catch (err) {
    normaliseError(err);
  }
};

const waitForResult = async (token, maxAttempts = 10, intervalMs = 1500) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getResult(token);

    if (!PENDING_STATUSES.has(result.status.id)) {
      return result;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new AppError(
    'Code execution timed out — no result after maximum polling attempts',
    408
  );
};

// ── Higher-level helpers ──────────────────────────────────────────────────

const runSampleCode = async ({ source_code, language, sample_input }) => {
  const { token } = await submitCode({ source_code, language, stdin: sample_input });
  const result    = await waitForResult(token);

  return {
    stdout:         result.stdout,
    stderr:         result.stderr,
    compile_output: result.compile_output,
    status:         result.status.description,
    status_id:      result.status.id,
    time:           result.time,
  };
};

const runTestCases = async ({ source_code, language, test_cases }) => {
  const results = [];

  for (const tc of test_cases) {
    const { token } = await submitCode({ source_code, language, stdin: String(tc.input) });
    const result    = await waitForResult(token);

    const actual   = result.stdout?.trim() ?? '';
    const expected = String(tc.expected_output).trim();

    // Accepted (status 3) AND output matches
    const is_correct = result.status.id === 3 && actual === expected;

    results.push({
      input:           tc.input,
      expected_output: tc.expected_output,
      actual_output:   result.stdout,
      stderr:          result.stderr,
      compile_output:  result.compile_output,
      status:          result.status.description,
      status_id:       result.status.id,
      is_correct,
      time:            result.time,
    });
  }

  return results;
};

module.exports = { submitCode, getResult, waitForResult, runSampleCode, runTestCases };
