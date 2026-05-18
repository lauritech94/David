export interface DAMAsset {
  id: string;
  release_id: string;
  type: string;
  title: string;
  file_url: string;
  file_bucket: string;
  thumbnail_url: string | null;
  tags: string[] | null;
  category: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  // DAM fields
  section: string | null;
  sub_type: string | null;
  status: string | null;
  platform_tags: string[] | null;
  assigned_to: string | null;
  delivery_date: string | null;
  external_url: string | null;
  format_spec: string | null;
  resolution: string | null;
  is_watermarked: boolean | null;
  session_id: string | null;
  stage: string | null;
  supplier_contact_id: string | null;
  version_group: string | null;
  sort_order: number | null;
  track_id: string | null;
}

export interface PhotoSession {
  id: string;
  release_id: string;
  name: string;
  description: string | null;
  photographer: string | null;
  session_date: string | null;
  status: string | null;
  created_by: string;
  created_at: string;
}

export interface AssetComment {
  id: string;
  asset_id: string;
  author_id: string;
  message: string;
  created_at: string;
  author_name?: string;
}
