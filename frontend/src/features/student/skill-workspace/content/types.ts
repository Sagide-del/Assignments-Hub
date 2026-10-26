export interface LessonSection {
  title: string;
  text: string;
  example?: string;
}
export interface KnowledgeCheck {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}
export interface LessonImage {
  src: string;
  alt: string;
  caption: string;
}
export interface RichSkillLesson {
  key: string;
  title: string;
  type: string;
  description: string;
  minutes: number;
  objective: string;
  sections: LessonSection[];
  activity: { title: string; steps: string[] };
  check: KnowledgeCheck;
  starterCode?: string;
  expectedOutput?: string;
  targetRobot?: { x: number; y: number; direction: number };
  solution?: string;
  hint?: string;
  input?: string;
  image?: LessonImage;
  safety?: string;
  sources?: { title: string; url: string }[];
}
export interface CourseLearningPack {
  title: string;
  version: string;
  mode: 'GUIDED' | 'PYTHON' | 'MACHINE_LEARNING' | 'ROBOTICS';
  lessons: RichSkillLesson[];
}
