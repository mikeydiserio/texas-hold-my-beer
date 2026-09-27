'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeftIcon,InfoIcon,SpeakerHighIcon,SpeakerSlashIcon,SpadeIcon} from '@phosphor-icons/react';
import {IconButton} from '../primitives';
import {Modal} from '../Modal';

export function useCardSound() {
  const [enabled,setEnabled]=useState(false),audio=useRef<AudioContext|null>(null);
  useEffect(()=>{try{setEnabled(localStorage.getItem('after-hours-card-sound')==='true');}catch{}return()=>{void audio.current?.close();audio.current=null;};},[]);
  function play(win=false) {
    if(!enabled)return;
    try {
      audio.current??=new AudioContext();const ac=audio.current;void ac.resume();
      const notes=win?[523,659,784]:[420];
      notes.forEach((frequency,i)=>{const oscillator=ac.createOscillator(),gain=ac.createGain(),time=ac.currentTime+i*.1;oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,time);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(.035,time+.01);gain.gain.exponentialRampToValueAtTime(.0001,time+.18);oscillator.connect(gain);gain.connect(ac.destination);oscillator.start(time);oscillator.stop(time+.2);});
    }catch{/* Audio is optional. */}
  }
  function toggle(){setEnabled(v=>{try{localStorage.setItem('after-hours-card-sound',String(!v));}catch{}return !v;});}
  return {enabled,toggle,play};
}
export function ClubShell({title,children,rules,sound,actions}:{title:string;children:ReactNode;rules:ReactNode;sound:ReturnType<typeof useCardSound>;actions?:ReactNode}) {
  const [help,setHelp]=useState(false);
  return <div className="club-shell"><header className="club-header"><Link className="club-back" href="/" aria-label="Game menu"><ArrowLeftIcon size={18}/><span>MIKEYS POKER CLUB</span></Link><h1>{title}</h1><div className="club-tools">{actions}<IconButton aria-label="How to play" title="How to play" onClick={()=>setHelp(true)}><InfoIcon/></IconButton><IconButton aria-label={sound.enabled?'Mute sound':'Enable sound'} title={sound.enabled?'Mute sound':'Enable sound'} onClick={sound.toggle}>{sound.enabled?<SpeakerHighIcon/>:<SpeakerSlashIcon/>}</IconButton></div></header>{children}{help&&<Modal title={title} onClose={()=>setHelp(false)}>{rules}</Modal>}</div>;
}
export function ClubMark(){return <span className="club-mark"><SpadeIcon weight="fill" size={23}/></span>;}
