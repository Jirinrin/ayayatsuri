import { IPicture } from "music-metadata";

const metadataFilters = [
  'musicFiles', // Only use music files, exposing metadata of the files
  'imageFiles', // Only use image files, exposing exif metadata of the files
  'videoFiles', // Only use image files, exposing exif metadata of the files
] as const;
type MetadataFilter = typeof metadataFilters[number];
export type IMetadataFilterOpts = Partial<Record<MetadataFilter, boolean>>;
export const metadataFiltersOpts = metadataFilters.map(f => `--${f}`).join(', ');

export interface ITrackInfo {
  title: string;
  trackNo?: number;
  artist?: string;
  // Not necessary for filename
  albumArtist?: string;
  album?: string;
  date?: string;
  picture?: IPicture[];
}
