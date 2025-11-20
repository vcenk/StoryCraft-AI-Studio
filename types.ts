export enum AppView {
  DASHBOARD = 'DASHBOARD',
  STORY_EDITOR = 'STORY_EDITOR',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  BLOG_CREATOR = 'BLOG_CREATOR'
}

export type NodeType = 'chapter' | 'story' | 'image' | 'audit' | 'export' | 'cover';

export interface AuditResult {
  score: number;
  status: 'pass' | 'warning' | 'fail';
  repetitions: string[];
  consistency: string[];
  suggestions: string[];
}

export interface CoverData {
  titles: string[];
  subtitle: string;
  tagline: string;
  backCoverBlurb: string;
  frontCoverImagePrompt: string;
  backCoverImagePrompt: string;
  selectedTitle?: string;
  frontCoverImageBase64?: string;
  backCoverImageBase64?: string;
}

export interface NodeData {
  label?: string;
  prompt?: string;
  content?: string;
  imageBase64?: string;
  auditResult?: AuditResult;
  coverData?: CoverData;
  status?: 'idle' | 'loading' | 'success' | 'error';
  chapterId?: string;
  targetAge?: string;
  tone?: string;
}

export interface StoryNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  data: NodeData;
}

export interface GeneratedImage {
  id: string;
  base64: string;
  prompt: string;
  timestamp: number;
  isEdited: boolean;
}

export interface GeminiConfig {
  temperature: number;
  topK: number;
  topP: number;
}