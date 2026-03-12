import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { writeFileSync } from 'node:fs';
import { postComment } from './comment.js';

async function run(): Promise<void> {
  try {
    const path = core.getInput('path');
    const format = core.getInput('format');
    const diff = core.getBooleanInput('diff');
    const comment = core.getBooleanInput('comment');

    // vali check 실행 (JSON 출력)
    let stdout = '';
    const args = ['vali', 'check', path, '--format', 'json'];
    if (diff) args.push('--diff');

    const exitCode = await exec.exec('npx', args, {
      listeners: { stdout: (data) => { stdout += data.toString(); } },
      ignoreReturnCode: true,
    });

    const result = JSON.parse(stdout);

    // outputs 설정
    core.setOutput('score', result.score.score);
    core.setOutput('error-count', result.summary.errorCount);
    core.setOutput('warning-count', result.summary.warningCount);

    // PR 코멘트 게시
    if (comment && process.env.GITHUB_EVENT_NAME === 'pull_request') {
      const token = core.getInput('token');
      await postComment(result, token);
    }

    // SARIF 출력
    if (format === 'sarif') {
      let sarifOutput = '';
      const sarifArgs = ['vali', 'check', path, '--format', 'sarif'];
      if (diff) sarifArgs.push('--diff');

      await exec.exec('npx', sarifArgs, {
        listeners: {
          stdout: (data) => { sarifOutput += data.toString(); },
        },
        ignoreReturnCode: true,
      });

      writeFileSync('vali-results.sarif', sarifOutput);
      core.setOutput('sarif-file', 'vali-results.sarif');
    }

    // error가 있으면 action 실패
    if (result.summary.errorCount > 0) {
      core.setFailed(`Vali found ${result.summary.errorCount} error(s)`);
    }
  } catch (err: any) {
    core.setFailed(err.message);
  }
}

run();
