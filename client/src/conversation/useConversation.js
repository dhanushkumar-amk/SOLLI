import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  detectCommandApi,
  fetchForm,
  fetchNextField,
  fetchSummary,
  submitAnswer,
  submitConfirm,
  submitPartialCorrection,
  synthesizeSpeech,
  transcribeAudio,
} from '../api'
import { startRecording, stopRecording } from '../audio/recorder'
import {
  conversationReducer,
  createInitialContext,
  MAX_ATTEMPTS_PER_FIELD,
  MAX_CONFIRM_ROUNDS,
  STATES,
} from './stateMachine'

export const MAX_SUMMARY_CHARS = 1200

export function useConversation(initialOptions = {}) {
  const currentFormIdRef = useRef(initialOptions.formId || currentFormIdRef.current)
  const [state, dispatch] = useReducer(
    conversationReducer,
    createInitialContext(initialOptions)
  )

  const [audioLevel, setAudioLevel] = useState(0)

  const abortControllerRef = useRef(null)
  const currentAudioRef = useRef(null)
  const isPlayingRef = useRef(false)
  const isRecordingRef = useRef(false)
  const inFlightRef = useRef(false)
  const summaryStopRef = useRef(false)

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
      setAudioLevel(0)
    }
  }, [])

  // Stop everything (audio, recording, in-flight requests)
  const stopAll = useCallback(async () => {
    summaryStopRef.current = true
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

  // Play a single audio clip via synthesizeSpeech
  const playClip = useCallback(
    async (text, { sensitive = false, noCache = false, isReadback = false } = {}) => {
      if (!text || state.voiceMuted) return true

      return new Promise(async (resolve) => {
        try {
          const controller = new AbortController()
          abortControllerRef.current = controller

          const { audioBlob } = await synthesizeSpeech(text, {
            language: 'ta-IN',
            sensitive,
            noCache,
            isReadback,
            signal: controller.signal,
          })

          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          currentAudioRef.current = audio
          isPlayingRef.current = true

          audio.onended = () => {
            isPlayingRef.current = false
            URL.revokeObjectURL(audioUrl)
            currentAudioRef.current = null
            resolve(true)
          }

          audio.onerror = () => {
            isPlayingRef.current = false
            URL.revokeObjectURL(audioUrl)
            currentAudioRef.current = null
            resolve(false)
          }

          await audio.play()
        } catch (err) {
          isPlayingRef.current = false
          resolve(false)
        }
      })
    },
    [state.voiceMuted]
  )

  // Play prompt audio (supports split audio clips for read-backs)
  const playPromptAudio = useCallback(
    async (text, options = {}) => {
      if (!text || state.voiceMuted) {
        dispatch({ type: 'SKIP_AUDIO' })
        return
      }

      stopAudio()
      await cancelRecording()

      await playClip(text, options)
      dispatch({ type: 'AUDIO_ENDED' })
    },
    [state.voiceMuted, stopAudio, cancelRecording, playClip]
  )

  // Play read-back audio split into dynamic value (no-cache) + static prompt (cached)
  const playReadbackAudio = useCallback(
    async (parts) => {
      if (state.voiceMuted) {
        dispatch({ type: 'SKIP_AUDIO' })
        return
      }

      stopAudio()
      await cancelRecording()

      if (parts?.valuePrompt && parts?.staticConfirmPrompt) {
        // 1. Play dynamic value statement (no-cache, sensitive so never cached)
        await playClip(parts.valuePrompt, {
          sensitive: true,
          noCache: true,
          isReadback: true,
        })

        // Short natural breath between clips (200ms)
        await new Promise((res) => setTimeout(res, 200))

        // 2. Play static confirmation question (cached, zero credits on HIT)
        await playClip(parts.staticConfirmPrompt, {
          sensitive: false,
          noCache: false,
          isReadback: true,
        })
      } else if (parts?.fullText) {
        await playClip(parts.fullText, {
          sensitive: true,
          noCache: true,
          isReadback: true,
        })
      }

      dispatch({ type: 'AUDIO_ENDED' })
    },
    [state.voiceMuted, stopAudio, cancelRecording, playClip]
  )

  // Start the conversation loop
  const start = useCallback(async (overrideFormId) => {
    if (typeof overrideFormId === 'string' && overrideFormId) {
      currentFormIdRef.current = overrideFormId
    }
    await stopAll()
    dispatch({ type: 'START' })

    try {
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal

      const form = await fetchForm(currentFormIdRef.current, { signal })
      const firstField = form.fields.find((f) => f.spoken)
      const nextRes = await fetchNextField({
        formId: currentFormIdRef.current,
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

  // Handle entry into audio-speaking states
  useEffect(() => {
    if (inFlightRef.current) return

    if (state.state === STATES.SPEAKING_READBACK) {
      const parts = state.pendingConfirmation?.readbackParts
      if (parts) {
        playReadbackAudio(parts)
      } else {
        const text = state.activePromptText?.ta || state.activePromptText?.en || ''
        playPromptAudio(text, { noCache: true, isReadback: true })
      }
      return
    }

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
  }, [
    state.state,
    state.activePromptText,
    state.pendingConfirmation,
    playPromptAudio,
    playReadbackAudio,
  ])

  // Process a text transcript through backend answer route
  const processTranscript = useCallback(
    async (transcript) => {
      const rawText = (transcript || '').trim()
      const currentField = state.currentField
      if (!currentField) return

      // Handle silence / noise
      if (!rawText) {
        dispatch({ type: 'ANSWER_SILENCE' })
        return
      }

      // If we had partial digits stored, prepend them to the new utterance
      const cleanText = state.partialDigits ? `${state.partialDigits} ${rawText}` : rawText

      inFlightRef.current = true
      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        // 1. Check for voice commands first (zero-network when rules, conservative)
        const cmdRes = await detectCommandApi({
          formId: currentFormIdRef.current,
          transcript: rawText,
          state: state.state,
          fieldId: currentField.id,
          signal,
        })

        if (cmdRes.command) {
          if (cmdRes.command === 'skip' || cmdRes.command === 'dont_know') {
            const nextRes = await fetchNextField({
              formId: currentFormIdRef.current,
              answers: state.answers,
              currentId: currentField.id,
              signal,
            })
            let summary = null
            const isFinished = !nextRes.next
            if (isFinished || state.editingFromReview) {
              const summaryRes = await fetchSummary({
                formId: currentFormIdRef.current,
                answers: state.answers,
                lang: 'ta',
                signal,
              })
              summary = summaryRes.summary
            }
            dispatch({
              type: 'EXECUTE_COMMAND',
              payload: {
                command: cmdRes.command,
                payload: {
                  nextField: nextRes.next,
                  progress: nextRes.progress,
                  isFinished,
                  summary,
                },
              },
            })
            return
          }

          dispatch({
            type: 'EXECUTE_COMMAND',
            payload: {
              command: cmdRes.command,
              target: cmdRes.target,
              ambiguous: cmdRes.ambiguous,
              candidates: cmdRes.candidates,
            },
          })
          return
        }

        // 2. Check for in-answer partial & digit corrections on numbers
        const currentValue = state.answers[currentField.id]?.value
        if (currentValue) {
          const partialRes = await submitPartialCorrection({
            formId: currentFormIdRef.current,
            currentValue,
            fieldId: currentField.id,
            transcript: rawText,
            signal,
          })

          if (partialRes.handled && partialRes.value !== null) {
            const nextRes = await fetchNextField({
              formId: currentFormIdRef.current,
              answers: {
                ...state.answers,
                [currentField.id]: { value: partialRes.value },
              },
              currentId: currentField.id,
              signal,
            })

            dispatch({
              type: 'ANSWER_VALID',
              payload: {
                fieldId: currentField.id,
                value: partialRes.value,
                display: String(partialRes.value),
                nextField: nextRes.next,
                progress: nextRes.progress,
                isFinished: !nextRes.next,
                summary: null,
                shouldConfirm: true, // Always confirm partial/digit corrections!
                readbackText: `${currentField.labels?.ta || currentField.id}: ${partialRes.value}. சரியா?`,
              },
            })
            return
          }
        }

        const answerRes = await submitAnswer({
          formId: currentFormIdRef.current,
          fieldId: currentField.id,
          transcript: cleanText,
          context: { spellMode: Boolean(state.isSpellMode) },
          signal,
        })

        if (answerRes.partial) {
          dispatch({
            type: 'ANSWER_PARTIAL',
            payload: {
              fieldId: currentField.id,
              partialDigits: answerRes.have ? cleanText : null,
              prompt: answerRes.prompt,
            },
          })
          return
        }

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
            confirmed: !answerRes.shouldConfirm,
            attempts: (state.answers[currentField.id]?.attempts || 0) + 1,
          },
        }

        const nextRes = await fetchNextField({
          formId: currentFormIdRef.current,
          answers: updatedAnswers,
          currentId: currentField.id,
          signal,
        })

        let summary = null
        const isFinished = !nextRes.next

        if (isFinished || state.editingFromReview) {
          const summaryRes = await fetchSummary({
            formId: currentFormIdRef.current,
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
            shouldConfirm: answerRes.shouldConfirm,
            readbackText: answerRes.readbackText,
            readbackParts: answerRes.readbackParts,
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
    [state.currentField, state.answers, state.isSpellMode, state.partialDigits, state.editingFromReview]
  )

  // Start recording audio for standard question
  const startListening = useCallback(async () => {
    if (state.state !== STATES.LISTENING || isRecordingRef.current) return
    stopAudio()

    try {
      isRecordingRef.current = true
      dispatch({ type: 'START_RECORDING' })

      await startRecording({
        onVolume: (lvl) => setAudioLevel(lvl),
        onAutoStop: async (wavBlob) => {
          isRecordingRef.current = false
          setAudioLevel(0)
          dispatch({ type: 'RECORDING_STOPPED' })
          await handleAudioTranscription(wavBlob)
        },
      })
    } catch (err) {
      isRecordingRef.current = false
      setAudioLevel(0)
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

  // Stop recording for standard question
  const stopListening = useCallback(async () => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    setAudioLevel(0)
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

  // Start recording audio for confirmation (short 6s auto-stop)
  const startListeningConfirm = useCallback(async () => {
    if (state.state !== STATES.LISTENING_CONFIRM || isRecordingRef.current) return
    stopAudio()

    try {
      isRecordingRef.current = true
      dispatch({ type: 'START_CONFIRM_RECORDING' })

      // Auto-stop at 6 seconds for confirmation yes/no
      const autoStopTimer = setTimeout(async () => {
        if (isRecordingRef.current) {
          await stopListeningConfirm()
        }
      }, 6000)

      await startRecording({
        onVolume: (lvl) => setAudioLevel(lvl),
        onAutoStop: async (wavBlob) => {
          clearTimeout(autoStopTimer)
          isRecordingRef.current = false
          setAudioLevel(0)
          dispatch({ type: 'RECORDING_CONFIRM_STOPPED' })
          await handleConfirmTranscription(wavBlob)
        },
      })
    } catch (err) {
      isRecordingRef.current = false
      setAudioLevel(0)
      // Mic error in confirm fallback to unclear
      dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'unclear' } })
    }
  }, [state.state, stopAudio])

  // Stop recording for confirmation
  const stopListeningConfirm = useCallback(async () => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false
    setAudioLevel(0)
    dispatch({ type: 'RECORDING_CONFIRM_STOPPED' })

    try {
      const wavBlob = await stopRecording()
      await handleConfirmTranscription(wavBlob)
    } catch (err) {
      console.warn('Error stopping confirm recording:', err)
      dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'unclear' } })
    }
  }, [])

  // Send WAV blob for confirmation to transcribe & confirm-input route
  const handleConfirmTranscription = useCallback(
    async (wavBlob) => {
      inFlightRef.current = true
      try {
        abortControllerRef.current = new AbortController()
        const signal = abortControllerRef.current.signal

        const transcribeRes = await transcribeAudio(wavBlob, 'ta-IN', { signal })
        const text = (transcribeRes.text || '').trim()

        if (!text) {
          // Silence during confirmation counts as unclear, NEVER as "yes"
          dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'unclear' } })
          return
        }

        const fieldId = state.pendingConfirmation?.fieldId || state.currentFieldId

        // Check if user spoke an allowed confirmation-state command (repeat, help, operator)
        const cmdRes = await detectCommandApi({
          formId: currentFormIdRef.current,
          transcript: text,
          state: state.state,
          fieldId,
          signal,
        })

        if (cmdRes.command === 'repeat' || cmdRes.command === 'help' || cmdRes.command === 'operator') {
          dispatch({
            type: 'EXECUTE_COMMAND',
            payload: { command: cmdRes.command },
          })
          return
        }

        const confirmRes = await submitConfirm({
          formId: currentFormIdRef.current,
          fieldId,
          transcript: text,
          signal,
        })

        dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: confirmRes.answer } })
      } catch (err) {
        if (err.name === 'AbortError') return
        // On network error or silence during confirmation, treat strictly as unclear
        dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'unclear' } })
      } finally {
        inFlightRef.current = false
      }
    },
    [state.pendingConfirmation, state.currentFieldId, state.state]
  )

  // Accessibility & Fast Tap: On-screen Yes / No button tap
  const handleConfirmTap = useCallback(
    (answer) => {
      stopAudio()
      cancelRecording()
      const normalized = answer === 'yes' ? 'yes' : 'no'
      dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: normalized } })
    },
    [stopAudio, cancelRecording]
  )

  // Submit typed answer in test mode
  const submitTyped = useCallback(
    async (text) => {
      if (state.state !== STATES.LISTENING) return
      dispatch({ type: 'TYPED_SUBMIT' })
      await processTranscript(text)
    },
    [state.state, processTranscript]
  )

  // Submit typed confirmation in test mode
  const submitTypedConfirm = useCallback(
    async (text) => {
      if (state.state !== STATES.LISTENING_CONFIRM) return
      dispatch({ type: 'TYPED_CONFIRM_SUBMIT' })

      const raw = (text || '').trim().toLowerCase()
      if (raw === 'yes' || raw === 'ஆம்' || raw === 'aama') {
        dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'yes' } })
        return
      }
      if (raw === 'no' || raw === 'இல்லை' || raw === 'illa') {
        dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'no' } })
        return
      }

      const fieldId = state.pendingConfirmation?.fieldId || state.currentFieldId

      // Check if command was typed in confirmation state
      try {
        const cmdRes = await detectCommandApi({
          formId: currentFormIdRef.current,
          transcript: text,
          state: state.state,
          fieldId,
        })

        if (cmdRes.command === 'repeat' || cmdRes.command === 'help' || cmdRes.command === 'operator') {
          dispatch({
            type: 'EXECUTE_COMMAND',
            payload: { command: cmdRes.command },
          })
          return
        }

        const confirmRes = await submitConfirm({
          formId: currentFormIdRef.current,
          fieldId,
          transcript: text,
        })
        dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: confirmRes.answer } })
      } catch (_) {
        dispatch({ type: 'CONFIRM_ANSWER', payload: { answer: 'unclear' } })
      }
    },
    [state.state, state.pendingConfirmation, state.currentFieldId]
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
        formId: currentFormIdRef.current,
        answers: updatedAnswers,
        currentId: currentField.id,
        signal,
      })

      let summary = null
      const isFinished = !nextRes.next

      if (isFinished || state.editingFromReview) {
        const summaryRes = await fetchSummary({
          formId: currentFormIdRef.current,
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
  }, [state.state, state.currentField, state.answers, state.editingFromReview])

  // Tap-based Edit button from Review Screen
  const startEditField = useCallback(
    (fieldId) => {
      stopAudio()
      dispatch({ type: 'START_EDIT_FIELD', payload: { fieldId } })
    },
    [stopAudio]
  )

  // Final review confirmation: "Is everything correct?" -> Yes
  const confirmFullForm = useCallback(() => {
    stopAudio()
    dispatch({ type: 'CONFIRM_FULL_FORM' })
  }, [stopAudio])

  // Read everything to me (Full summary audio reader)
  const readFullSummary = useCallback(
    async ({ unconfirmedOnly = false } = {}) => {
      if (isPlayingRef.current) {
        stopAudio()
        return
      }

      summaryStopRef.current = false
      let summaryList = state.summary

      if (!summaryList && state.form) {
        const res = await fetchSummary({
          formId: currentFormIdRef.current,
          answers: state.answers,
          lang: 'ta',
        })
        summaryList = res.summary
      }

      if (!summaryList || summaryList.length === 0) return

      let itemsToRead = summaryList.filter((item) => item.spoken)
      if (unconfirmedOnly) {
        itemsToRead = itemsToRead.filter((item) => !item.confirmed)
      }

      // Calculate total characters to speak and cap at MAX_SUMMARY_CHARS
      let totalChars = 0
      const validatedItems = []
      for (const item of itemsToRead) {
        const line = `${item.label}: ${item.display}`
        if (totalChars + line.length > MAX_SUMMARY_CHARS) {
          console.warn(
            `[TTS Full Summary] Capped at MAX_SUMMARY_CHARS (${MAX_SUMMARY_CHARS}). Remaining fields omitted.`
          )
          break
        }
        totalChars += line.length
        validatedItems.push(item)
      }

      dispatch({
        type: 'SET_SUMMARY_READING',
        payload: {
          active: true,
          index: 0,
          total: validatedItems.length,
          unconfirmedOnly,
          estimatedChars: totalChars,
        },
      })

      // Speak field by field with natural pauses
      for (let i = 0; i < validatedItems.length; i++) {
        if (summaryStopRef.current) break

        const item = validatedItems[i]
        dispatch({
          type: 'SET_SUMMARY_READING',
          payload: {
            active: true,
            index: i,
            total: validatedItems.length,
            currentLabel: item.label,
            unconfirmedOnly,
            estimatedChars: totalChars,
          },
        })

        const phrase = `${item.label}: ${item.display}`
        await playClip(phrase, { sensitive: true, noCache: true, isReadback: true })

        // 600ms pause between fields
        if (i < validatedItems.length - 1 && !summaryStopRef.current) {
          await new Promise((res) => setTimeout(res, 600))
        }
      }

      dispatch({ type: 'SET_SUMMARY_READING', payload: null })
    },
    [state.summary, state.form, state.answers, playClip, stopAudio]
  )

  const stopSummary = useCallback(() => {
    summaryStopRef.current = true
    stopAudio()
    dispatch({ type: 'SET_SUMMARY_READING', payload: null })
  }, [stopAudio])

  const repeatQuestion = useCallback(() => {
    if (state.state !== STATES.LISTENING) return
    stopAudio()
    dispatch({ type: 'REPEAT_QUESTION' })
  }, [state.state, stopAudio])

  const setMode = useCallback((mode) => {
    dispatch({ type: 'SET_MODE', payload: mode })
  }, [])

  const setVoiceMuted = useCallback((muted) => {
    dispatch({ type: 'SET_VOICE_MUTED', payload: muted })
  }, [])

  const restart = useCallback(async () => {
    await stopAll()
    dispatch({ type: 'RESTART' })
  }, [stopAll])

  // Phase 12: Voice-guided change on review screen (short 8s recording)
  const speakChangeReview = useCallback(async () => {
    if (state.state !== STATES.REVIEW || isRecordingRef.current) return
    stopAudio()

    try {
      isRecordingRef.current = true
      await startRecording({
        maxSeconds: 8,
        onAutoStop: async (wavBlob) => {
          isRecordingRef.current = false
          inFlightRef.current = true
          try {
            abortControllerRef.current = new AbortController()
            const signal = abortControllerRef.current.signal
            const transcribeRes = await transcribeAudio(wavBlob, 'ta-IN', { signal })
            const text = (transcribeRes.text || '').trim()
            if (!text) return

            const cmdRes = await detectCommandApi({
              formId: currentFormIdRef.current,
              transcript: text,
              state: 'review',
              signal,
            })

            if (cmdRes.command === 'change_field') {
              dispatch({
                type: 'EXECUTE_COMMAND',
                payload: {
                  command: 'change_field',
                  target: cmdRes.target,
                  ambiguous: cmdRes.ambiguous,
                  candidates: cmdRes.candidates,
                },
              })
            } else if (cmdRes.command === 'start_over') {
              dispatch({
                type: 'EXECUTE_COMMAND',
                payload: { command: 'start_over' },
              })
            }
          } catch (err) {
            console.warn('Error during speakChangeReview:', err)
          } finally {
            inFlightRef.current = false
          }
        },
      })
    } catch (err) {
      isRecordingRef.current = false
      console.warn('Could not start review change recording:', err)
    }
  }, [state.state, stopAudio])

  const resumeFromPause = useCallback(() => {
    dispatch({ type: 'RESUME_FROM_PAUSE' })
  }, [])

  const confirmStartOver = useCallback((confirmYes) => {
    if (confirmYes) {
      dispatch({ type: 'CONFIRM_START_OVER_YES' })
    } else {
      dispatch({ type: 'CONFIRM_START_OVER_NO' })
    }
  }, [])

  const chooseTargetField = useCallback((fieldId) => {
    dispatch({ type: 'CHOOSE_TARGET_FIELD', payload: { fieldId } })
  }, [])

  const cancelChooseField = useCallback(() => {
    dispatch({ type: 'CANCEL_CHOOSE_FIELD' })
  }, [])

  const executeCommand = useCallback(
    async (command, options = {}) => {
      stopAudio()
      if (command === 'skip' || command === 'dont_know') {
        const currentField = state.currentField
        if (!currentField) return

        if (command === 'skip' && currentField.required) {
          dispatch({
            type: 'EXECUTE_COMMAND',
            payload: { command: 'skip' },
          })
          return
        }

        const nextRes = await fetchNextField({
          formId: currentFormIdRef.current,
          answers: state.answers,
          currentId: currentField.id,
        })
        let summary = null
        const isFinished = !nextRes.next
        if (isFinished || state.editingFromReview) {
          const summaryRes = await fetchSummary({
            formId: currentFormIdRef.current,
            answers: state.answers,
            lang: 'ta',
          })
          summary = summaryRes.summary
        }
        dispatch({
          type: 'EXECUTE_COMMAND',
          payload: {
            command,
            payload: {
              nextField: nextRes.next,
              progress: nextRes.progress,
              isFinished,
              summary,
            },
          },
        })
        return
      }

      dispatch({
        type: 'EXECUTE_COMMAND',
        payload: { command, ...options },
      })
    },
    [state.currentField, state.answers, state.editingFromReview, stopAudio]
  )

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
    pendingConfirmation: state.pendingConfirmation,
    showConfirmButtons: state.showConfirmButtons,
    summaryReading: state.summaryReading,
    audioLevel,
    start,
    startListening,
    stopListening,
    startListeningConfirm,
    stopListeningConfirm,
    handleConfirmTap,
    submitTyped,
    submitTypedConfirm,
    skipCurrentField,
    repeatQuestion,
    startEditField,
    confirmFullForm,
    readFullSummary,
    stopSummary,
    setMode,
    setVoiceMuted,
    restart,
    speakChangeReview,
    resumeFromPause,
    confirmStartOver,
    chooseTargetField,
    cancelChooseField,
    executeCommand,
  }
}
