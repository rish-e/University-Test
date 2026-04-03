import React, { useState, useRef, useEffect } from 'react';
import { GameComponentProps } from '../../../types';
import { AssessmentShell } from '../AssessmentShell';

const VIDEO_PROMPTS: Record<string, string> = {
  'e3': "Topic 1 of 3: Discuss the importance of cross-cultural communication in modern business. (Speak for 1-2 minutes)",
  'v1': "Communication Check: Introduce yourself and what drives you in 60 seconds.",
  'v2': "Scenario: You discover a colleague is inflating sales figures. How do you handle it?",
  'v3': "Stress Response: Describe a time you failed publicly. What did you learn?",
};

export const VideoAssessment: React.FC<GameComponentProps> = ({ section, onComplete, onExit }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  const prompt = VIDEO_PROMPTS[section.id] || "Describe a time you faced a significant challenge and how you overcame it.";

  useEffect(() => {
    if (isRecording) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(err => console.error("Camera access denied", err));

      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [isRecording]);

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsRecording(false);
    onComplete({
      score: 0, // AI will score
      rawScore: 0,
      timeSpent: section.startTime ? Math.floor((Date.now() - section.startTime) / 1000) : 0,
      metrics: { recordingDuration: recordingTime },
      type: 'video',
      data: 'Video Recorded',
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <AssessmentShell
      section={section}
      score={0}
      onExit={() => onExit()}
      onTimeUp={handleSubmit}
    >
      <div className="max-w-3xl mx-auto mt-8">
        <div className="bg-card-bg dark:bg-card-bg-dark p-6 rounded-2xl shadow-lg border border-text-main/5 dark:border-white/5">
          <h2 className="text-xl font-bold text-text-main dark:text-white mb-4">Video Response</h2>
          <p className="text-text-muted mb-6">{prompt}</p>

          <div className="aspect-video bg-black rounded-xl overflow-hidden relative mb-6">
            {isRecording ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/10 dark:bg-white/5">
                <span className="material-symbols-outlined text-6xl text-text-muted/20">videocam_off</span>
              </div>
            )}
            {isRecording && (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm animate-pulse">
                <div className="size-2 rounded-full bg-white" />
                REC {formatTime(recordingTime)}
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <button
                onClick={() => setIsRecording(true)}
                className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
              >
                <span className="material-symbols-outlined">fiber_manual_record</span>
                Start Recording
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-white text-red-500 font-bold rounded-xl border-2 border-red-100 hover:bg-red-50 transition-colors"
              >
                <span className="material-symbols-outlined">stop_circle</span>
                {isSubmitting ? 'Submitting...' : 'Stop & Submit'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AssessmentShell>
  );
};
