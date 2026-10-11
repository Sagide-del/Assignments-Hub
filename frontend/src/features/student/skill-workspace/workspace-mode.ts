import type { SkillCourse } from '../../../types';

export type WorkspaceMode = 'PYTHON' | 'MACHINE_LEARNING' | 'ROBOTICS';

export function workspaceModeForCourse(course: SkillCourse): WorkspaceMode | null {
  const value = `${course.title} ${course.category.name}`.toLowerCase();
  if (/robot|arduino|mechatronic/.test(value)) return 'ROBOTICS';
  if (/machine learning|\bml\b|artificial intelligence|\bai\b|data science/.test(value)) {
    return 'MACHINE_LEARNING';
  }
  if (/python|program|coding|software|computing/.test(value)) return 'PYTHON';
  return null;
}

export function hasWorkspaceAccess(course: SkillCourse) {
  return course.costKES === 0
    || course.enrollment?.status === 'ACTIVE'
    || course.enrollment?.status === 'COMPLETED';
}
