/**
 * Solli Conversation Loop State Machine (Phase 11: Read-back & Confirmation)
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
 * listening            SKIP_FIELD              speakingQuestion | review
 * listening            REPEAT_QUESTION         speakingQuestion
 * listening            STOP                    idle
 * transcribing         TRANSCRIBE_SUCCESS      processing
 * transcribing         TRANSCRIBE_SILENCE      speakingHelp | speakingError
 * transcribing         FAIL                    error
 * processing           ANSWER_VALID (confirm)  speakingReadback
 * processing           ANSWER_VALID (no conf)  speakingQuestion | review
 * processing           ANSWER_SILENCE          speakingHelp | speakingError
 * processing           ANSWER_INVALID          speakingError
 * processing           ANSWER_PARTIAL          speakingHelp
 * processing           FAIL                    error
 * speakingReadback     AUDIO_PLAYED            listeningConfirm
 * speakingReadback     SKIP_AUDIO              listeningConfirm
 * speakingReadback     STOP                    idle
 * listeningConfirm     RECORDING_STOPPED       processingConfirm
 * listeningConfirm     CONFIRM_YES             speakingQuestion | review
 * listeningConfirm     CONFIRM_NO              speakingError (re-ask)
 * listeningConfirm     CONFIRM_UNCLEAR         speakingReadback | speakingError
 * listeningConfirm     STOP                    idle
 * processingConfirm    CONFIRM_YES             speakingQuestion | review
 * processingConfirm    CONFIRM_NO              speakingError (re-ask)
 * processingConfirm    CONFIRM_UNCLEAR         speakingReadback | speakingError
 * processingConfirm    FAIL                    error
 * speakingHelp         AUDIO_PLAYED            listening
 * speakingHelp         SKIP_AUDIO              listening
 * speakingHelp         STOP                    idle
 * speakingError        AUDIO_PLAYED_RETRY      listening
 * speakingError        AUDIO_PLAYED_ADVANCE    speakingQuestion | review
 * speakingError        SKIP_AUDIO_RETRY        listening
 * speakingError        SKIP_AUDIO_ADVANCE      speakingQuestion | review
 * speakingError        STOP                    idle
 * review               START_EDIT_FIELD        speakingQuestion
 * review               CONFIRM_FULL_FORM       readyForPdf
 * review               RESTART                 idle
 * readyForPdf          RESTART                 idle
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
  SPEAKING_READBACK: 'speakingReadback',
  LISTENING_CONFIRM: 'listeningConfirm',
  PROCESSING_CONFIRM: 'processingConfirm',
  SPEAKING_HELP: 'speakingHelp',
  SPEAKING_ERROR: 'speakingError',
  REVIEW: 'review',
  READY_FOR_PDF: 'readyForPdf',
  FINISHED: 'finished',
  ERROR: 'error',
}

export const MAX_ATTEMPTS_PER_FIELD = 2
export const MAX_CONFIRM_ROUNDS = 3

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
  sorryRetry: {
    ta: 'மன்னிக்கவும், மீண்டும் சொல்லுங்கள்.',
    taRoman: 'Mannikkavum, meendum sollungal.',
    en: 'Sorry, please say it again.',
  },
  sayYesOrNo: {
    ta: 'தயவுசெய்து ஆம் அல்லது இல்லை என்று சொல்லுங்கள்.',
    taRoman: 'Dayavuseidhu aam alladhu illai endru sollungal.',
    en: 'Please say yes or no.',
  },
  numberSmallerGroups: {
    ta: 'மன்னிக்கவும், எண்களை சிறிய குழுக்களாக மீண்டும் சொல்லுங்கள்.',
    taRoman: 'Mannikkavum, engalai siriya kuzhukkalaaga meendum sollungal.',
    en: 'Sorry, please say the digits in smaller groups.',
  },
  spellNameOffer: {
    ta: 'மன்னிக்கவும், எழுத்துக் கூட்டி ஒவ்வொரு எழுத்தாக சொல்லலாமா?',
    taRoman: 'Mannikkavum, ezhuthuk kootti ovvoru ezhuthaaga sollalaama?',
    en: 'Sorry, shall we spell the name letter by letter?',
  },
}

export function createInitialContext(options = {}) {
  return {
    state: STATES.IDLE,
    form: null,
    answers: {}, // { [fieldId]: { value, display, confirmed: false, attempts: number, needsOperatorHelp?: boolean, skipped?: boolean } }
    currentFieldId: null,
    currentField: null,
    progress: { done: 0, total: 0 },
    mode: options.mode || 'voice', // 'voice' | 'typed'
    voiceMuted: Boolean(options.voiceMuted),
    error: null, // { messageEn, messageTa, code, status }
    summary: null,
    activePromptText: null, // { ta, en }
    advanceAfterAudio: false,
    editingFromReview: false,
    showConfirmButtons: false,
    pendingConfirmation: null,
    summaryReading: null,
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
        pendingConfirmation: null,
        editingFromReview: false,
        showConfirmButtons: false,
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
        state: firstField ? STATES.SPEAKING_QUESTION : STATES.REVIEW,
        activePromptText: firstField?.question || null,
      }
    }

    case 'SPEAKING_QUESTION': {
      if (
        state.state !== STATES.PROCESSING &&
        state.state !== STATES.SPEAKING_ERROR &&
        state.state !== STATES.LISTENING &&
        state.state !== STATES.PROCESSING_CONFIRM &&
        state.state !== STATES.REVIEW
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

      if (state.state === STATES.SPEAKING_READBACK) {
        return {
          ...state,
          state: STATES.LISTENING_CONFIRM,
          showConfirmButtons: true, // Always show large Yes/No buttons during confirmation
        }
      }

      if (state.state === STATES.SPEAKING_ERROR) {
        if (state.advanceAfterAudio) {
          // If advancing after max attempts or max confirmation rounds
          const { nextField, progress, isFinished, summary } = action.payload || {}
          if (state.editingFromReview || isFinished || !nextField) {
            return {
              ...state,
              state: STATES.REVIEW,
              currentField: null,
              currentFieldId: null,
              editingFromReview: false,
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
      return state
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
      const {
        fieldId,
        value,
        display,
        nextField,
        progress,
        isFinished,
        summary,
        latencyMs,
        shouldConfirm,
        readbackText,
        readbackParts,
      } = action.payload

      const currentAttempts = (state.answers[fieldId]?.attempts || 0) + 1

      // If confirmation is required, transition to speakingReadback
      if (shouldConfirm) {
        return {
          ...state,
          state: STATES.SPEAKING_READBACK,
          showConfirmButtons: true, // Always show Yes/No buttons during confirmation
          activePromptText: {
            ta: readbackText || 'விவரத்தை சரிபார்க்கவும்.',
            en: readbackText || 'Please verify the details.',
          },
          pendingConfirmation: {
            fieldId,
            value,
            display: display || String(value),
            nextField,
            progress,
            isFinished,
            summary,
            confirmAttempts: 0,
            readbackText,
            readbackParts,
          },
          latency: {
            ...state.latency,
            extractMs: latencyMs || 0,
          },
        }
      }

      // No confirmation required: mark confirmed:true directly and advance
      const updatedAnswers = {
        ...state.answers,
        [fieldId]: {
          value,
          display: display || String(value),
          confirmed: true,
          attempts: currentAttempts,
          needsOperatorHelp: false,
        },
      }

      if (state.editingFromReview || isFinished || !nextField) {
        return {
          ...state,
          answers: updatedAnswers,
          currentField: null,
          currentFieldId: null,
          editingFromReview: false,
          progress: progress || state.progress,
          summary: summary || null,
          state: STATES.REVIEW,
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

    case 'START_CONFIRM_RECORDING': {
      if (state.state !== STATES.LISTENING_CONFIRM) return state
      return state
    }

    case 'RECORDING_CONFIRM_STOPPED': {
      if (state.state !== STATES.LISTENING_CONFIRM) return state
      return {
        ...state,
        state: STATES.PROCESSING_CONFIRM,
      }
    }

    case 'TYPED_CONFIRM_SUBMIT': {
      if (state.state !== STATES.LISTENING_CONFIRM) return state
      return {
        ...state,
        state: STATES.PROCESSING_CONFIRM,
      }
    }

    case 'CONFIRM_ANSWER': {
      if (
        state.state !== STATES.PROCESSING_CONFIRM &&
        state.state !== STATES.LISTENING_CONFIRM
      ) {
        return state
      }

      const { answer } = action.payload || {}
      const pending = state.pendingConfirmation
      if (!pending) return state

      const fieldId = pending.fieldId
      const currentField = state.currentField

      // YES: mark confirmed:true, advance to next field (or review)
      if (answer === 'yes') {
        const updatedAnswers = {
          ...state.answers,
          [fieldId]: {
            value: pending.value,
            display: pending.display,
            confirmed: true,
            attempts: (state.answers[fieldId]?.attempts || 0) + 1,
            confirmAttempts: pending.confirmAttempts,
            needsOperatorHelp: false,
          },
        }

        if (state.editingFromReview || pending.isFinished || !pending.nextField) {
          return {
            ...state,
            answers: updatedAnswers,
            currentField: null,
            currentFieldId: null,
            editingFromReview: false,
            pendingConfirmation: null,
            showConfirmButtons: false,
            progress: pending.progress || state.progress,
            summary: pending.summary || state.summary,
            state: STATES.REVIEW,
          }
        }

        return {
          ...state,
          answers: updatedAnswers,
          currentField: pending.nextField,
          currentFieldId: pending.nextField.id,
          progress: pending.progress || state.progress,
          pendingConfirmation: null,
          showConfirmButtons: false,
          state: STATES.SPEAKING_QUESTION,
          activePromptText: pending.nextField.question,
        }
      }

      // NO: clear value, speak sorry line, re-ask same question
      if (answer === 'no') {
        const newAttempts = (state.answers[fieldId]?.attempts || 0) + 1
        const updatedAnswers = {
          ...state.answers,
          [fieldId]: {
            value: null,
            display: null,
            confirmed: false,
            attempts: newAttempts,
            needsOperatorHelp: false,
          },
        }

        // Adaptive re-ask prompt
        let retryPrompt = RETRY_PROMPTS.sorryRetry
        let isSpellMode = false
        if (currentField?.type === 'name' && newAttempts >= 1) {
          retryPrompt = RETRY_PROMPTS.spellNameOffer
          isSpellMode = true
        } else if (
          currentField?.type === 'phone' ||
          currentField?.type === 'aadhaar' ||
          currentField?.type === 'bank_account'
        ) {
          retryPrompt = RETRY_PROMPTS.numberSmallerGroups
        }

        return {
          ...state,
          answers: updatedAnswers,
          pendingConfirmation: null,
          showConfirmButtons: false,
          isSpellMode,
          state: STATES.SPEAKING_ERROR,
          advanceAfterAudio: false, // will return to LISTENING for same question
          activePromptText: retryPrompt,
        }
      }

      // UNCLEAR / SILENCE: re-ask "Please say yes or no" up to MAX_CONFIRM_ROUNDS
      const confirmRounds = (pending.confirmAttempts || 0) + 1

      if (confirmRounds >= MAX_CONFIRM_ROUNDS) {
        // Maximum 3 rounds per field -> move on and mark needsOperatorHelp.
        // Critical: unconfirmed sensitive value is NEVER marked confirmed!
        const updatedAnswers = {
          ...state.answers,
          [fieldId]: {
            value: pending.value,
            display: pending.display,
            confirmed: false,
            needsOperatorHelp: true,
            attempts: (state.answers[fieldId]?.attempts || 0) + 1,
            confirmAttempts: confirmRounds,
          },
        }

        const { nextField, progress, isFinished, summary } = pending
        const shouldGoToReview = state.editingFromReview || isFinished || !nextField

        return {
          ...state,
          answers: updatedAnswers,
          pendingConfirmation: null,
          showConfirmButtons: false,
          state: STATES.SPEAKING_ERROR,
          advanceAfterAudio: true,
          activePromptText: RETRY_PROMPTS.comeBackLater,
          payloadForAdvance: {
            nextField: shouldGoToReview ? null : nextField,
            progress,
            isFinished: shouldGoToReview,
            summary,
          },
        }
      }

      // First or second unclear answer -> ask once more
      return {
        ...state,
        state: STATES.SPEAKING_READBACK,
        showConfirmButtons: true, // After unclear answers, prominently show on-screen buttons
        activePromptText: RETRY_PROMPTS.sayYesOrNo,
        pendingConfirmation: {
          ...pending,
          confirmAttempts: confirmRounds,
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

      if (state.editingFromReview || isFinished || !nextField) {
        return {
          ...state,
          answers: updatedAnswers,
          currentField: null,
          currentFieldId: null,
          editingFromReview: false,
          progress: progress || state.progress,
          summary: summary || null,
          state: STATES.REVIEW,
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

    case 'START_EDIT_FIELD': {
      if (state.state !== STATES.REVIEW) return state
      const { fieldId } = action.payload
      const targetField = state.form?.fields?.find((f) => f.id === fieldId)
      if (!targetField) return state

      return {
        ...state,
        state: STATES.SPEAKING_QUESTION,
        currentField: targetField,
        currentFieldId: fieldId,
        editingFromReview: true,
        activePromptText: targetField.question,
      }
    }

    case 'CONFIRM_FULL_FORM': {
      if (state.state !== STATES.REVIEW) return state
      return {
        ...state,
        state: STATES.READY_FOR_PDF,
      }
    }

    case 'SET_SUMMARY_READING': {
      return {
        ...state,
        summaryReading: action.payload,
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
