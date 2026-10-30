// Shared by the production deployment gate and its regression tests.
export function assertKjseaApiReady(data) {
  const expected = {
    version: "kjsea-maths-v1",
    questionCount: 40,
    topicCount: 32,
    visualCount: 20,
    gradeSelection: true,
    seniorMocks: true,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (data?.[field] !== value) {
      throw new Error(
        `Mock API ${field}: received ${JSON.stringify(data?.[field])}; expected ${JSON.stringify(value)}`,
      );
    }
  }
  // The current frontend uses structured answers/full papers introduced in v3.
  for (const [field, minimum] of [
    ["assessmentWorkspaceVersion", 3],
    ["fullExamVersion", 1],
  ]) {
    if (!Number.isInteger(data[field]) || data[field] < minimum) {
      throw new Error(
        `Mock API ${field}: received ${JSON.stringify(data[field])}; requires at least ${minimum}`,
      );
    }
  }
}
