import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/convex-client-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "MLH Code Inspector",
	description: "AI-powered code review application",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={inter.variable}>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ConvexClientProvider>{children}</ConvexClientProvider>
			</body>
		</html>
	);
}
