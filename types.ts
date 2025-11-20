
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  STORY_EDITOR = 'STORY_EDITOR',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  BLOG_CREATOR = 'BLOG_CREATOR'
}

export type NodeType = 'chapter' | 'story' | 'image' | 'audit' | 'export' | 'cover' | 'note';

export interface NodeConnection {
  id: string;
  source: string;
  target: string;
}

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

export interface OutlineScene {
  label: string;
  prompt: string;
}

export interface OutlineChapter {
  title: string;
  scenes: OutlineScene[];
}

export interface BookLayout {
  presetId: string;
  label: string;
  description: string;
  width: number; // inches
  height: number; // inches
  pageType: 'kids_picture_book' | 'novel' | 'guide';
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
  tone?: string; // Specific for Story Node context
  chapterTone?: 'Adventurous' | 'Funny' | 'Scary' | 'Educational' | 'Whimsical'; // Specific for Chapter Node
  imageStyle?: 'Digital Art' | 'Watercolor' | 'Cartoon' | 'Sketch';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  exportFormat?: 'html' | 'pdf' | 'epub';
  // bookDimensions is now deprecated in favor of global project layout, 
  // but kept optional for backward compatibility or node-specific overrides if needed
  bookDimensions?: string; 
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
