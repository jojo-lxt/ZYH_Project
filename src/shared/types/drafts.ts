export type DraftImage = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  selected: boolean;
  score: number;
};

export type XhsDraft = {
  id: string;
  createdAt: string;
  tags: string[];
  caption: string;
  topics: string;
  images: DraftImage[];
  selectedImages: DraftImage[];
};
