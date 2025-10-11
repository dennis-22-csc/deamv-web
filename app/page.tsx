import type { Metadata } from 'next';
import Home from './home';

export const metadata: Metadata = {
  // Primary Tags (Standard SEO & OG Base)
  title: 'DeamV Home',
  description: 'Supercharging digital learning.',
  
  // 2. Open Graph Tags (for Facebook, LinkedIn, etc.)
  openGraph: {
    title: 'DeamV Home',
    description: 'Supercharging digital learning.',
    url: 'https://deamv.thekingstutor.com',
    siteName: 'DeamV',
    images: [
      {
        url: 'https://deamv.thekingstutor.com/logo.png', 
        width: 1200,
        height: 630,
        alt: 'DeamV OG Image',
      },
      // You can add more image objects here if needed
    ],
    locale: 'en_UK',
    type: 'website', 
  },

  // 3. Twitter Card Tags (specifically for X/Twitter)
  twitter: {
    card: 'summary_large_image', // Options: summary, summary_large_image, app, player
    title: 'DeamV Home',
    description: 'Supercharging digital learning.',
    site: '@YourTwitterHandle',
    creator: '@YourTwitterHandle',
    images: ['https://deamv.thekingstutor.com/logo.png'], 
  },
};

export default function HomePage() {
  return <Home />;
} 
