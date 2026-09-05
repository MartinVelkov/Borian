import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CategoryGender =
  | "OPEN"
  | "MALE"
  | "FEMALE"
  | "MIXED";

export type Category = {
  id: string;
  tournamentId: string;
  name: string;
  description: string;
  gender: CategoryGender;
  minAge: number | null;
  maxAge: number | null;
  createdAt?: unknown;
};