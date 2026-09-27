'use client';
import styled from 'styled-components';
// Screen-print controls: flat ink/paper/red faces, an ink keyline, and a hard offset shadow the button
// presses into. --drop is the shadow colour; dialogs (paper backgrounds) swap it to ink via wild-hand.css.
export const Button=styled.button<{$primary?:boolean;$danger?:boolean;$small?:boolean}>`
  --face:${p=>p.$primary||p.$danger?'var(--red)':'var(--paper)'};--label:${p=>p.$primary||p.$danger?'var(--paper)':'var(--ink)'};
  --drop:${p=>p.$primary||p.$danger?'var(--paper)':'var(--red)'};
  display:inline-flex;align-items:center;justify-content:center;gap:9px;
  border:2px solid var(--ink);background:var(--face);color:var(--label);
  min-height:${p=>p.$small?'35px':'46px'};padding:${p=>p.$small?'6px 12px 5px':'10px 20px 9px'};
  border-radius:0;font-family:var(--font-display),Impact,sans-serif;font-weight:400;text-transform:uppercase;
  font-size:${p=>p.$small?'14px':'18px'};letter-spacing:.5px;line-height:1;white-space:nowrap;
  box-shadow:0 0 0 1px var(--ink),4px 4px 0 1px var(--drop);transition:transform .15s cubic-bezier(.2,1.5,.4,1),box-shadow .15s,background .15s;
  &:hover:not(:disabled){transform:translate(-1px,-2px) rotate(-1.2deg);box-shadow:0 0 0 1px var(--ink),6px 6px 0 1px var(--drop)}
  &:active:not(:disabled){transform:translate(3px,3px) rotate(0);box-shadow:0 0 0 1px var(--ink),0 0 0 1px var(--drop)}
  &:focus-visible{outline:3px solid var(--drop);outline-offset:5px}
  &:disabled{opacity:.35;box-shadow:0 0 0 1px var(--ink);transform:none;cursor:not-allowed}svg{flex-shrink:0}
  kbd{font:600 10px/1 var(--font-body),Arial,sans-serif;border:1.5px solid currentColor;padding:3px 5px 2px;border-radius:0;opacity:.7}
  @media(prefers-reduced-motion:reduce){transition:none;&:hover:not(:disabled){transform:none}}
`;
export const IconButton=styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;
  border:2px solid ${p=>p.$active?'var(--paper)':'#f3edda8c'};border-radius:0;
  background:${p=>p.$active?'var(--red)':'var(--ink)'};color:var(--paper);
  box-shadow:3px 3px 0 ${p=>p.$active?'var(--paper)':'#000'};transition:transform .15s cubic-bezier(.2,1.5,.4,1),background .15s,box-shadow .15s,border-color .15s;
  &:hover:not(:disabled){background:var(--red);border-color:var(--paper);box-shadow:3px 3px 0 var(--paper);transform:rotate(-4deg)}
  &:active:not(:disabled){transform:translate(2px,2px);box-shadow:1px 1px 0 var(--paper)}
  &:focus-visible{outline:3px solid var(--red);outline-offset:4px}
  &:disabled{opacity:.35;box-shadow:none;cursor:not-allowed}svg{width:19px;height:19px}
  @media(prefers-reduced-motion:reduce){transition:none;&:hover:not(:disabled){transform:none}}
`;
export const Field=styled.label`
  display:flex;flex-direction:column;gap:9px;color:inherit;font-size:13px;font-weight:600;
  input,select{width:100%;min-height:43px;border:2px solid var(--ink);border-radius:0;background:#fff9e9;color:var(--ink);padding:10px 12px;box-shadow:3px 3px 0 var(--ink);font:600 14px var(--font-body),Arial,sans-serif;transition:box-shadow .15s,transform .15s}
  input:focus-visible,select:focus-visible{outline:3px solid var(--red);outline-offset:3px;box-shadow:4px 4px 0 var(--red)}
  select{appearance:none;padding-right:38px;cursor:pointer;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23141316' stroke-width='2.4'/%3E%3C/svg%3E") no-repeat right 13px center/12px 8px,#fff9e9}
`;
export const Eyebrow=styled.span`font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);font-weight:600;`;
