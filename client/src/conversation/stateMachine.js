/**
 * Solli Conversation Loop State Machine
 *
 * Explicit Transition Table:
 *
 * FROM                 EVENT                   TO
 * -------------------------------------------------------------
 * idle                 START                   loadingForm
 * loadingForm          FORM_LOADED             speakingQuestion
 * loadingForm          FAIL                    error
 * speakingQuestion     AUDIO_PLAYED            listening
 * speakingQuestion     SKIP_AUDIO              listening
 * speakingQuestion     STOP                    idle
 * listening            RECORDING_STOPPED       transcribing
 * listening            TYPED_SUBMIT            processing
 * listening            SKIP_FIELD              speakingQuestion | finished
 * listening            REPEAT_QUESTION         speakingQuestion
 * listening            STOP                    idle
 * transcribing         TRANSCRIBE_SUCCESS      processing
 * transcribing         TRANSCRIBE_SILENCE      speakingHelp | speakingError
 * transcribing         FAIL                    error
 * processing           ANSWER_VALID            speakingQuestion | finished
 * processing           ANSWER_SILENCE          speakingHelp | speakingError
 * processing           ANSWER_INVALID          speakingError
 * processing           FAIL                    error
 * speakingHelp         AUDIO_PLAYED            listening
 * speakingHelp         SKIP_AUDIO              listening
 * speakingHelp         STOP                    idle
 * speakingError        AUDIO_PLAYED_RETRY      listening
 * speakingError        AUDIO_PLAYED_ADVANCE    speakingQuestion | finished
 * speakingError        SKIP_AUDIO_RETRY        listening
 * speakingError        SKIP_AUDIO_ADVANCE      speakingQuestion | finished
 * speakingError        STOP                    idle
 * finished             RESTART                 idle
 * error                RESTART                 idle
 * ANY                  RESET                   idle
 * ANY                  FATAL_ERROR             error
 */

export const STATES = {
  IDLE: 'idle',
  LOADING_FORM: 'loadingForm',
  SPEAKING_QUESTION: 'speakingQuestion',
  LISTENING: 'listening',
  TRANSCRIBING: 'transcribing',
  PROCESSING: 'processing',
  SPEAKING_HELP: 'speakingHelp',
  SPEAKING_ERROR: 'speakingError',
  FINISHED: 'finished',
  ERROR: 'error',
}

export const MAX_ATTEMPTS_PER_FIELD = 2

export const RETRY_PROMPTS = {
  comeBackLater: {
    ta: 'இதை அப்புறம் பார்க்கலாம். அடுத்த கேள்விக்கு செல்வோம்.',
    taRoman: 'Idhai appuram paarkalaam. Adutha kelvikku selvom.',
    en: 'Let us come back to this. Moving to the next question.',
  },
  silencePrompt: {
    ta: 'உங்கள் குரல் கேட்கவில்லை. மீண்டும் சொல்லுங்கள்.',
    taRoman: 'Ungal kural ketkavillai. Meendum sollungal.',
    en: 'Could not hear your voice clearly. Please say it again.',
  },
}

export function createInitialContext(options = {}) {
  return {
    state: STATES.IDLE,
    form: null,
    answers: {}, // { [fieldId]: { value, display, confirmed: false, attempts: number, needsOperatorHelp?: boolean } }
    currentFieldId: null,
    currentField: null,
    progress: { done: 0, total: 0 },
    mode: options.mode || 'voice', // 'voice' | 'typed'
    voiceMuted: Boolean(options.voiceMuted),
    error: null, // { messageEn, messageTa, code, status }
    summary: null,
    activePromptText: null, // { ta, en }
    advanceAfterAudio: false,
    latency: {
      ttsMs: 0,
      sttMs: 0,
      extractMs: 0,
    },
  }
}

/**
 * Pure reducer for conversation state transitions
 */
