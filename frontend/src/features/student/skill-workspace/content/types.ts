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
  label?: string;
  width?: number;
  height?: number;
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
  images?: LessonImage[];
  firstAid?: FirstAidGuide;
  safety?: string;
  sources?: { title: string; url: string }[];
}
export interface CourseLearningPack {
  title: string;
  version: string;
  mode: 'GUIDED' | 'PYTHON' | 'MACHINE_LEARNING' | 'ROBOTICS';
  lessons: RichSkillLesson[];
}

export interface FirstAidScenario extends KnowledgeCheck {
  id: string;
  title: string;
  situation: string;
}
export interface FirstAidGuide {
  summary: string;
  recognise: string[];
  actions: { title: string; text: string; why: string }[];
  avoid: string[];
  urgent: string[];
  remember: string;
  scenarios: FirstAidScenario[];
}
