import test from "node:test";
import assert from "node:assert/strict";
import { assertKjseaApiReady } from "./kjsea-api-contract.mjs";
const ready = {
  version: "kjsea-maths-v1",
  questionCount: 40,
  topicCount: 32,
  visualCount: 20,
  gradeSelection: true,
  seniorMocks: true,
  assessmentWorkspaceVersion: 3,
  fullExamVersion: 1,
};
test("current structured-exam workspace passes the production deployment gate", () => {
  assert.doesNotThrow(() => assertKjseaApiReady(ready));
});
test("older workspaces and missing full-paper support remain blocked with a specific diagnostic", () => {
  assert.throws(
    () => assertKjseaApiReady({ ...ready, assessmentWorkspaceVersion: 2 }),
    /assessmentWorkspaceVersion.*2.*at least 3/,
  );
  assert.throws(
    () => assertKjseaApiReady({ ...ready, fullExamVersion: undefined }),
    /fullExamVersion/,
  );
});
test("compatible newer capability versions pass while invalid metadata remains blocked", () => {
  assert.doesNotThrow(() =>
    assertKjseaApiReady({ ...ready, assessmentWorkspaceVersion: 4 }),
  );
  assert.throws(
    () => assertKjseaApiReady({ ...ready, assessmentWorkspaceVersion: "3" }),
    /assessmentWorkspaceVersion/,
  );
  assert.throws(
    () => assertKjseaApiReady({ ...ready, questionCount: 0 }),
    /questionCount/,
  );
  assert.throws(() => assertKjseaApiReady(null), /version/);
});
