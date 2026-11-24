import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
 title:'Voxel Atlas — Research & Learning Studio',
 description:'Explore MRI, try model synthesis with demo credits, configure federated learning, and follow collaborative research.',
 icons:{icon:'/assets/favicon.svg',apple:'/assets/app-icon-192.png'},
 manifest:'/manifest.webmanifest',
 appleWebApp:{capable:true,title:'Voxel Atlas',statusBarStyle:'black-translucent'},
};
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#0b1017'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>){return <html lang="en"><head><link rel="stylesheet" href="/platform.css" /><link rel="stylesheet" href="/journey.css" /><link rel="stylesheet" href="/games.css" /><link rel="stylesheet" href="/orders.css" /><link rel="stylesheet" href="/central-chat.css" /></head><body>{children}</body></html>;}
