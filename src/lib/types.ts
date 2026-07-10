export interface PostFrontmatter {
  title: string;
  slug: string;
  date: string;
  updated?: string;
  tags: string[];
  excerpt: string;
  published: boolean;
  coverImage?: string;
}

export interface Post extends PostFrontmatter {
  content: string;
}

export interface PostInput {
  title: string;
  slug: string;
  date: string;
  updated?: string;
  tags: string[];
  excerpt?: string;
  published: boolean;
  coverImage?: string;
  content: string;
}
