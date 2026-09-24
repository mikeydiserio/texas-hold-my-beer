'use client';
import styled from 'styled-components';
export const Button=styled.button<{$primary?:boolean;$danger?:boolean;$small?:boolean}>`
  display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid ${p=>p.$primary?'#d9b77c':p.$danger?'#7c4b43':'#ffffff1c'};
  background:${p=>p.$primary?'#d9b77c':p.$danger?'#4a2d29':'#ffffff05'};color:${p=>p.$primary?'#1d271d':'#e4e8df'};
  min-height:${p=>p.$small?'34px':'44px'};padding:${p=>p.$small?'7px 12px':'11px 19px'};border-radius:7px;font-size:${p=>p.$small?'12px':'13px'};font-weight:600;white-space:nowrap;transition:background .18s,transform .18s,border-color .18s;
  &:hover:not(:disabled){background:${p=>p.$primary?'#eccb91':'#ffffff10'};border-color:${p=>p.$primary?'#eccb91':'#ffffff40'};transform:translateY(-1px)}
  &:disabled{opacity:.32;transform:none}svg{flex-shrink:0}
`;
export const IconButton=styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid ${p=>p.$active?'#d9b77c55':'#ffffff12'};border-radius:8px;background:${p=>p.$active?'#d9b77c16':'transparent'};color:${p=>p.$active?'#d9b77c':'#a1afa5'};transition:.2s;
  &:hover{color:#edece3;background:#ffffff0b}svg{width:19px;height:19px}
`;
export const Field=styled.label`
  display:flex;flex-direction:column;gap:9px;color:#bec8be;font-size:12px;font-weight:500;
  input,select{width:100%;min-height:43px;border:1px solid #ffffff20;border-radius:6px;background:#0f1713;color:#eeeee4;padding:10px 12px;outline-offset:2px}
`;
export const Eyebrow=styled.span`font-size:10px;letter-spacing:1.9px;text-transform:uppercase;color:#91a195;font-weight:600;`;
