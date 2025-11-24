import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Trash2, Clock, Activity, Copy, Check, 
  ArrowUp, ArrowDown, Film, Scissors, Play, RefreshCw, Settings, X, GripVertical, Shield, ShieldAlert,
  Moon, Sun, ChevronDown, ChevronRight
} from 'lucide-react';

const SEQ_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
];

// Distinct colors for segments inside a section
const CLIP_COLORS = [
  'bg-indigo-400', 'bg-pink-400', 'bg-teal-400', 
  'bg-orange-400', 'bg-lime-400', 'bg-fuchsia-400', 
  'bg-sky-400', 'bg-red-400'
];

// --- Helper: Recalculate Timing Logic ---
const reorderAndRecalculate = (items, index, direction) => {
  const newItems = [...items];
  
  // 1. Swap Elements in Array
  if (direction === 'up' && index > 0) {
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
  } else if (direction === 'down' && index < newItems.length - 1) {
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
  } else {
    return items; // No move needed
  }

  // 2. Calculate Gaps from the ORIGINAL order (Position-based gaps)
  // We assume the user wants to keep the "Timeline Slots" (e.g. Gap -> Item -> Gap -> Item)
  const gaps = items.map((item, i) => {
    const prevEnd = i === 0 ? 0 : items[i-1].end;
    return Math.max(0, item.start - prevEnd);
  });

  // 3. Apply new timings to the NEW order
  let currentPos = 0;
  return newItems.map((item, i) => {
    // Preserve duration
    const duration = Math.max(0.001, item.end - item.start);
    const gap = gaps[i] || 0;
    
    // New Start is previous end + gap
    const newStart = parseFloat((currentPos + gap).toFixed(4));
    const newEnd = parseFloat((newStart + duration).toFixed(4));
    
    currentPos = newEnd;
    
    return { ...item, start: newStart, end: newEnd };
  });
};

