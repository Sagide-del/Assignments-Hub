export const QUESTION_BANK_SOURCE_MAX_BYTES = 15 * 1024 * 1024;
export const QUESTION_BANK_SOURCE_TEXT_MAX_CHARACTERS = 100_000;
// Minimum fraction of the requested count the model must return before the
// whole generation is treated as a failure. Unlike the per-teacher
// AiTopicAssignmentService (which requires an exact count match for a small
// batch), a 50-100 question bulk generation is reviewed by a human before
// anything reaches a school, so a partial batch is still useful rather than
// being discarded outright.
export const QUESTION_BANK_MIN_ACCEPTABLE_RATIO = 0.5;
