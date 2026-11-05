import type { TestEvent } from 'node:test/reporters';

import { styleText } from 'node:util';

export default async function* reporter(
  source: AsyncGenerator<TestEvent, void>,
): AsyncGenerator<string, void> {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures: Array<Extract<TestEvent, { type: 'test:fail' }>['data']> = [];

  for await (const event of source) {
    switch (event.type) {
      case 'test:pass':
        if (event.data.details.type === 'suite') {
          break;
        }
        if (event.data.skip) {
          skipped++;
        } else {
          passed++;
        }
        break;

      case 'test:fail':
        if (event.data.details.type === 'suite') {
          break;
        }
        failed++;
        failures.push(event.data);
        break;
    }
  }

  if (failures.length) {
    for (const failure of failures) {
      yield `\n✖ ${failure.name}\n`;

      const error = failure.details.error;
      yield `${error.stack || error.message}\n`;
    }
  }

  yield `\n${styleText('green', `${passed} passing`)}`;

  if (failed) {
    yield `, ${styleText('red', `${failed} failing`)}`;
  }
  if (skipped) {
    yield `, ${styleText('yellow', `${skipped} skipped`)}`;
  }

  yield '\n';
}
