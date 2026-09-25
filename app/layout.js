import './globals.css';
import Chatbot from './chatbot';

export const metadata = {
  title: 'BookMatcher AI — Next.js Study Page & Line Pinpointer',
  description: 'Match classroom lecture notes and slides to exact textbook pages and line numbers in ~1,000-page books.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="h-full flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-800">
        {children}
      <Chatbot /> 
      </body>
    </html>
  );
}
