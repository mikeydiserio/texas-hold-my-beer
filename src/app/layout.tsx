import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import '../ui/table.css';
import '../ui/club/club.css';
import '../ui/club/roulette.css';
import '../ui/wild-hand.css';
import StyledRegistry from './registry';
const displayFont=localFont({src:'../../public/fonts/Anton-Regular.ttf',variable:'--font-display',display:'swap'});
const bodyFont=localFont({src:[{path:'../../public/fonts/Barlow-Regular.ttf',weight:'400'},{path:'../../public/fonts/Barlow-SemiBold.ttf',weight:'600'}],variable:'--font-body',display:'swap'});
export const metadata:Metadata={
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'),
  title:'MIKEYS POKER CLUB',
  description:'Texas Hold’em, blackjack, solitaire, and roulette. Play chips only.',
  openGraph:{title:'MIKEYS POKER CLUB',description:'Texas Hold’em, blackjack, solitaire, and roulette.',images:[{url:'/wild-hand-posters.png',width:1774,height:887}]},
  twitter:{card:'summary_large_image',title:'MIKEYS POKER CLUB',description:'Texas Hold’em, blackjack, solitaire, and roulette. Play chips only.',images:['/wild-hand-posters.png']}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}><body><StyledRegistry>{children}</StyledRegistry></body></html>;}
