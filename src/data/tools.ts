export type ToolDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  /** When true, tool UI is ready but backend/n8n is not connected yet. */
  comingSoon?: boolean;
};

export type ToolCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
  hubRoute: string;
  tools: ToolDef[];
};

export const IMAGE_AI_TOOLS: ToolDef[] = [
  {
    id: "remove-text",
    name: "Remove Text",
    description: "Remove unwanted text and watermarks from images while preserving the background.",
    icon: "ink_eraser",
    route: "/remove-text",
  },
  {
    id: "image-to-text",
    name: "Image to Text",
    description: "Extract editable text from screenshots, documents, and photos with OCR.",
    icon: "article",
    route: "/image-to-text",
  },
  {
    id: "background-remover",
    name: "Background Remover",
    description: "Remove image backgrounds automatically with AI and download a transparent PNG.",
    icon: "wallpaper",
    route: "/image-ai/background-remover",
    comingSoon: true,
  },
  {
    id: "image-analyzer",
    name: "Image Analyzer",
    description: "Understand your images with AI-powered visual analysis, objects, and tags.",
    icon: "visibility",
    route: "/image-ai/image-analyzer",
    comingSoon: true,
  },
  {
    id: "image-enhancer",
    name: "Image Enhancer",
    description: "Improve image clarity, sharpness, and overall quality in one pass.",
    icon: "auto_fix_high",
    route: "/image-ai/image-enhancer",
    comingSoon: true,
  },
  {
    id: "caption-generator",
    name: "Caption Generator",
    description: "Generate platform-ready captions and hashtags from your images.",
    icon: "chat",
    route: "/image-ai/caption-generator",
    comingSoon: true,
  },
  {
    id: "alt-text-generator",
    name: "Alt Text Generator",
    description: "Create accessible alt text for images in English or Hindi.",
    icon: "closed_caption",
    route: "/image-ai/alt-text-generator",
    comingSoon: true,
  },
];

export const PDF_TOOLS: ToolDef[] = [
  {
    id: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF documents into fully editable Word files.",
    icon: "description",
    route: "/pdf-to-word",
  },
  {
    id: "pdf-to-pptx",
    name: "PDF to PPTX",
    description: "Transform PDF documents into editable PowerPoint presentations.",
    icon: "slideshow",
    route: "/pdf-to-pptx",
  },
  {
    id: "pdf-merger",
    name: "PDF Merger",
    description: "Combine multiple PDF documents into a single organized file.",
    icon: "call_merge",
    route: "/pdf-merger",
  },
  {
    id: "pdf-summarizer",
    name: "PDF Summarizer",
    description: "Generate concise AI-powered summaries from your PDF documents.",
    icon: "summarize",
    route: "/pdf-operations/summarizer",
    comingSoon: true,
  },
  {
    id: "pdf-qa",
    name: "PDF Q&A",
    description: "Ask questions and get answers directly from your PDF.",
    icon: "quiz",
    route: "/pdf-operations/qa",
    comingSoon: true,
  },
  {
    id: "pdf-study-notes",
    name: "PDF Study Notes",
    description: "Turn lengthy PDFs into structured study notes and key points.",
    icon: "menu_book",
    route: "/pdf-operations/study-notes",
    comingSoon: true,
  },
  {
    id: "invoice-extractor",
    name: "Invoice Extractor",
    description: "Extract structured invoice information automatically using AI.",
    icon: "receipt_long",
    route: "/pdf-operations/invoice-extractor",
    comingSoon: true,
  },
  {
    id: "pdf-manage",
    name: "Compress & Split",
    description: "Compress, split and manage PDF documents with powerful tools.",
    icon: "tune",
    route: "/pdf-operations/manage",
    comingSoon: true,
  },
];

