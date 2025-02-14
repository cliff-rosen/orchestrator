import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts variable names from template text by looking for text between double curly braces.
 * For example, "Hello {{name}}, how are you {{time}}?" returns ["name", "time"]
 */
export const extractTokens = (template: string): string[] => {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const matches = template.match(tokenRegex);
  if (!matches) return [];

  // Remove the curly braces and return unique tokens
  return [...new Set(matches.map(match => match.slice(2, -2).trim()))];
}; 