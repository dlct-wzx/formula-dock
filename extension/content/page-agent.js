'use strict'

;(() => {
  const VERSION = '0.1.1'
  const previous = window.__latexStudioPageAgentV1

  if (previous?.listener) {
    try {
      chrome.runtime.onMessage.removeListener(previous.listener)
    } catch {
      // The previous extension context may have been invalidated.
    }
  }

  const state = {
    target: null,
    selectionStart: 0,
    selectionEnd: 0,
    range: null,
  }

  const INPUT_TYPES = new Set(['text', 'search', 'tel', 'url', 'email'])

  function editableFromElement(element) {
    if (!(element instanceof Element)) return null
    if (element instanceof HTMLTextAreaElement) return element
    if (element instanceof HTMLInputElement) {
      return INPUT_TYPES.has(element.type.toLowerCase()) ? element : null
    }
    const host = element.closest('[contenteditable="true"], [contenteditable="plaintext-only"]')
    return host instanceof HTMLElement && !host.closest('[contenteditable="false"]') ? host : null
  }

  function selectionRangeInside(target) {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    return target.contains(range.commonAncestorContainer) ? range.cloneRange() : null
  }

  function captureTarget(candidate) {
    const target = editableFromElement(candidate || document.activeElement)
    if (!target) return

    state.target = target
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      state.selectionStart = target.selectionStart ?? target.value.length
      state.selectionEnd = target.selectionEnd ?? state.selectionStart
      state.range = null
      return
    }

    state.range = selectionRangeInside(target)
  }

  function captureSelection() {
    const target = editableFromElement(document.activeElement) || state.target
    if (!target || !target.isConnected) return
    state.target = target
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      state.selectionStart = target.selectionStart ?? target.value.length
      state.selectionEnd = target.selectionEnd ?? state.selectionStart
      return
    }
    const range = selectionRangeInside(target)
    if (range) state.range = range
  }

  function dispatchInput(target, text) {
    try {
      target.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          cancelable: false,
          inputType: 'insertText',
          data: text,
        }),
      )
    } catch {
      target.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }))
    }
  }

  function insertIntoTextControl(target, text) {
    target.focus({ preventScroll: true })
    const max = target.value.length
    const start = Math.max(0, Math.min(state.selectionStart ?? max, max))
    const end = Math.max(start, Math.min(state.selectionEnd ?? start, max))
    target.setSelectionRange(start, end)
    target.setRangeText(text, start, end, 'end')
    dispatchInput(target, text)
    state.selectionStart = target.selectionStart ?? start + text.length
    state.selectionEnd = target.selectionEnd ?? state.selectionStart
    return target instanceof HTMLTextAreaElement ? 'textarea' : 'input'
  }

  function insertIntoContentEditable(target, text) {
    target.focus({ preventScroll: true })
    const selection = window.getSelection()
    if (!selection) throw new Error('当前网页不支持文本选区。')

    if (
      state.range &&
      target.contains(state.range.commonAncestorContainer) &&
      state.range.startContainer.isConnected
    ) {
      selection.removeAllRanges()
      selection.addRange(state.range)
    } else {
      const fallback = document.createRange()
      fallback.selectNodeContents(target)
      fallback.collapse(false)
      selection.removeAllRanges()
      selection.addRange(fallback)
    }

    let inserted = false
    try {
      inserted = document.execCommand('insertText', false, text)
    } catch {
      inserted = false
    }

    if (!inserted) {
      const range = selection.rangeCount ? selection.getRangeAt(0) : null
      if (!range) throw new Error('没有可用的插入光标。')
      range.deleteContents()
      const node = document.createTextNode(text)
      range.insertNode(node)
      range.setStartAfter(node)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      dispatchInput(target, text)
    }

    const nextRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null
    if (nextRange) state.range = nextRange
    return 'contenteditable'
  }

  function insertText(text) {
    const target = state.target?.isConnected
      ? state.target
      : editableFromElement(document.activeElement)

    if (!target) {
      return {
        ok: false,
        message: '请先在网页的输入框或编辑区放置光标，再点击“插入网页”。',
      }
    }

    const mode =
      target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
        ? insertIntoTextControl(target, text)
        : insertIntoContentEditable(target, text)

    return {
      ok: true,
      message: mode === 'contenteditable' ? '公式已插入当前网页编辑区。' : '公式已插入当前网页输入框。',
      target: mode,
    }
  }

  const listener = (message, _sender, sendResponse) => {
    if (message?.type === 'LATEX_STUDIO_PING') {
      sendResponse({ ok: true, version: VERSION })
      return false
    }
    if (message?.type === 'LATEX_STUDIO_INSERT_TEXT') {
      try {
        sendResponse(insertText(String(message.text || '')))
      } catch (error) {
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : '插入当前网页失败。',
        })
      }
      return false
    }
    return false
  }

  window.__latexStudioPageAgentV1 = { version: VERSION, listener }
  document.addEventListener('focusin', (event) => captureTarget(event.target), true)
  document.addEventListener('mousedown', (event) => captureTarget(event.target), true)
  document.addEventListener('selectionchange', captureSelection, true)
  captureTarget(document.activeElement)
})()
