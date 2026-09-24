import type { Metadata } from 'next';
import './globals.css';
import '../ui/table.css';
import StyledRegistry from './registry';
export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'),title:'After Hours — The Green Room',description:'A quiet table. A good hand. Play 3D no-limit Texas Hold’em against six distinct AI personalities. Play chips only.',openGraph:{title:'After Hours — The Green Room',description:'Your seat at the table. A complete 3D Texas Hold’em experience.',images:[{url:'/og.png',width:1536,height:1024}]},twitter:{card:'summary_large_image',title:'After Hours — The Green Room',description:'Your seat at the table. Play chips only.',images:['/og.png']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><StyledRegistry>{children}</StyledRegistry></body></html>;}
