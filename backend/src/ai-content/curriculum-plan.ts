import type { AiExtractedContentDocument } from "./interfaces/ai-content.types";
export function curriculumUnits(content: AiExtractedContentDocument) {
  return content.topics.flatMap((topic) =>
    topic.subtopics.length
      ? topic.subtopics.map((sub) => ({
          id: sub.id,
          topicId: topic.id,
          subtopicIds: [sub.id],
          strand: topic.name,
          subStrand: sub.name,
          outcomes: sub.learningOutcomes ?? [],
          sourceContent: sub.sourceContent,
        }))
      : [
          {
            id: topic.id,
            topicId: topic.id,
            subtopicIds: [],
            strand: topic.name,
            subStrand: topic.name,
            outcomes: [],
            sourceContent: topic.sourceContent,
          },
        ],
  );
}
