/**
 * TypeScript interfaces matching the JSON data schemas.
 * These types mirror the structure defined in docs/PLAN_MVP.md Phase 2.
 */

// ============================================================================
// Photo & Album Types
// ============================================================================

export interface Photo {
  id: string;
  filename_original: string;
  url_original: string;
  url_display: string;
  url_thumbnail: string;
  caption?: string;
  alt_text?: string;
  order: number;
  width: number;
  height: number;
  file_size_original: number;
  file_size_display: number;
  file_size_thumbnail: number;
  exif?: ExifData;
  uploaded_at: string;
}

export interface ExifData {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutter_speed?: string;
  focal_length?: string;
  date_taken?: string;
}

export type AlbumVisibility = 'public' | 'unlisted' | 'password_protected';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Album {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  cover_photo_id?: string;
  visibility: AlbumVisibility;
  password_hash?: string;
  expiration_date?: string;
  allow_downloads: boolean;
  show_exif: boolean;
  order: number;
  theme_override?: ThemeMode;
  created_at: string;
  updated_at: string;
  date_of_album_start?: string;
  date_of_album_end?: string;
  photos: Photo[];
}

export interface AlbumsData {
  version: string;
  last_updated: string;
  albums: Album[];
}

// ============================================================================
// Site Configuration Types
// ============================================================================

export interface SiteInfo {
  title: string;
  tagline?: string;
  description?: string;
  language: string;
  timezone: string;
}

export interface OwnerInfo {
  name?: string;
  bio?: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface CustomLink {
  label: string;
  url: string;
  order?: number;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  threads?: string;
  linkedin?: string;
  youtube?: string;
  vimeo?: string;
  pinterest?: string;
  tiktok?: string;
  behance?: string;
  custom_links?: CustomLink[];
}

export interface ThemeColorSet {
  background: string;
  surface: string;
  text_primary: string;
  text_secondary: string;
  border: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  light: ThemeColorSet;
  dark: ThemeColorSet;
}

export interface BrandingConfig {
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading?: string;
  font_body?: string;
  custom_css_url?: string;
  theme: ThemeConfig;
}

export interface PortfolioConfig {
  main_album_id?: string;
  show_exif_data: boolean;
  default_photo_layout?: string;
  enable_lightbox: boolean;
  show_photo_count?: boolean;
}

export interface NavigationConfig {
  show_home: boolean;
  show_albums: boolean;
  show_blog?: boolean;
  custom_links?: CustomLink[];
}

export interface SiteConfig {
  version: string;
  last_updated: string;
  site: SiteInfo;
  owner: OwnerInfo;
  social: SocialLinks;
  branding: BrandingConfig;
  portfolio: PortfolioConfig;
  navigation: NavigationConfig;
  storage: StorageConfig;
}

export interface StorageConfig {
  max_disk_usage_percent: number;
  max_image_size_mb: number;
}
