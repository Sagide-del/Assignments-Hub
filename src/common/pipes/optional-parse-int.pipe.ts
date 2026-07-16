import { ArgumentMetadata, Injectable, ParseIntPipe, PipeTransform } from '@nestjs/common';

/**
 * Drop-in replacement for `new ParseIntPipe({ optional: true })` on optional
 * numeric query params (e.g. `?schoolId=`).
 *
 * Nest's built-in `optional: true` only skips validation when the value is
 * literally `undefined` (i.e. the param was omitted entirely). It does NOT
 * treat an empty string as absent — and browsers/frontends very commonly
 * send `?schoolId=` (e.g. an unselected <select>, or a template literal
 * building a URL from an empty variable) rather than omitting the param.
 * That empty string then fails ParseIntPipe's "is this numeric" check and
 * the whole request 400s with "Validation failed (numeric string is
 * expected)" — which is exactly the bug that broke GET /lab-sessions (and
 * every other optional schoolId/studentId/assignmentId filter in this API).
 *
 * IMPORTANT: this pipe never actually sees the raw query string. The app's
 * global `ValidationPipe({ transform: true })` (see main.ts) runs on every
 * parameter BEFORE any param-level pipe, and for a `@Query()` param typed
 * `number` it unconditionally applies `+value` (see @nestjs/common's
 * ValidationPipe.transformPrimitive) — with NO guard for `undefined`.
 * `+undefined` is `NaN`, so an omitted param arrives here as the *number*
 * `NaN`, not `undefined`, and an explicitly empty `?schoolId=` arrives as
 * `NaN` too (`+''` is `0`... actually `+'' ` is `0` — but `parseFloat`-style
 * edge cases aside, any non-numeric-looking string also collapses to `NaN`
 * here). Either way, by the time this pipe runs the "was it provided"
 * signal is a `NaN` number, not a missing/empty string — treating only
 * `string`/`undefined`/`null` as "not provided" (the pipe's original
 * design, before the global pipe was added) crashes with
 * "NaN.toLowerCase is not a function" on literally every omitted optional
 * numeric filter in the API.
 *
 * This pipe treats `undefined`, `null`, `NaN`, `''`, and — because a very
 * common frontend bug is building a URL with a template literal over a JS
 * `undefined`/`null` variable, e.g. `` `?schoolId=${schoolId}` `` producing
 * the literal text "undefined" or "null" — the strings `"undefined"` and
 * `"null"` (any casing, surrounding whitespace trimmed) all as "not
 * provided". Only an actual finite number (or non-empty numeric-looking
 * string, for safety if this pipe is ever used ahead of the global pipe)
 * reaches the real ParseIntPipe.
 *
 * Implemented as a plain PipeTransform (not `extends ParseIntPipe`) because
 * ParseIntPipe's `transform` is typed `(value: string) => Promise<number>`
 * — overriding it with a wider input type and an optional return type isn't
 * a valid override in TypeScript. Delegating to an internal ParseIntPipe
 * instance sidesteps that entirely.
 */
@Injectable()
export class OptionalParseIntPipe implements PipeTransform<unknown, Promise<number | undefined>> {
  private readonly delegate = new ParseIntPipe();

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<number | undefined> {
    // Already a number by the time it gets here (see class doc) — the
    // global ValidationPipe's `+value` coercion already happened. NaN means
    // "nothing usable was provided" (omitted, empty, or non-numeric);
    // anything else is already the answer, no further parsing needed.
    if (typeof value === 'number') {
      return Number.isNaN(value) ? undefined : value;
    }

    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (
      trimmed === undefined ||
      trimmed === null ||
      trimmed === '' ||
      (typeof trimmed === 'string' && ['undefined', 'null'].includes(trimmed.toLowerCase()))
    ) {
      return undefined;
    }
    return this.delegate.transform(trimmed as string, metadata);
  }
}
