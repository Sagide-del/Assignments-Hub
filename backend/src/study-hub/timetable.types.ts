export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
export type DayName = (typeof DAYS)[number];
export type ActivityType = "STUDY" | "RECALL" | "BREAK" | "REWARD";
export type Technique =
  | "Pomodoro"
  | "Interleaving"
  | "Spaced Repetition"
  | "Active Recall"
  | "Rest"
  | "Reward";
export interface Topic {
  subject: string;
  topic: string;
  weak: boolean;
  percentage: number | null;
  module_id?: string;
}
export interface FocusSubject {
  subject: string;
  percentage: number | null;
  weak: boolean;
  topics: Topic[];
  sources: string[];
}
export interface SchoolBlock {
  day: DayName;
  start: string;
  end: string;
  label: string;
}
export interface ReviewDue {
  subject: string;
  topic: string;
  learning_date: string;
  due_date: string;
  offset_days: 1 | 3 | 7;
  module_id?: string;
}
export interface StudyBlock {
  id: string;
  start: string;
  end: string;
  subject: string;
  topic: string;
  technique: Technique;
  activity_type: ActivityType;
  quiz_link: string | null;
  activity: string;
  focus_zone: boolean;
  session_id?: string;
  study_block_id?: string;
  module_id?: string;
  recall_prompts?: string[];
  review?: ReviewDue;
  school_commitment?: boolean;
}
export interface StudyDay {
  day: DayName;
  date: string;
  window: { start: string; end: string };
  blocks: StudyBlock[];
}
export interface WeeklyPlan {
  version: 1;
  status: "READY";
  revision: string;
  week_start: string;
  timezone: "Africa/Nairobi";
  days: StudyDay[];
  focus_subjects: FocusSubject[];
  source: "AI" | "TEMPLATE";
  warnings: string[];
  completed_block_ids: string[];
  quiz_results: Record<
    string,
    { score: number; total: number; completed_at: string }
  >;
  review_schedule: ReviewDue[];
  next_week_reviews: ReviewDue[];
  school_schedule_applied: boolean;
  report_card_files: number;
  quote: string;
}
export interface AiDays {
  days: {
    day: DayName;
    blocks: Pick<
      StudyBlock,
      | "start"
      | "end"
      | "subject"
      | "topic"
      | "technique"
      | "activity_type"
      | "quiz_link"
      | "activity"
    >[];
  }[];
}
