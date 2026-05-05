import { useCallback, useMemo } from 'react';
import { useMobileTranscription } from '@/lib/cenaiva/voice/useMobileTranscription';
import { useMobileTTS } from '@/lib/cenaiva/voice/useMobileTTS';

type UseCenaivaVoiceOptions = {
  onFirstAudioStart?: () => void;
};

type SpeakOptions = {
  onFirstAudioStart?: () => void;
};

type StreamingChunkOptions = {
  pacingAfterMs?: number;
  onFirstAudioStart?: () => void;
};

export function useCenaivaVoice(options: UseCenaivaVoiceOptions = {}) {
  const transcription = useMobileTranscription();
  const tts = useMobileTTS({ onFirstAudioStart: options.onFirstAudioStart });

  const stopListening = useCallback(() => {
    transcription.stopListening();
  }, [transcription.stopListening]);

  const stopSpeaking = useCallback(() => {
    tts.stopSpeaking();
  }, [tts.stopSpeaking]);

  const startListening = useCallback(
    async (hints: string[] = []) => {
      tts.stopSpeaking();
      return transcription.startListening(hints);
    },
    [transcription.startListening, tts.stopSpeaking],
  );

  return useMemo(
    () => ({
      isListening: transcription.isListening,
      liveTranscript: transcription.liveTranscript,
      transcriptionPhase: transcription.phase,
      permissionDenied: transcription.permissionDenied,
      transcriptionUnavailable: transcription.unavailable,
      transcriptionLastError: transcription.lastError,
      startListening,
      stopListening,
      isSpeaking: tts.isSpeaking,
      isStreamingTTSAvailable: tts.isStreamingTTSAvailable,
      speak: tts.speak as (text: string, options?: SpeakOptions) => Promise<boolean>,
      speakStreamingChunk: tts.speakStreamingChunk as (text: string, options?: StreamingChunkOptions) => void,
      discardStreamingSpeech: tts.discardStreamingSpeech,
      drainStreamingSpeech: tts.drainStreamingSpeech,
      stopSpeaking,
      primeTTS: tts.primeTTS,
    }),
    [
      transcription.isListening,
      transcription.liveTranscript,
      transcription.phase,
      transcription.permissionDenied,
      transcription.unavailable,
      transcription.lastError,
      startListening,
      stopListening,
      tts.isSpeaking,
      tts.isStreamingTTSAvailable,
      tts.speak,
      tts.speakStreamingChunk,
      tts.discardStreamingSpeech,
      tts.drainStreamingSpeech,
      tts.stopSpeaking,
      tts.primeTTS,
    ],
  );
}
