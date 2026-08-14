import { clsx, type ClassValue } from "clsx";

/**
 * Small className-join helper used by every UI component to merge Tailwind
 * classes with conditional variants.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