export const CREATIVE_AI_TOOLS: ToolDef[] = [
  {
    id: "collage-maker",
    name: "Collage Maker",
    description: "Create professional photo collages with smart layouts.",
    icon: "dashboard_customize",
    route: "/collage-maker",
  },
  {
    id: "poster-generator",
    name: "Poster Generator",
    description: "Generate creative poster designs from simple prompts.",
    icon: "newspaper",
    route: "/creative-ai/poster-generator",
    comingSoon: true,
  },
  {
    id: "thumbnail-generator",
    name: "Thumbnail Generator",
    description: "Create engaging thumbnails for videos and social content.",
    icon: "image",
    route: "/creative-ai/thumbnail-generator",
    comingSoon: true,
  },
  {
    id: "social-post-generator",
    name: "Social Post Generator",
    description: "Generate social media posts, captions, and hashtags with AI.",
    icon: "share",
    route: "/creative-ai/social-post-generator",
    comingSoon: true,
  },
];

export const PRODUCTIVITY_TOOLS: ToolDef[] = [
  {
    id: "resume-analyzer",
    name: "Resume Analyzer",
    description: "Analyze resumes, identify skills, and get actionable improvement suggestions.",
    icon: "work",
    route: "/ai-productivity/resume-analyzer",
    comingSoon: true,
  },
  {
    id: "speech-to-text",
    name: "Speech → Text",
    description: "Convert audio recordings into accurate editable text.",
    icon: "mic",
    route: "/ai-productivity/speech-to-text",
    comingSoon: true,
  },
  {
    id: "translator",
    name: "Translator",
    description: "Translate text and documents into multiple languages.",
    icon: "translate",
    route: "/ai-productivity/translator",
    comingSoon: true,
  },
  {
    id: "text-rewriter",
    name: "Text Rewriter",
    description: "Rewrite text in professional, simple, formal, or creative styles.",
    icon: "edit_note",
    route: "/ai-productivity/text-rewriter",
    comingSoon: true,
  },
];

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: "image-ai",
    name: "Image AI",
    description: "Powerful AI tools to analyze, enhance and transform your images.",
    icon: "photo_library",
    hubRoute: "/image-ai",
    tools: IMAGE_AI_TOOLS,
  },
  {
    id: "pdf-documents",
    name: "PDF & Documents",
    description: "Powerful AI-powered tools for working with PDF documents.",
    icon: "picture_as_pdf",
    hubRoute: "/pdf-operations",
    tools: PDF_TOOLS,
  },
  {
    id: "creative-ai",
    name: "Creative AI",
    description: "Create engaging visual content and social media assets with AI.",
    icon: "palette",
    hubRoute: "/creative-ai",
    tools: CREATIVE_AI_TOOLS,
  },
  {
    id: "ai-productivity",
    name: "AI Productivity",
    description: "Speed up everyday writing, translation, and document workflows.",
    icon: "bolt",
    hubRoute: "/ai-productivity",
    tools: PRODUCTIVITY_TOOLS,
  },
];

export function findToolByRoute(pathname: string): ToolDef | undefined {
  return TOOL_CATEGORIES.flatMap((c) => c.tools).find(
    (t) => t.route === pathname || pathname.startsWith(`${t.route}/`),
  );
}

export function findCategoryForPath(pathname: string): ToolCategory | undefined {
  return TOOL_CATEGORIES.find(
    (c) =>
      pathname === c.hubRoute ||
      pathname.startsWith(`${c.hubRoute}/`) ||
      c.tools.some((t) => pathname === t.route || pathname.startsWith(`${t.route}/`)),
  );
}

/** Paths that use the authenticated app shell (exact or prefix). */
export const APP_SHELL_PREFIXES = [
  "/dashboard",
  "/history",
  "/settings",
  "/remove-text",
  "/image-to-text",
  "/collage-maker",
  "/pdf-to-word",
  "/pdf-to-pptx",
  "/pdf-merger",
  "/pdf-operations",
  "/image-ai",
  "/creative-ai",
  "/ai-productivity",
] as const;

export function isAppShellPath(pathname: string): boolean {
  return APP_SHELL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
