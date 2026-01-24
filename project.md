# Project: StoryArchitect AI (Node-Based Book Creator)

## 1. Executive Summary
**Mission:** To build a SaaS platform that transforms book writing from a linear text process into a non-linear, visual architectural process.
**Core Concept:** "Structure First, Prose Second." Users design the narrative flow using a node-based canvas. Multi-agent AI systems populate these nodes with text and images, ensuring consistency and preventing hallucinations.
**Output:** High-quality, print-ready PDFs for various formats (Kids' books, Novels, Graphic Novels).

---

## 2. Tech Stack

### Frontend (The Studio)
* **Framework:** Next.js 14+ (App Router, TypeScript).
* **Canvas Engine:** React Flow (xyflow) - *Critical for node management.*
* **State Management:** Zustand (handling complex object states like story graph).
* **Styling:** Tailwind CSS.
* **UI Components:** Shadcn/UI (Radix Primitives) + Framer Motion (animations).
* **PDF Generation:** `@react-pdf/renderer` (Client-side preview & export).

### Backend & AI (The Brain)
* **API Layer:** Python FastAPI (Preferred for Agent logic) or Next.js Server Actions.
* **Orchestration:** LangChain / LangGraph (to manage multi-agent loops).
* **LLM Provider:** OpenAI API (GPT-4o for drafting and logic).
* **Image Gen:** Fal.ai API (Flux Pro or SDXL for consistent character illustrations).

### Database (The Memory)
* **Provider:** Supabase (PostgreSQL).
* **Features:** Relational tables for Book/Nodes; Vector store (`pgvector`) for storing story context to prevent "amnesia."

---

## 3. Product Requirements & Features

### Phase 1: Onboarding (The Book DNA)
Before the canvas loads, users must configure the "World Rules."
* **Template Engine:**
    * *Board Book:* Low word count, high image ratio, square aspect ratio.
    * *Novel:* High word count, no images, standard A5/6x9 ratio.
    * *Graphic Novel:* Panel-based layout prompts.
* **Audience Profiling:** Age slider (adjusts vocabulary complexity).
* **Style Definitions:** Visual style (e.g., "Watercolor", "Pixar") and Narrative tone.

### Phase 2: The Node Canvas
* **Node Types:**
    * `ChapterNode`: Container for Scene nodes.
    * `SceneNode`: The atomic unit of the story. Contains text and image prompts.
    * `CharacterNode`: Global reference nodes containing bio and visual seed.
* **Smart Connections:**
    * Drag-and-drop linking.
    * Logic/Context passing (e.g., if Node A is "Day", Node B is "Night", the edge carries this context).
* **Visual Status:** Nodes change color based on state (Planned → Drafting → Reviewing → Final).

### Phase 3: Multi-Agent Architecture
1.  **Agent A (The Drafter):** Generates content based on Node Prompt + Book DNA + Previous Node Summary.
2.  **Agent B (The Controller):** The "Editor." Reads the draft and checks against global context (e.g., "Did the character's name change?").
3.  **Agent C (The Illustrator):** Uses Fal.ai. Injects character descriptions from `CharacterNode` into the prompt to ensure face consistency.

### Phase 4: Preview & Export
* **Split-Screen View:** Top half shows the rendered book page (flipbook style); Bottom half shows the Node Canvas.
* **PDF Compiler:** Flattens the node graph into a linear sequence and generates a PDF.

---

## 4. Design System (UI/UX)

**Theme:** "Ethereal Light" - Focus on clarity and reduced cognitive load.

### Color Palette
* **Background:** `#F9FAFB` (Gray-50) with dot pattern.
* **Canvas Surface:** Infinite white space.
* **Primary Brand:** `#6366F1` (Indigo-500).
* **Action/AI Trigger:** `#F43F5E` (Rose-500).
* **Text:** `#1E293B` (Slate-800) for UI; `#000000` for Book Preview.

### Typography
* **Interface:** *Inter* or *Geist Sans*.
* **Book Body:** *Merriweather* or *Libre Baskerville*.

### Smart Components
* **The Living Node:** Expands on hover. Shows a "Pulse" animation when AI is generating.
* **Context Menu:** Right-click on canvas to "Summon Character" or "Add Plot Twist."
* **Hallucination Alert:** A toast notification or inline warning when Agent B detects a plot hole.

---

## 5. Database Schema (Supabase/PostgreSQL)

```sql
-- 1. Books Table
create table books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users,
  title text,
  settings jsonb, -- Stores "Book DNA" (Age, Style, Format)
  created_at timestamp with time zone default now()
);

-- 2. Nodes Table (The Story Graph)
create table nodes (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references books,
  type text, -- 'scene', 'chapter', 'character'
  position_x float,
  position_y float,
  content text, -- The AI generated text
  user_prompt text, -- The user's instruction
  image_url text, -- Fal.ai output
  status text, -- 'draft', 'generating', 'approved'
  meta_data jsonb -- Stores specific settings like 'time of day'
);

-- 3. Edges Table (Connections)
create table edges (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references books,
  source_node_id uuid references nodes,
  target_node_id uuid references nodes,
  label text -- Context passed between nodes (e.g., "Next Morning")
);

-- 4. Characters Table
create table characters (
  id uuid primary key default uuid_generate_v4(),
  book_id uuid references books,
  name text,
  description text,
  visual_seed text, -- For Fal.ai consistency
  avatar_url text
);
```
