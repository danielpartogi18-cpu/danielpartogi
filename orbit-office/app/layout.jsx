import "./globals.css";

export const metadata = {
  title: "Orbit Office — Your AI Workspace",
  description: "A personal AI virtual office for tasks, planning, notes, and everyday problem-solving."
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
