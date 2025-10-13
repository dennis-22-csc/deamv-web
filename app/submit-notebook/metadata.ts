import { Metadata } from 'next';

const title = 'SFAI DV Colab Notebook Submission';
const description = 'Submit your completed Data Science & Visualization Colab notebook here.';
const url = 'https://deamv.thekingstutor.com'

export const metadata: Metadata = {
  // --- Standard SEO Tags ---
  title: title,
  description: description,

  // --- Open Graph (OG) Tags (for social media sharing) ---
  openGraph: {
    title: title,
    description: description,
    url: url,
    siteName: 'DeamV', 
    type: 'website',
    images: [
      {
        url: `${url}/logo.png`, 
        width: 1200,
        height: 630,
        alt: 'SFAI Notebook Submission',
      },
    ],
  },

  // --- Twitter Card Tags (for Twitter sharing) ---
  twitter: {
    card: 'summary_large_image',
    title: title,
    description: description,
    images: [`${url}/logo.png`],
  },

  // --- Canonical Tag (optional but recommended) ---
  alternates: {
    canonical: url,
  },
};