export function conversationReducer(state, action) {
  switch (action.type) {
    case 'START': {
      if (state.state !== STATES.IDLE && state.state !== STATES.ERROR) {
        return state
      }
      return {
        ...state,
        state: STATES.LOADING_FORM,
        error: null,
        answers: {},
        summary: null,
      }
    }

    case 'FORM_LOADED': {
      if (state.state !== STATES.LOADING_FORM) return state
      const { form, firstField, progress } = action.payload
      return {
        ...state,
        form,
        currentField: firstField,
        currentFieldId: firstField?.id || null,
        progress: progress || { done: 0, total: 12 },
        state: firstField ? STATES.SPEAKING_QUESTION : STATES.FINISHED,
        activePromptText: firstField?.question || null,
      }
    }

    case 'SPEAKING_QUESTION': {
      if (
        state.state !== STATES.PROCESSING &&
        state.state !== STATES.SPEAKING_ERROR &&
        state.state !== STATES.LISTENING
      ) {
        return state
      }
      return {
        ...state,
        state: STATES.SPEAKING_QUESTION,
        activePromptText: action.payload?.field?.question || state.currentField?.question || null,
      }
    }

    case 'AUDIO_ENDED':
    case 'SKIP_AUDIO': {
      if (
        state.state === STATES.SPEAKING_QUESTION ||
        state.state === STATES.SPEAKING_HELP
      ) {
        return {
          ...state,
          state: STATES.LISTENING,
        }
      }
      if (state.state === STATES.SPEAKING_ERROR) {
        if (state.advanceAfterAudio) {
          // If advancing after max attempts
          const { nextField, progress, isFinished, summary } = action.payload || {}
          if (isFinished || !nextField) {
            return {
              ...state,
              state: STATES.FINISHED,
              currentField: null,
              currentFieldId: null,
              summary: summary || state.summary,
              advanceAfterAudio: false,
            }
          }
          return {
            ...state,
            state: STATES.SPEAKING_QUESTION,
            currentField: nextField,
            currentFieldId: nextField.id,
            progress: progress || state.progress,
            activePromptText: nextField.question,
            advanceAfterAudio: false,
          }
        }
        // Retrying same question
        return {
          ...state,
          state: STATES.LISTENING,
          advanceAfterAudio: false,
        }
      }
      return state
    }

    case 'START_RECORDING': {
      if (state.state !== STATES.LISTENING) return state
      return state // Still in listening state while recorder is active
    }

    case 'RECORDING_STOPPED': {
      if (state.state !== STATES.LISTENING) return state
      return {
        ...state,
        state: STATES.TRANSCRIBING,
      }
    }

    case 'TRANSCRIBE_SUCCESS': {
      if (state.state !== STATES.TRANSCRIBING) return state
      return {
        ...state,
        state: STATES.PROCESSING,
        latency: {
          ...state.latency,
          sttMs: action.payload?.latencyMs || 0,
        },
      }
    }

    case 'TYPED_SUBMIT': {
      if (state.state !== STATES.LISTENING) return state
      return {
        ...state,
        state: STATES.PROCESSING,
      }
    }

    case 'ANSWER_VALID': {
      if (state.state !== STATES.PROCESSING) return state
      const { fieldId, value, display, nextField, progress, isFinished, summary, latencyMs } = action.payload
      const currentAttempts = (state.answers[fieldId]?.attempts || 0) + 1
      const updatedAnswers = {
        ...state.answers,
        [fieldId]: {
          value,
          display: display || String(value),
          confirmed: false,
          attempts: currentAttempts,
        },
      }

      if (isFinished || !nextField) {
        return {
          ...state,
          answers: updatedAnswers,
          currentField: null,
          currentFieldId: null,
          progress: progress || state.progress,
          summary: summary || null,
          state: STATES.FINISHED,
          latency: {
            ...state.latency,
            extractMs: latencyMs || 0,
          },
        }
      }

      return {
        ...state,
        answers: updatedAnswers,
        currentField: nextField,
        currentFieldId: nextField.id,
        progress: progress || state.progress,
        state: STATES.SPEAKING_QUESTION,
        activePromptText: nextField.question,
        latency: {
          ...state.latency,
          extractMs: latencyMs || 0,
        },
      }
    }

    case 'ANSWER_SILENCE': {
      if (state.state !== STATES.PROCESSING && state.state !== STATES.TRANSCRIBING) {
        return state
      }
      const fieldId = state.currentFieldId
      const currentAttempts = (state.answers[fieldId]?.attempts || 0) + 1

      if (currentAttempts >= MAX_ATTEMPTS_PER_FIELD) {
        // Max retries reached on silence -> mark needsOperatorHelp and advance
        return {
          ...state,
          state: STATES.SPEAKING_ERROR,
          advanceAfterAudio: true,
          activePromptText: RETRY_PROMPTS.comeBackLater,
          answers: {
            ...state.answers,
            [fieldId]: {
              value: null,
              display: '(Needs operator help)',
              confirmed: false,
              attempts: currentAttempts,
              needsOperatorHelp: true,
            },
          },
        }
      }

      // First silence attempt -> speak help prompt
      return {
        ...state,
        state: STATES.SPEAKING_HELP,
        activePromptText: state.currentField?.helpPrompt || RETRY_PROMPTS.silencePrompt,
        advanceAfterAudio: false,
        answers: {
          ...state.answers,
          [fieldId]: {
            ...(state.answers[fieldId] || {}),
            attempts: currentAttempts,
          },
        },
      }
    }

    case 'ANSWER_PARTIAL': {
      if (state.state !== STATES.PROCESSING) return state
      const { fieldId, partialDigits, prompt } = action.payload
      const currentAttempts = (state.answers[fieldId]?.attempts || 0) + 1

      if (currentAttempts >= 3) {
        return {
          ...state,
          state: STATES.SPEAKING_ERROR,
          advanceAfterAudio: true,
          activePromptText: RETRY_PROMPTS.comeBackLater,
          partialDigits: null,
          answers: {
            ...state.answers,
            [fieldId]: {
              value: null,
              display: '(Needs operator help)',
              confirmed: false,
              attempts: currentAttempts,
              needsOperatorHelp: true,
            },
          },
        }
      }

      return {
        ...state,
        state: STATES.SPEAKING_HELP,
        advanceAfterAudio: false,
        activePromptText: prompt || {
          en: 'Please continue saying the digits.',
          ta: 'மீதமுள்ள எண்களை சொல்லுங்கள்.',
        },
        partialDigits,
        answers: {
          ...state.answers,
          [fieldId]: {
            ...(state.answers[fieldId] || {}),
            attempts: currentAttempts,
            partialDigits,
          },
        },
      }
    }

    case 'ANSWER_INVALID': {
      if (state.state !== STATES.PROCESSING) return state
      const { fieldId, validationError, errorMessage } = action.payload
      const currentAttempts = (state.answers[fieldId]?.attempts || 0) + 1

      if (currentAttempts >= MAX_ATTEMPTS_PER_FIELD) {
        // Max retries reached -> move on and mark operator help
        return {
          ...state,
          state: STATES.SPEAKING_ERROR,
          advanceAfterAudio: true,
          activePromptText: RETRY_PROMPTS.comeBackLater,
          isSpellMode: false,
          partialDigits: null,
          answers: {
            ...state.answers,
            [fieldId]: {
              value: null,
              display: '(Needs operator help)',
              confirmed: false,
              attempts: currentAttempts,
              needsOperatorHelp: true,
              lastError: validationError,
            },
          },
        }
      }

      // First failure on name -> offer spell-out mode
      let errorText = errorMessage || state.currentField?.errorMessage || state.currentField?.helpPrompt
      let isSpellMode = false
      if (state.currentField?.type === 'name' && currentAttempts === 1) {
        isSpellMode = true
        errorText = {
          ta: 'எழுத்துக் கூட்டி சொல்லலாமா? ஒவ்வொரு எழுத்தாக சொல்லவும்.',
          en: 'Shall we spell it? Please say letter by letter.',
        }
      }

      return {
        ...state,
        state: STATES.SPEAKING_ERROR,
        advanceAfterAudio: false,
        activePromptText: errorText || RETRY_PROMPTS.silencePrompt,
        isSpellMode,
        answers: {
          ...state.answers,
          [fieldId]: {
            ...(state.answers[fieldId] || {}),
            attempts: currentAttempts,
            lastError: validationError,
            spellMode: isSpellMode,
          },
        },
      }
    }

    case 'SKIP_FIELD': {
      if (state.state !== STATES.LISTENING) return state
      const { fieldId, nextField, progress, isFinished, summary } = action.payload
      const updatedAnswers = {
        ...state.answers,
        [fieldId]: {
          value: null,
          display: '(Skipped)',
          confirmed: false,
          attempts: 0,
          skipped: true,
        },
      }

      if (isFinished || !nextField) {
        return {
          ...state,
          answers: updatedAnswers,
          currentField: null,
          currentFieldId: null,
          progress: progress || state.progress,
          summary: summary || null,
          state: STATES.FINISHED,
        }
      }

      return {
        ...state,
        answers: updatedAnswers,
        currentField: nextField,
        currentFieldId: nextField.id,
        progress: progress || state.progress,
        state: STATES.SPEAKING_QUESTION,
        activePromptText: nextField.question,
      }
    }

    case 'REPEAT_QUESTION': {
      if (state.state !== STATES.LISTENING) return state
      return {
        ...state,
        state: STATES.SPEAKING_QUESTION,
        activePromptText: state.currentField?.question || null,
      }
    }

    case 'SET_MODE': {
      const mode = action.payload === 'typed' ? 'typed' : 'voice'
      return { ...state, mode }
    }

    case 'SET_VOICE_MUTED': {
      return { ...state, voiceMuted: Boolean(action.payload) }
    }

    case 'STOP':
    case 'RESTART': {
      return {
        ...createInitialContext({ mode: state.mode, voiceMuted: state.voiceMuted }),
        state: STATES.IDLE,
      }
    }

    case 'FATAL_ERROR':
    case 'FAIL': {
      return {
        ...state,
        state: STATES.ERROR,
        error: {
          messageEn: action.payload?.messageEn || action.payload?.message || 'An unexpected error occurred.',
          messageTa: action.payload?.messageTa || 'எதிர்பாராத பிழை ஏற்பட்டது. பணியாளரின் உதவியை நாடவும்.',
          status: action.payload?.status || 500,
          code: action.payload?.code || 'UNKNOWN_ERROR',
        },
      }
    }

    default:
      return state
  }
}
