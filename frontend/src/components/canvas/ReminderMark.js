import { Mark } from '@tiptap/core'

/**
 * ReminderMark - A TipTap extension for reminder spans
 * Preserves data-reminder-id attribute and applies reminder-tag class
 */
const ReminderMark = Mark.create({
  name: 'reminderMark',

  addAttributes() {
    return {
      'data-reminder-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-reminder-id'),
        renderHTML: attributes => {
          if (!attributes['data-reminder-id']) {
            return {}
          }
          return {
            'data-reminder-id': attributes['data-reminder-id'],
            class: 'reminder-tag',
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-reminder-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'reminder-tag' }, 0]
  },
})

export default ReminderMark
