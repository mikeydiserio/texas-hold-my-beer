'use client';
import {useEffect,useRef,type ReactNode} from 'react';
import styled from 'styled-components';
import {XIcon} from '@phosphor-icons/react';
import {IconButton} from './primitives';
const Dialog=styled.dialog`
  border:3px solid #111114;border-radius:0;background:#f3edda;color:#171619;padding:30px;width:min(580px,calc(100vw - 28px));max-height:calc(100dvh - 40px);box-shadow:10px 10px 0 #e83235,0 30px 120px #000a;
  &::backdrop{background:#050b08a8;backdrop-filter:blur(5px)}
  header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:23px}h2{font-family:var(--font-display),Impact,sans-serif;font-weight:400;font-size:38px;text-transform:uppercase;margin:6px 0 8px}p{font-size:13px;line-height:1.65;color:#514b48;margin:0}form{display:grid;gap:21px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}.settings-row{display:flex;align-items:center;justify-content:space-between;padding:13px 0;border-bottom:1px solid #ffffff0c;gap:16px}.settings-row small{display:block;color:#514b48;font-size:11px;margin-top:5px}input[type=checkbox]{width:18px;height:18px;flex-shrink:0}ol{padding-left:22px;color:#514b48;line-height:1.8}li{margin-bottom:10px}.modal-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:14px}.modal-footer p{font-size:11px}.error{color:#b4202c}.preset-row{display:flex;gap:6px;flex-wrap:wrap}.help-key{padding:3px 7px;background:#14141412;border:1px solid #ffffff1a;border-radius:4px;color:#171619}.rules{margin:16px 0;border-top:1px solid #ffffff12;padding-top:16px}@media(max-width:600px){padding:22px;h2{font-size:28px}}
`;
export function Modal({title,subtitle,children,onClose}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <Dialog ref={ref} aria-labelledby="dialog-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><header><div><span style={{color:'#bc202e',fontSize:10,letterSpacing:2}}>MIKEYS POKER CLUB</span><h2 id="dialog-title">{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><IconButton onClick={onClose} aria-label="Close dialog"><XIcon/></IconButton></header>{children}</Dialog>;
}
