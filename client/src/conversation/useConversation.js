import { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  fetchForm,
  fetchNextField,
  fetchSummary,
  submitAnswer,
  synthesizeSpeech,
  transcribeAudio,
} from '../api'
import { startRecording, stopRecording } from '../audio/recorder'
import {
  conversationReducer,
  createInitialContext,
  MAX_ATTEMPTS_PER_FIELD,
  STATES,
} from './stateMachine'

export function useConversation(initialOptions = {}) {
  const [state, dispatch] = useReducer(
    conversationReducer,
    createInitialContext(initialOptions)
  )

  const abortControllerRef = useRef(null)
  const currentAudioRef = useRef(null)
  const isPlayingRef = useRef(false)
  const isRecordingRef = useRef(false)
  const inFlightRef = useRef(false) // Guard against render-loop repeated API calls

  // Stop active audio playback
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause()
        currentAudioRef.current.currentTime = 0
        currentAudioRef.current.src = ''
      } catch (_) {}
      currentAudioRef.current = null
    }
    isPlayingRef.current = false
  }, [])

  // Safely stop active recording
  const cancelRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      try {
        await stopRecording()
      } catch (_) {}
      isRecordingRef.current = false
    }
  }, [])

  // Stop everything (audio, recording, fetch requests)
  const stopAll = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    stopAudio()
    await cancelRecording()
    inFlightRef.current = false
  }, [stopAudio, cancelRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll()
    }
  }, [stopAll])

  // Helper to play synthesized audio with autoplay / user-gesture safety
  const playPromptAudio = useCallback(
    async (text, { sensitive = false } = {}) => {
      if (!text || state.voiceMuted) {
        dispatch({ type: 'SKIP_AUDIO' })
        return
      }

      stopAudio()
      await cancelRecording()

      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        const { audioBlob, latencyMs, cacheHit } = await synthesizeSpeech(text, {
          language: 'ta-IN',
          sensitive,
          signal,
        })

        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio
        isPlayingRef.current = true

        audio.onended = () => {
          isPlayingRef.current = false
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          dispatch({ type: 'AUDIO_ENDED' })
        }

        audio.onerror = () => {
          isPlayingRef.current = false
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          dispatch({ type: 'SKIP_AUDIO' })
        }

        await audio.play()
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('TTS playback failed or was interrupted:', err.message)
        dispatch({ type: 'SKIP_AUDIO' })
      }
    },
    [state.voiceMuted, stopAudio, cancelRecording]
  )

  // Start the conversation loop
  const start = useCallback(async () => {
    await stopAll()
    dispatch({ type: 'START' })

    try {
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      const form = await fetchForm('pension', { signal })
      const firstField = form.fields.find((f) => f.spoken)
      const nextRes = await fetchNextField({
        formId: 'pension',
        answers: {},
        currentId: null,
        signal,
      })

      dispatch({
        type: 'FORM_LOADED',
        payload: {
          form,
          firstField: nextRes.next || firstField,
          progress: nextRes.progress,
        },
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      dispatch({
        type: 'FAIL',
        payload: {
          message: err.message,
          messageTa: 'படிவத்தை ஏற்றுவதில் சிக்கல் ஏற்பட்டது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
          status: err.status || 500,
        },
      })
    }
  }, [stopAll])

  // Handle transitions into audio-speaking states
  useEffect(() => {
    if (inFlightRef.current) return

    if (
      state.state === STATES.SPEAKING_QUESTION ||
      state.state === STATES.SPEAKING_HELP ||
      state.state === STATES.SPEAKING_ERROR
    ) {
      const textToSpeak =
        state.activePromptText?.ta ||
        state.activePromptText?.en ||
        state.currentField?.question?.ta

      if (textToSpeak) {
        playPromptAudio(textToSpeak)
      } else {
        dispatch({ type: 'SKIP_AUDIO' })
      }
    }
  }, [state.state, state.activePromptText, playPromptAudio])

  // Process a text transcript through backend answer route
  const processTranscript = useCallback(
    async (transcript) => {
      const cleanText = (transcript || '').trim()
      const currentField = state.currentField
      if (!currentField) return

      // Handle silence / noise
      if (!cleanText) {
        dispatch({ type: 'ANSWER_SILENCE' })
        return
      }

      inFlightRef.current = true
      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        const answerRes = await submitAnswer({
          formId: 'pension',
          fieldId: currentField.id,
          transcript: cleanText,
          signal,
        })

        if (!answerRes.valid) {
          dispatch({
            type: 'ANSWER_INVALID',
            payload: {
              fieldId: currentField.id,
              validationError: answerRes.validationError,
              errorMessage: currentField.errorMessage,
            },
          })
          return
        }

        // Answer is valid! Calculate next field
        const updatedAnswers = {
          ...state.answers,
          [currentField.id]: {
            value: answerRes.value,
            display: answerRes.display,
            confirmed: false,
            attempts: (state.answers[currentField.id]?.attempts || 0) + 1,
          },
        }

        const nextRes = await fetchNextField({
          formId: 'pension',
          answers: updatedAnswers,
          currentId: currentField.id,
          signal,
        })

        let summary = null
        const isFinished = !nextRes.next

        if (isFinished) {
          const summaryRes = await fetchSummary({
            formId: 'pension',
            answers: updatedAnswers,
            lang: 'ta',
            signal,
          })
          summary = summaryRes.summary
        }

        dispatch({
          type: 'ANSWER_VALID',
          payload: {
            fieldId: currentField.id,
            value: answerRes.value,
            display: answerRes.display,
            nextField: nextRes.next,
            progress: nextRes.progress,
            isFinished,
            summary,
          },
        })
      } catch (err) {
        if (err.name === 'AbortError') return
        const isQuota = err.status === 402 || err.status === 429
        dispatch({
          type: 'FAIL',
          payload: {
            message: err.message,
            messageTa: isQuota
              ? 'அனுமதிக்கப்பட்ட வரம்பு முடிந்தது. பணியாளரின் உதவியை நாடவும்.'
              : 'பதிலை சரிபார்க்க முடியவில்லை.',
            status: err.status || 500,
            code: isQuota ? 'RATE_LIMIT' : 'SERVER_ERROR',
          },
        })
      } finally {
        inFlightRef.current = false
      }
    },
    [state.currentField, state.answers]
  )

  // Start recording audio
  const startListening = useCallback(async () => {
    if (state.state !== STATES.LISTENING || isRecordingRef.current) return
    stopAudio()

    try {
      isRecordingRef.current = true
      dispatch({ type: 'START_RECORDING' })

      await startRecording({
        onAutoStop: async (wavBlob) => {
          isRecordingRef.current = false
          dispatch({ type: 'RECORDING_STOPPED' })
          await handleAudioTranscription(wavBlob)
        },
      })
    } catch (err) {
      isRecordingRef.current = false
      dispatch({
        type: 'FAIL',
        payload: {
          message: 'Microphone access was denied or is unavailable. Please check permissions.',
          messageTa: 'மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. அனுமதியை சரிபார்க்கவும்.',
          code: 'MIC_DENIED',
          status: 400,
        },
      })
    }
  }, [state.state, stopAudio])

  // Stop recording and transcribe
  const stopListening = useCallback(async () => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    dispatch({ type: 'RECORDING_STOPPED' })

    try {
      const wavBlob = await stopRecording()
      await handleAudioTranscription(wavBlob)
    } catch (err) {
      console.warn('Error stopping recording:', err)
      dispatch({ type: 'ANSWER_SILENCE' })
    }
  }, [])

  // Send WAV blob to /api/transcribe
  const handleAudioTranscription = useCallback(
    async (wavBlob) => {
      inFlightRef.current = true
      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        const transcribeRes = await transcribeAudio(wavBlob, 'ta-IN', { signal })
        dispatch({
          type: 'TRANSCRIBE_SUCCESS',
          payload: { latencyMs: transcribeRes.latencyMs },
        })

        await processTranscript(transcribeRes.text)
      } catch (err) {
        if (err.name === 'AbortError') return
        const isQuota = err.status === 402 || err.status === 429
        dispatch({
          type: 'FAIL',
          payload: {
            message: err.message,
            messageTa: isQuota
              ? 'அனுமதிக்கப்பட்ட வரம்பு முடிந்தது. பணியாளரின் உதவியை நாடவும்.'
              : 'குரல் பதிவை எழுத்தாக்க முடியவில்லை.',
            status: err.status || 500,
            code: isQuota ? 'RATE_LIMIT' : 'TRANSCRIBE_ERROR',
          },
        })
      } finally {
        inFlightRef.current = false
      }
    },
    [processTranscript]
  )

  // Submit typed input (for typed test mode)
  const submitTyped = useCallback(
    async (text) => {
      if (state.state !== STATES.LISTENING) return
      dispatch({ type: 'TYPED_SUBMIT' })
      await processTranscript(text)
    },
    [state.state, processTranscript]
  )

  // Skip optional field
  const skipCurrentField = useCallback(async () => {
    if (state.state !== STATES.LISTENING || !state.currentField) return
    const currentField = state.currentField

    inFlightRef.current = true
    try {
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      const updatedAnswers = {
        ...state.answers,
        [currentField.id]: {
          value: null,
          display: '(Skipped)',
          confirmed: false,
          attempts: 0,
          skipped: true,
        },
      }

      const nextRes = await fetchNextField({
        formId: 'pension',
        answers: updatedAnswers,
        currentId: currentField.id,
        signal,
      })

      let summary = null
      const isFinished = !nextRes.next

      if (isFinished) {
        const summaryRes = await fetchSummary({
          formId: 'pension',
          answers: updatedAnswers,
          lang: 'ta',
          signal,
        })
        summary = summaryRes.summary
      }

      dispatch({
        type: 'SKIP_FIELD',
        payload: {
          fieldId: currentField.id,
          nextField: nextRes.next,
          progress: nextRes.progress,
          isFinished,
          summary,
        },
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('Failed to skip field:', err)
    } finally {
      inFlightRef.current = false
    }
  }, [state.state, state.currentField, state.answers])

  // Repeat question
  const repeatQuestion = useCallback(() => {
    if (state.state !== STATES.LISTENING) return
    stopAudio()
    dispatch({ type: 'REPEAT_QUESTION' })
  }, [state.state, stopAudio])

  // Toggle modes
  const setMode = useCallback((mode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }, [])

  const setVoiceMuted = useCallback((muted) => {
    dispatch({ type: 'SET_VOICE_MUTED', payload: muted })
  }, [])

  // Restart / Reset
  const restart = useCallback(async () => {
    await stopAll()
    dispatch({ type: 'RESTART' })
  }, [stopAll])

  return {
    state: state.state,
    context: state,
    currentField: state.currentField,
    progress: state.progress,
    answers: state.answers,
    summary: state.summary,
    error: state.error,
    isRecording: isRecordingRef.current,
    isPlayingAudio: isPlayingRef.current,
    start,
    startListening,
    stopListening,
    submitTyped,
    skipCurrentField,
    repeatQuestion,
    setMode,
    setVoiceMuted,
    restart,
  }
}
