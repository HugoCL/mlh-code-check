import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function parseOptionList(input: string): string[] {
	const entries = input
		.split(/\r?\n/)
		.flatMap((line) => line.split(","))
		.map((value) => value.trim())
		.filter(Boolean);

	const seen = new Set<string>();
	const options: string[] = [];

	for (const entry of entries) {
		const key = entry.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			options.push(entry);
		}
	}

	return options;
}

export function formatOptionList(options?: string[]): string {
	if (!options || options.length === 0) {
		return "";
	}

	return options.join("\n");
}
