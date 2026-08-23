import { stitchImages } from "@/data/assets";

export type HistoryCategory = "remove-text" | "image-to-text" | "collage" | "snapy";

export type HistoryItem = {
  id: string;
  name: string;
  date: string;
  category: HistoryCategory;
  thumbnail: string;
  description: string;
};

export const MOCK_HISTORY: HistoryItem[] = [
  {
    id: "hist-1",
    name: "Product_Shot_Final.jpg",
    date: "Oct 24, 2023",
    category: "remove-text",
    thumbnail: stitchImages.productShot,
    description: "Removed text watermark",
  },
  {
    id: "hist-2",
    name: "Contract_Scan_01.png",
    date: "Oct 23, 2023",
    category: "image-to-text",
    thumbnail: stitchImages.contractScan,
    description: "Extracted 243 words",
  },
  {
    id: "hist-3",
    name: "Arch_Moodboard.jpg",
    date: "Oct 21, 2023",
    category: "collage",
    thumbnail: stitchImages.archMoodboard,
    description: "Generated 3x3 layout",
  },
  {
    id: "hist-4",
    name: "Street_View_Clean.png",
    date: "Oct 19, 2023",
    category: "remove-text",
    thumbnail: stitchImages.streetView,
    description: "Removed overlay text",
  },
];

export const MOCK_ACTIVITY = [
  {
    id: "act-1",
    name: "product_shot_final.jpg",
    description: "Removed text watermark",
    time: "2 mins ago",
    category: "remove-text" as const,
    icon: "ink_eraser",
  },
  {
    id: "act-2",
    name: "invoice_scan_04.png",
    description: "Extracted 243 words",
    time: "1 hour ago",
    category: "image-to-text" as const,
    icon: "article",
  },
  {
    id: "act-3",
    name: "social_campaign_grid",
    description: "Generated 3x3 layout",
    time: "Yesterday",
    category: "collage" as const,
    icon: "dashboard_customize",
  },
];
