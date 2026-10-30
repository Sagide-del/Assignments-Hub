const base = (
  process.argv[2] ?? "https://assignments-hub-api.onrender.com/api/v1"
).replace(/\/$/, "");
for (let n = 1; n <= 24; n++) {
  try {
    const r = await fetch(`${base}/content-library/capabilities`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw Error(`HTTP ${r.status}`);
    const d = await r.json();
    if (
      d.centralContentVersion !== 3 ||
      d.practiceBatchSize !== 30 ||
      !d.nativeRecallCards ||
      !Number.isInteger(d.illustratedRecallCardsVersion) ||
      d.illustratedRecallCardsVersion < 1 ||
      !Number.isInteger(d.topicRecallScenesVersion) || d.topicRecallScenesVersion < 1 ||
      !d.savedQuestionLibrary ||
      !d.numberedQuestionBatches ||
      !d.questionPublication ||
      !d.gradeLevels?.includes(6) ||
      !d.bulkCurriculum ||
      !d.collectionIngestion ||
      !d.outcomeGrounding ||
      !d.embeddedCurriculumDiscovery ||
      !d.publicDownloadConfirmation ||
      !d.automaticGradePreparation ||
      d.repositoryCurriculumSnapshot !== "08760594f5390c70fd7b764abd0525f9bf2c4f69"
    )
      throw Error("Backend not ready");
    console.log("PASS: central content library schema and APIs are ready");
    process.exit(0);
  } catch (e) {
    console.log(`Content readiness ${n}/24: ${e.message}`);
  }
  if (n < 24) await new Promise((r) => setTimeout(r, 10000));
}
process.exit(1);
