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
  timeout: 12000,
});

// ── Base64 helpers ────────────────────────────────────────────────────────
// Always use base64 encoding so arbitrary source code and stdin
// (including non-ASCII chars from editors/clipboard) never triggers
// Judge0's "cannot be converted to UTF-8" 400 error.

const b64encode = (str) => Buffer.from(str ?? '', 'utf8').toString('base64');
const b64decode = (str) => (str ? Buffer.from(str, 'base64').toString('utf8') : null);

// ── Error normalisation ───────────────────────────────────────────────────

const extractJudge0Message = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error)   return data.error;
  // Validation errors: { field: ['message'] }
  const firstVal = Object.values(data)[0];
  if (Array.isArray(firstVal)) return `${Object.keys(data)[0]}: ${firstVal[0]}`;
  return null;
};

const normaliseError = (err) => {
  if (err instanceof AppError) throw err;

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

  const detail = extractJudge0Message(err.response.data) ?? 'unknown error';
  console.error('[Judge0 error]', err.response.status, JSON.stringify(err.response.data));
  throw new AppError(
    `Code execution service returned ${err.response.status}: ${detail}`,
    502
  );
};

// ── Core methods ──────────────────────────────────────────────────────────

const submitCode = async ({ source_code, language, stdin = '' }) => {
  if (!source_code?.trim()) {
    throw new AppError('source_code is empty — write some code before running', 400);
  }

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
        source_code:    b64encode(source_code),
        language_id,
        stdin:          b64encode(stdin),
        cpu_time_limit: 5,
        memory_limit:   128000,
      },
      { params: { base64_encoded: true, wait: false } }
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
      { params: { base64_encoded: true } }
    );
    return {
      status:         data.status,
      stdout:         b64decode(data.stdout),
      stderr:         b64decode(data.stderr),
      compile_output: b64decode(data.compile_output),
      time:           data.time   ?? null,
      memory:         data.memory ?? null,
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
    const { token } = await submitCode({ source_code, language, stdin: String(tc.input ?? '') });
    const result    = await waitForResult(token);

    const actual   = result.stdout?.trim() ?? '';
    const expected = String(tc.expected_output).trim();

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
