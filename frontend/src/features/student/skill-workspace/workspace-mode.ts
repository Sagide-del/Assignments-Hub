import type { SkillCourse, SkillLessonProgress } from '../../../types';

export type WorkspaceMode = 'GUIDED' | 'PYTHON' | 'MACHINE_LEARNING' | 'ROBOTICS';

export interface SkillLesson {
  key: string;
  title: string;
  type: string;
  description?: string;
  audioUrl?: string;
}

export function workspaceModeForCourse(course: SkillCourse): WorkspaceMode {
  const value = `${course.title} ${course.category.name}`.toLowerCase();
  if (/robot|arduino|mechatronic/.test(value)) return 'ROBOTICS';
  if (/machine learning|\bml\b|artificial intelligence|\bai\b|data science/.test(value)) {
    return 'MACHINE_LEARNING';
  }
  if (/python|program|coding|software|computing/.test(value)) return 'PYTHON';
  return 'GUIDED';
}

export function hasWorkspaceAccess(course: SkillCourse) {
  return course.costKES === 0
    || course.enrollment?.status === 'ACTIVE'
    || course.enrollment?.status === 'COMPLETED';
}

export function courseLessons(course: SkillCourse): SkillLesson[] {
  const structure = Array.isArray(course.courseStructure)
    ? course.courseStructure as unknown[]
    : [];
  const outcomes = Array.isArray(course.learningOutcomes)
    ? course.learningOutcomes as unknown[]
    : [];
  const source = structure.length ? structure : outcomes;
  const lessons = source.map((item, index) => normalizeLesson(item, index)).filter(Boolean) as SkillLesson[];
  return lessons.length
    ? lessons
    : [{ key: 'lesson-1', title: 'Course practice', type: 'PRACTICAL', description: course.shortDescription }];
}

function normalizeLesson(item: unknown, index: number): SkillLesson | null {
  if (typeof item === 'string' && item.trim()) {
    return { key: `lesson-${index + 1}`, title: item.trim(), type: 'PRACTICAL' };
  }
  if (!item || typeof item !== 'object') return null;
  const value = item as Record<string, unknown>;
  const title = text(value.title) || text(value.name);
  if (!title) return null;
  return {
    key: `lesson-${index + 1}`,
    title,
    type: text(value.type) || 'PRACTICAL',
    description: text(value.description) || text(value.content) || undefined,
    audioUrl: text(value.audioUrl) || text(value.voiceAudioUrl) || undefined,
  };
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

// Ignore duplicate or removed lesson records when presenting saved progress.
export function summarizeSkillProgress(course: SkillCourse, records: SkillLessonProgress[]) {
  const lessons = courseLessons(course);
  const keys = new Set(lessons.map((lesson) => lesson.key));
  const relevant = records.filter((record) => keys.has(record.lessonKey));
  const completedKeys = new Set(relevant.filter((record) => record.completedAt).map((record) => record.lessonKey));
  const completed = completedKeys.size;
  return {
    completed,
    total: lessons.length,
    percent: Math.round(completed / lessons.length * 100),
    nextLesson: lessons.find((lesson) => !completedKeys.has(lesson.key)) ?? null,
    hasActivity: relevant.length > 0,
    latestActivity: Math.max(0, ...relevant.map((record) => Date.parse(record.updatedAt) || 0)),
  };
}
