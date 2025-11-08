export type Referent = {
  _type: string;
  annotator_id: number;
  annotator_login: string;
  api_path: string;
  classification: string;
  fragment: string;
  id: number;
  is_description: boolean;
  path: string;
  range: Range;
  song_id: number;
  url: string;
  verified_annotator_ids: number[]; // API shows numbers
  annotatable: Annotatable;
  annotations: Annotation[];
};

/* Helpers */

export type Range = {
  content: string;
};

export type Annotatable = {
  api_path: string;
  client_timestamps?: ClientTimestamps;
  context?: string;
  id: number;
  image_url?: string;
  link_title?: string;
  title?: string;
  type?: string;
  url?: string;
};

export type ClientTimestamps = {
  updated_by_human_at?: number;
  lyrics_updated_at?: number;
};

/* Annotation related types */

export type Annotation = {
  api_path: string;
  body: AnnotationBody;
  comment_count: number;
  community: boolean;
  custom_preview: string | null;
  has_voters: boolean;
  id: number;
  pinned: boolean;
  share_url?: string;
  source: string | null;
  state: string;
  url: string;
  verified: boolean;
  votes_total: number;
  current_user_metadata: AnnotationCurrentUserMetadata;
  authors: Author[];
  cosigned_by: User[]; // cosigners represented as Users (empty in sample)
  rejection_comment: string | null;
  verified_by: User | null;
};

export type AnnotationBody = {
  dom: DomNode;
};

export type DomNode = {
  tag: string;
  children?: Array<DomNode | string>;
  attributes?: Record<string, string | number | boolean>;
  data?: Record<string, unknown>;
};

/* Author / User */

export type Author = {
  attribution: number;
  pinned_role: string | null;
  user: User;
};

export type User = {
  api_path?: string;
  avatar?: AvatarImages;
  header_image_url?: string | null;
  human_readable_role_for_display?: string | null;
  id: number;
  iq?: number;
  login?: string;
  name?: string;
  role_for_display?: string | null;
  url?: string;
  current_user_metadata?: UserCurrentUserMetadata;
};

export type AvatarImages = {
  tiny?: AvatarImage;
  thumb?: AvatarImage;
  small?: AvatarImage;
  medium?: AvatarImage;
};

export type AvatarImage = {
  url: string;
  bounding_box?: BoundingBox;
};

export type BoundingBox = {
  width: number;
  height: number;
};

export type UserCurrentUserMetadata = {
  permissions: string[];
  excluded_permissions: string[];
  interactions: {
    following?: boolean;
    [key: string]: unknown;
  };
};

export type AnnotationCurrentUserMetadata = {
  permissions: string[];
  excluded_permissions: string[];
  interactions: {
    cosign?: boolean | null;
    pyong?: boolean | null;
    vote?: boolean | null;
    [key: string]: unknown;
  };
  iq_by_action: Record<string, unknown>;
};
