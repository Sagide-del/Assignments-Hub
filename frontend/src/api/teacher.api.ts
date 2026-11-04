import { api } from "./axios";
import type { Assignment } from "../types";
export interface TeachingClass {
  id: string;
  subject: string;
  stream_id: string;
  stream: { id: string; grade: string; name: string; school_id: number };
}
export interface ClassStudent {
  id: number;
  name: string;
  grade: string;
  schoolId: number;
  admissionNumber: string | null;
  studentProfile: { stream: string | null } | null;
}
export interface TeacherRecord {
  id: number;
  name: string;
  email: string | null;
  isActive: boolean;
  teacherAssignments: TeachingClass[];
}
export const teacherApi = {
  classes: () =>
    api.get<TeachingClass[]>("/teacher/classes").then((r) => r.data),
  students: () =>
    api.get<ClassStudent[]>("/teacher/students").then((r) => r.data),
  assignments: () =>
    api.get<Assignment[]>("/teacher/assignments").then((r) => r.data),
  teachers: () =>
    api.get<TeacherRecord[]>("/admin/teachers").then((r) => r.data),
  streams: () =>
    api.get<TeachingClass["stream"][]>("/admin/streams").then((r) => r.data),
  createStream: (grade: string, name: string) =>
    api.post("/admin/streams", { grade, name }).then((r) => r.data),
  assign: (teacherId: number, subject: string, stream_id: string) =>
    api
      .post(`/admin/teachers/${teacherId}/assignments`, { subject, stream_id })
      .then((r) => r.data),
  remove: (teacherId: number, id: string) =>
    api
      .delete(`/admin/teachers/${teacherId}/assignments/${id}`)
      .then((r) => r.data),
};