// --- Helper Component: Interactive Dual Handle Slider ---
const TimelineSlider = ({ start, end, label, color, onChange, subLabel, previewSegments = [] }) => {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null); // 'start' | 'end' | null

  const getPercentage = (clientX) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const handlePointerDown = (e, handle) => {
    e.preventDefault();
    setIsDragging(handle);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const newPct = parseFloat(getPercentage(e.clientX).toFixed(3));
    
    if (isDragging === 'start') {
      const safeStart = Math.min(newPct, end - 0.01);
      onChange('start', safeStart);
    } else {
      const safeEnd = Math.max(newPct, start + 0.01);
      onChange('end', safeEnd);
    }
  };

  const handlePointerUp = (e) => {
    setIsDragging(null);
    e.target.releasePointerCapture(e.pointerId);
  };

  const leftPct = start * 100;
  const widthPct = Math.max(0, (end - start) * 100);

  return (
    <div className="relative h-10 select-none group">
       {/* Background Track */}
       <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden transition-colors">
          {/* Fill (Active Area) */}
          <div 
            className={`absolute h-full ${color} opacity-30`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          >
            {/* Internal Preview Segments */}
            {previewSegments.map((seg, i) => {
              const segLeft = seg.start * 100;
              const segWidth = Math.max(0, seg.end - seg.start) * 100;
              return (
                <div 
                  key={i}
                  className="absolute top-0 bottom-0 bg-white/40 border-r border-white/20"
                  style={{ left: `${segLeft}%`, width: `${segWidth}%` }}
                  title={`${seg.name}`}
                />
              );
            })}
          </div>
       </div>

       {/* Interactive Area */}
       <div 
          ref={containerRef}
          className="absolute inset-0 cursor-pointer"
          onPointerMove={handlePointerMove}
       >
          {/* Start Handle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 shadow-sm rounded flex items-center justify-center cursor-ew-resize hover:border-indigo-500 hover:scale-110 transition-transform z-10"
            style={{ left: `${leftPct}%`, transform: 'translate(-50%, -50%)' }}
            onPointerDown={(e) => handlePointerDown(e, 'start')}
            onPointerUp={handlePointerUp}
          >
            <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-400"></div>
          </div>

          {/* Active Bar Label */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 h-6 ${color} rounded-sm shadow-sm flex items-center justify-center overflow-hidden border border-white/20 pointer-events-none`}
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, transform: 'translate(0, -50%)' }}
          >
             <span className="text-[10px] text-white font-bold whitespace-nowrap px-2 drop-shadow-md">
                {label} {widthPct > 20 && subLabel && <span className="opacity-75 font-normal ml-1">({subLabel})</span>}
             </span>
          </div>

          {/* End Handle */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-6 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 shadow-sm rounded flex items-center justify-center cursor-ew-resize hover:border-indigo-500 hover:scale-110 transition-transform z-10"
            style={{ left: `${leftPct + widthPct}%`, transform: 'translate(-50%, -50%)' }}
            onPointerDown={(e) => handlePointerDown(e, 'end')}
            onPointerUp={handlePointerUp}
          >
            <div className="w-0.5 h-3 bg-slate-300 dark:bg-slate-400"></div>
          </div>
       </div>
    </div>
  );
};


export default function App() {
  const [totalDuration, setTotalDuration] = useState(60);
  const [labels, setLabels] = useState({ parent: 'Section', child: 'Segment' });
  const [showSettings, setShowSettings] = useState(false);
  const [preventOverlap, setPreventOverlap] = useState(true); 
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const [sequences, setSequences] = useState([
    { 
      id: 1, 
      name: 'Intro', 
      start: 0.0, 
      end: 0.25, 
      collapsed: false,
      clips: [
        { id: 101, name: 'Fade In', start: 0.0, end: 0.2 },
        { id: 102, name: 'Title', start: 0.2, end: 1.0 }
      ]
    },
    { 
      id: 2, 
      name: 'Main Content', 
      start: 0.25,
      end: 0.8,
      collapsed: false,
      clips: [
        { id: 201, name: 'Part A', start: 0.0, end: 0.5 }
      ]
    }
  ]);
  const [copied, setCopied] = useState(false);

  // --- Sequence Logic ---

  const addSequence = () => {
    const newId = Date.now();
    const lastSeq = sequences[sequences.length - 1];
    const newStart = lastSeq ? parseFloat(lastSeq.end) || 0 : 0;
    let newEnd = newStart + 0.1;
    if (newStart >= 1.0) {
        newEnd = 1.0; 
    }
    if (preventOverlap && newEnd > 1.0) newEnd = 1.0;

    setSequences([
      ...sequences, 
      { 
        id: newId, 
        name: `${labels.parent} ${sequences.length + 1}`, 
        start: parseFloat(newStart.toFixed(3)),
        end: parseFloat(Math.min(1.0, newEnd).toFixed(3)),
        collapsed: false,
        clips: [] 
      }
    ]);
  };

  const removeSequence = (id) => {
    setSequences(sequences.filter(seq => seq.id !== id));
  };

  const toggleCollapse = (id) => {
    setSequences(sequences.map(seq => {
      if (seq.id === id) {
        return { ...seq, collapsed: !seq.collapsed };
      }
      return seq;
    }));
  };

  const updateSequence = (id, field, value) => {
    setSequences(prevSequences => {
      const index = prevSequences.findIndex(s => s.id === id);
      if (index === -1) return prevSequences;

      const oldSeq = prevSequences[index];
      let updates = {};

      let rawVal = value;
      if (field === 'startSec') rawVal = value / totalDuration;
      if (field === 'endSec') rawVal = value / totalDuration;

      let newStart = (field === 'start' || field === 'startSec') ? parseFloat(rawVal) : oldSeq.start;
      let newEnd = (field === 'end' || field === 'endSec') ? parseFloat(rawVal) : oldSeq.end;
      
      if (field === 'name') updates.name = value;

      if (preventOverlap && (field.includes('start') || field.includes('end'))) {
        const prevSeq = index > 0 ? prevSequences[index - 1] : null;
        const nextSeq = index < prevSequences.length - 1 ? prevSequences[index + 1] : null;

        if (prevSeq && newStart < prevSeq.end) newStart = prevSeq.end;
        if (nextSeq && newEnd > nextSeq.start) newEnd = nextSeq.start;
        
        newStart = Math.max(0, newStart);
        newEnd = Math.min(1, newEnd);

        if (field.includes('start') && newStart >= newEnd) newStart = Math.max(0, newEnd - 0.01);
        if (field.includes('end') && newEnd <= newStart) newEnd = Math.min(1, newStart + 0.01);
      } else {
        if (field.includes('start') || field.includes('end')) {
           newStart = Math.min(1, Math.max(0, newStart));
           newEnd = Math.min(1, Math.max(0, newEnd));
        }
      }

      if (field.includes('start')) updates.start = parseFloat(newStart.toFixed(4));
      if (field.includes('end')) updates.end = parseFloat(newEnd.toFixed(4));

      const newSeq = { ...oldSeq, ...updates };
      const newArr = [...prevSequences];
      newArr[index] = newSeq;
      return newArr;
    });
  };

  const moveSequence = (index, direction) => {
    // Use the helper to reorder AND recalculate start/end times
    const updatedSequences = reorderAndRecalculate(sequences, index, direction);
    setSequences(updatedSequences);
  };

  // --- Clip Logic ---

  const addClip = (seqId) => {
    setSequences(sequences.map(seq => {
      if (seq.id === seqId) {
        const lastClip = seq.clips[seq.clips.length - 1];
        const newStart = lastClip ? parseFloat(lastClip.end) || 0 : 0;
        let newEnd = Math.min(1.0, newStart + 0.2);
        
        if (preventOverlap && newEnd > 1.0) newEnd = 1.0;

        const newClip = {
          id: Date.now() + Math.random(),
          name: `${labels.child} ${seq.clips.length + 1}`,
          start: parseFloat(newStart.toFixed(3)),
          end: parseFloat(newEnd.toFixed(3))
        };
        return { ...seq, clips: [...seq.clips, newClip] };
      }
      return seq;
    }));
  };

  const removeClip = (seqId, clipId) => {
    setSequences(sequences.map(seq => {
      if (seq.id === seqId) {
        return { ...seq, clips: seq.clips.filter(c => c.id !== clipId) };
      }
      return seq;
    }));
  };

  const moveClip = (seqId, clipIndex, direction) => {
    setSequences(sequences.map(seq => {
      if (seq.id === seqId) {
        // Recalculate timing for clips inside this sequence
        const newClips = reorderAndRecalculate(seq.clips, clipIndex, direction);
        return { ...seq, clips: newClips };
      }
      return seq;
    }));
  };

  const updateClip = (seqId, clipId, field, value) => {
    setSequences(sequences.map(seq => {
      if (seq.id === seqId) {
        const seqDuration = Math.max(0, (seq.end - seq.start) * totalDuration);
        
        const index = seq.clips.findIndex(c => c.id === clipId);
        if (index === -1) return seq;
        const oldClip = seq.clips[index];
        
        let updates = {};
        let rawVal = value;
        if (field === 'startSec') rawVal = seqDuration > 0 ? value / seqDuration : 0;
        if (field === 'endSec') rawVal = seqDuration > 0 ? value / seqDuration : 0;

        let newStart = (field === 'start' || field === 'startSec') ? parseFloat(rawVal) : oldClip.start;
        let newEnd = (field === 'end' || field === 'endSec') ? parseFloat(rawVal) : oldClip.end;

        if (field === 'name') updates.name = value;

        if (preventOverlap && (field.includes('start') || field.includes('end'))) {
          const prevClip = index > 0 ? seq.clips[index - 1] : null;
          const nextClip = index < seq.clips.length - 1 ? seq.clips[index + 1] : null;

          if (prevClip && newStart < prevClip.end) newStart = prevClip.end;
          if (nextClip && newEnd > nextClip.start) newEnd = nextClip.start;

          newStart = Math.max(0, newStart);
          newEnd = Math.min(1, newEnd);
          
          if (field.includes('start') && newStart >= newEnd) newStart = Math.max(0, newEnd - 0.01);
          if (field.includes('end') && newEnd <= newStart) newEnd = Math.min(1, newStart + 0.01);
        } else {
             if (field.includes('start') || field.includes('end')) {
                newStart = Math.min(1, Math.max(0, newStart));
                newEnd = Math.min(1, Math.max(0, newEnd));
             }
        }

        if (field.includes('start')) updates.start = parseFloat(newStart.toFixed(4));
        if (field.includes('end')) updates.end = parseFloat(newEnd.toFixed(4));

        const updatedClips = [...seq.clips];
        updatedClips[index] = { ...oldClip, ...updates };

        return { ...seq, clips: updatedClips };
      }
      return seq;
    }));
  };

  // --- Export ---
  
  const copyResults = () => {
    let text = `TOTAL DURATION: ${totalDuration}s\n\n`;
    
    sequences.forEach((seq, idx) => {
      const sStart = (seq.start * totalDuration).toFixed(2);
      const sEnd = (seq.end * totalDuration).toFixed(2);
      const sDur = (sEnd - sStart).toFixed(2);
      
      text += `${idx + 1}. [${labels.parent}] ${seq.name}\n`;
      text += `   Range: ${seq.start}-${seq.end} (${sStart}s - ${sEnd}s)\n`;
      text += `   Duration: ${sDur}s\n`;
      
      seq.clips.forEach(clip => {
        const seqDur = parseFloat(sDur);
        const cStart = (clip.start * seqDur).toFixed(2);
        const cEnd = (clip.end * seqDur).toFixed(2);
        const cDur = (cEnd - cStart).toFixed(2);
        
        text += `     - [${labels.child}] ${clip.name}: ${clip.start}-${clip.end} (${cStart}s - ${cEnd}s)\n`;
      });
      text += '\n';
    });
    
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-2 md:p-8 font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Global Header */}
        <div className="bg-slate-900 dark:bg-slate-900 text-white rounded-2xl shadow-lg p-6 sticky top-2 z-30 ring-1 ring-slate-900/5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Film className="w-6 h-6 text-indigo-400" />
                <h1 className="text-2xl font-bold">Timeline Calculator</h1>
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors ml-2"
                  title="Rename Terminology"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <p className="text-slate-400 text-sm mt-1">{sequences.length} {labels.parent}s defined</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Theme Toggle */}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-400 transition-colors"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

               {/* Prevent Overlap Toggle */}
               <button 
                 onClick={() => setPreventOverlap(!preventOverlap)}
                 className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${preventOverlap ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                 title="Prevent overlaps when resizing"
               >
                 {preventOverlap ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                 {preventOverlap ? 'Overlap: Blocked' : 'Overlap: Allowed'}
               </button>

              <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-inner">
                <Clock className="w-6 h-6 text-indigo-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Duration (Sec)</span>
                  <input 
                    type="number"
                    value={totalDuration}
                    onChange={(e) => setTotalDuration(parseFloat(e.target.value) || 0)}
                    className="bg-transparent font-mono text-3xl font-bold text-white leading-none outline-none w-32 focus:border-b border-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>
            
            {/* Settings Panel */}
            {showSettings && (
              <div className="absolute top-20 left-6 z-50 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-64 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-sm uppercase text-slate-500 dark:text-slate-400">Terminology</h3>
                  <button onClick={() => setShowSettings(false)}><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Parent Label</label>
                    <input 
                      className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded px-2 py-1 text-sm focus:border-indigo-500 outline-none" 
                      value={labels.parent}
                      onChange={(e) => setLabels({...labels, parent: e.target.value})}
                      placeholder="e.g. Sequence, Chapter"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Child Label</label>
                    <input 
                      className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 rounded px-2 py-1 text-sm focus:border-indigo-500 outline-none" 
                      value={labels.child}
                      onChange={(e) => setLabels({...labels, child: e.target.value})}
                      placeholder="e.g. Clip, Scene"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Global Timeline Preview Bar */}
          <div className="mt-6 bg-slate-800/50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
             <div className="h-6 bg-slate-700 dark:bg-slate-800 rounded flex overflow-hidden relative">
               {/* Grid */}
               {[0, 0.25, 0.5, 0.75, 1].map(tick => (
                 <div key={tick} className="absolute top-0 bottom-0 border-r border-white/10" style={{ left: `${tick * 100}%` }}></div>
               ))}
               
               {sequences.map((seq, index) => {
                 const startPct = seq.start * 100;
                 const widthPct = Math.max(0, (seq.end - seq.start) * 100);
                 const seqColor = SEQ_COLORS[index % SEQ_COLORS.length];
                 if (widthPct <= 0) return null;

                 return (
                   <div
                     key={seq.id}
                     className={`${seqColor} h-full absolute top-0 bottom-0 border-r border-white/20 hover:brightness-110 cursor-help transition-all opacity-80 flex items-center justify-center`}
                     style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                     title={`${seq.name}: ${seq.start}-${seq.end}`}
                   >
                     {/* Added Text Label */}
                     <span className="text-[10px] text-white font-bold whitespace-nowrap overflow-hidden px-1 drop-shadow-md">
                       {widthPct > 5 ? seq.name : ''}
                     </span>
                   </div>
                 );
               })}
             </div>
             <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1 px-1">
               <span>0s</span>
               <span>{totalDuration / 2}s</span>
               <span>{totalDuration}s</span>
             </div>
          </div>
        </div>

        {/* Sequences List */}
        <div className="space-y-6">
          {sequences.map((seq, index) => {
             const seqColor = SEQ_COLORS[index % SEQ_COLORS.length];
             const seqDuration = Math.max(0, (seq.end - seq.start) * totalDuration);
             
             return (
              <div key={seq.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md group">
                
                {/* Sequence Header Bar */}
                <div className={`p-4 border-b border-slate-100 dark:border-slate-800 ${index % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : 'bg-white dark:bg-slate-900'}`}>
                  <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4">
                    
                    {/* Top Row: Reorder, Collapse, Name, Duration, Trash */}
                    <div className="flex items-center gap-4 w-full flex-1">
                      
                      {/* 1. Reorder & Collapse */}
                      <div className="flex flex-col gap-1 pr-2 border-r border-slate-200 dark:border-slate-700">
                         {/* Reorder Buttons */}
                         <div className="flex gap-1 mb-1 justify-center">
                            <button 
                              onClick={() => moveSequence(index, 'up')}
                              disabled={index === 0}
                              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                              title="Move Up"
                            ><ArrowUp className="w-3 h-3" /></button>
                            <button 
                              onClick={() => moveSequence(index, 'down')}
                              disabled={index === sequences.length - 1}
                              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                              title="Move Down"
                            ><ArrowDown className="w-3 h-3" /></button>
                         </div>
                         
                         {/* Collapse Button */}
                         <button 
                           onClick={() => toggleCollapse(seq.id)}
                           className="flex items-center justify-center p-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 transition-colors"
                           title={seq.collapsed ? "Expand" : "Collapse"}
                         >
                           {seq.collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                         </button>
                      </div>

                      {/* 2. Name & Duration Block */}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">{labels.parent} Name</label>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${seqColor}`}></div>
                            <input 
                              type="text" 
                              value={seq.name}
                              onChange={(e) => updateSequence(seq.id, 'name', e.target.value)}
                              className="w-full font-bold text-lg text-slate-700 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors"
                            />
                          </div>
                        </div>

                        {/* Total Duration Display */}
                        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-2 whitespace-nowrap">
                             <Clock className="w-3 h-3 text-slate-400" />
                             <span className="text-sm font-mono font-bold text-slate-700 dark:text-slate-200">{seqDuration.toFixed(2)}s</span>
                        </div>
                      </div>
                      
                      {/* 3. Trash */}
                      <button 
                        onClick={() => removeSequence(seq.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                      ><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* Controls Row: Sequence Timing & Sliders */}
                  {!seq.collapsed && (
                  <div className="mt-4 pt-4 border-t border-slate-100/50 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                       
                       {/* Inputs (Left) */}
                       <div className="md:col-span-6 lg:col-span-5 grid grid-cols-4 gap-2">
                            {/* Ratio Start */}
                            <div>
                                <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Start (0-1)</label>
                                <input 
                                  type="number" step="0.01" min="0" max="1"
                                  value={seq.start}
                                  onChange={(e) => updateSequence(seq.id, 'start', e.target.value)}
                                  className="w-full text-xs font-mono bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {/* Ratio End */}
                            <div>
                                <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">End (0-1)</label>
                                <input 
                                  type="number" step="0.01" min="0" max="1"
                                  value={seq.end}
                                  onChange={(e) => updateSequence(seq.id, 'end', e.target.value)}
                                  className="w-full text-xs font-mono bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {/* Sec Start */}
                            <div>
                                <label className="text-[9px] text-indigo-400 font-bold uppercase block mb-1">Start (s)</label>
                                <input 
                                  type="number"
                                  value={(seq.start * totalDuration).toFixed(3)}
                                  onChange={(e) => updateSequence(seq.id, 'startSec', parseFloat(e.target.value))}
                                  className="w-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900 rounded px-2 py-1.5 text-indigo-700 dark:text-indigo-400 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            {/* Sec End */}
                            <div>
                                <label className="text-[9px] text-indigo-400 font-bold uppercase block mb-1">End (s)</label>
                                <input 
                                  type="number"
                                  value={(seq.end * totalDuration).toFixed(3)}
                                  onChange={(e) => updateSequence(seq.id, 'endSec', parseFloat(e.target.value))}
                                  className="w-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900 rounded px-2 py-1.5 text-indigo-700 dark:text-indigo-400 focus:border-indigo-500 outline-none"
                                />
                            </div>
                       </div>

                       {/* Interactive Slider (Right) */}
                       <div className="md:col-span-6 lg:col-span-7 pb-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1 flex justify-between">
                             <span>{labels.parent} Timeline (Global Position)</span>
                             <span>{(seq.end * totalDuration).toFixed(2)}s</span>
                          </label>
                          <TimelineSlider 
                             start={seq.start} 
                             end={seq.end} 
                             color={seqColor}
                             label={seq.name}
                             previewSegments={seq.clips} // Pass segments for preview
                             onChange={(type, val) => updateSequence(seq.id, type, val)}
                          />
                       </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Sequence Body (Clips) */}
                {!seq.collapsed && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                  
                  {/* DEDICATED SECTION TIMELINE PREVIEW */}
                  <div className="mb-6 relative px-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase mb-1">
                      <span>0.00s</span>
                      <span>{labels.parent} Timeline Preview</span>
                      <span>{seqDuration.toFixed(2)}s</span>
                    </div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden relative">
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map(t => (
                        <div key={t} className="absolute top-0 bottom-0 border-r border-slate-300/50 dark:border-slate-600/30" style={{ left: `${t*100}%` }} />
                      ))}
                      
                      {/* Clips */}
                      {seq.clips.map((clip, clipIndex) => {
                        const startPct = clip.start * 100;
                        const widthPct = Math.max(0, clip.end - clip.start) * 100;
                        // Use distinct clip color or cycle through
                        const clipColor = CLIP_COLORS[clipIndex % CLIP_COLORS.length];
                        
                        return (
                          <div 
                            key={clip.id}
                            className={`absolute top-1 bottom-1 ${clipColor} border border-white/20 rounded-sm shadow-sm flex items-center justify-center overflow-hidden text-[10px] text-white font-bold whitespace-nowrap px-2 z-10 hover:brightness-110 transition-all`}
                            style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                            title={`${clip.name}: ${((clip.end - clip.start) * seqDuration).toFixed(2)}s`}
                          >
                             {widthPct > 5 && clip.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clips List */}
                  <div className="space-y-3 pl-2 md:pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Scissors className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-500 uppercase">{labels.child}s</span>
                    </div>

                    {seq.clips.map((clip, clipIdx) => {
                      const clipDuration = (clip.end - clip.start) * seqDuration;
                      const clipStartSec = clip.start * seqDuration;
                      const clipEndSec = clip.end * seqDuration;

                      return (
                        <div key={clip.id} className="bg-white dark:bg-slate-900 p-3 rounded shadow-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-3">
                            
                            {/* Reorder Buttons (New) */}
                            <div className="md:col-span-1 flex flex-col items-center justify-center gap-1 border-r border-slate-100 dark:border-slate-800 pr-2">
                                <button 
                                  onClick={() => moveClip(seq.id, clipIdx, 'up')}
                                  disabled={clipIdx === 0}
                                  className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20"
                                ><ArrowUp className="w-3 h-3" /></button>
                                <button 
                                  onClick={() => moveClip(seq.id, clipIdx, 'down')}
                                  disabled={clipIdx === seq.clips.length - 1}
                                  className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-20"
                                ><ArrowDown className="w-3 h-3" /></button>
                            </div>

                            {/* Clip Name */}
                            <div className="md:col-span-2 flex items-center gap-2">
                               <Play className="w-3 h-3 text-slate-300 fill-slate-300 flex-none" />
                               <input 
                                 type="text" 
                                 value={clip.name}
                                 onChange={(e) => updateClip(seq.id, clip.id, 'name', e.target.value)}
                                 className="w-full text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent outline-none focus:underline"
                                 placeholder={`${labels.child} Name`}
                               />
                            </div>
                            
                            {/* Clip Inputs (Start/End Ratios & Seconds) */}
                            <div className="md:col-span-7 grid grid-cols-4 gap-2">
                                {/* Start Ratio */}
                                <div>
                                  <label className="text-[8px] uppercase text-slate-400 font-bold block mb-0.5">Start (0-1)</label>
                                  <input 
                                    type="number" step="0.01" min="0" max="1"
                                    value={clip.start}
                                    onChange={(e) => updateClip(seq.id, clip.id, 'start', e.target.value)}
                                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 focus:border-indigo-500 outline-none"
                                  />
                                </div>
                                {/* End Ratio */}
                                <div>
                                  <label className="text-[8px] uppercase text-slate-400 font-bold block mb-0.5">End (0-1)</label>
                                  <input 
                                    type="number" step="0.01" min="0" max="1"
                                    value={clip.end}
                                    onChange={(e) => updateClip(seq.id, clip.id, 'end', e.target.value)}
                                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 focus:border-indigo-500 outline-none"
                                  />
                                </div>
                                {/* Start Seconds */}
                                <div>
                                  <label className="text-[8px] uppercase text-indigo-300 font-bold block mb-0.5">Start (s)</label>
                                  <input 
                                    type="number" value={clipStartSec.toFixed(3)}
                                    onChange={(e) => updateClip(seq.id, clip.id, 'startSec', parseFloat(e.target.value))}
                                    className="w-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 rounded px-1 py-1 focus:border-indigo-500 outline-none"
                                  />
                                </div>
                                {/* End Seconds */}
                                <div>
                                  <label className="text-[8px] uppercase text-indigo-300 font-bold block mb-0.5">End (s)</label>
                                  <input 
                                    type="number" value={clipEndSec.toFixed(3)}
                                    onChange={(e) => updateClip(seq.id, clip.id, 'endSec', parseFloat(e.target.value))}
                                    className="w-full text-xs font-mono bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 rounded px-1 py-1 focus:border-indigo-500 outline-none"
                                  />
                                </div>
                            </div>

                            {/* Duration & Delete */}
                            <div className="md:col-span-2 flex justify-end items-center gap-2">
                               <span className="text-xs text-slate-400 font-mono">{clipDuration.toFixed(2)}s</span>
                               <button onClick={() => removeClip(seq.id, clip.id)} className="text-slate-300 hover:text-red-500 dark:hover:text-red-400">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                          
                          {/* Clip Slider */}
                          <div className="px-1">
                             <TimelineSlider 
                               start={clip.start}
                               end={clip.end}
                               color="bg-slate-400 dark:bg-slate-500"
                               label={clip.name}
                               subLabel={`${clipDuration.toFixed(2)}s`}
                               onChange={(type, val) => updateClip(seq.id, clip.id, type, val)}
                             />
                          </div>
                        </div>
                      );
                    })}

                    <button 
                      onClick={() => addClip(seq.id)}
                      className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 py-2 px-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add {labels.child}
                    </button>
                  </div>

                </div>
                )}
              </div>
             );
          })}
        </div>

        {/* Global Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-12">
          <button 
            onClick={addSequence}
            className="flex-1 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white py-3 px-6 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add New {labels.parent}
          </button>
          
          <button 
            onClick={copyResults}
            className="flex-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 px-6 rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
        </div>

      </div>
    </div>
  );
}