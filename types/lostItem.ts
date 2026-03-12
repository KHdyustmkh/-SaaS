import type { LostItemStatus } from "@/lib/dates";

export interface LostItem {
  id: string;
  management_number: string;
  status: LostItemStatus;
  found_at: string; // ISO string
  location: string;
  name: string;
  description: string;
  face_photo_url: string | null;
  photo_url: string | null;
}

