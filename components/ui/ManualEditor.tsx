'use client'

import { useState, useEffect } from 'react'
import { 
  BoldIcon, 
  ItalicIcon, 
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'

interface ManualSection {
  id: string
  title: string
  content: string
  order: number
}

interface Manual {
  id?: string
  casino_id: string
  version: number
  sections: ManualSection[]
  is_published: boolean
  created_by: string
  created_at?: string
}

interface ManualEditorProps {
  manual?: Manual | null
  casinoId: string
  onSave: (manual: Partial<Manual>) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

export default function ManualEditor({ 
  manual, 
  casinoId, 
  onSave, 
  onCancel, 
  saving 
}: ManualEditorProps) {
  const [sections, setSections] = useState<ManualSection[]>([
    { id: '1', title: 'Регистрация', content: '', order: 1 },
    { id: '2', title: 'Депозит', content: '', order: 2 },
    { id: '3', title: 'Требования по отыгрышу', content: '', order: 3 },
    { id: '4', title: 'Процесс вывода', content: '', order: 4 },
    { id: '5', title: 'Особенности и предупреждения', content: '', order: 5 }
  ])
  const [activeSection, setActiveSection] = useState(0)
  const [isPublished, setIsPublished] = useState(false)

  useEffect(() => {
    if (manual) {
      setSections(manual.sections || sections)
      setIsPublished(manual.is_published)
    }
  }, [manual])

  function updateSectionContent(sectionIndex: number, content: string) {
    const updatedSections = [...sections]
    updatedSections[sectionIndex].content = content
    setSections(updatedSections)
  }

  function addSection() {
    const newSection: ManualSection = {
      id: Date.now().toString(),
      title: 'Новый раздел',
      content: '',
      order: sections.length + 1
    }
    setSections([...sections, newSection])
  }

  function removeSection(sectionIndex: number) {
    if (sections.length <= 1) return
    const updatedSections = sections.filter((_, index) => index !== sectionIndex)
    setSections(updatedSections)
    if (activeSection >= updatedSections.length) {
      setActiveSection(updatedSections.length - 1)
    }
  }

  function updateSectionTitle(sectionIndex: number, title: string) {
    const updatedSections = [...sections]
    updatedSections[sectionIndex].title = title
    setSections(updatedSections)
  }

  async function handleSave() {
    const manualData = {
      casino_id: casinoId,
      sections,
      is_published: isPublished,
      version: (manual?.version || 0) + 1
    }
    
    await onSave(manualData)
  }

  function insertFormatting(format: string) {
    // Простая реализация форматирования
    const textarea = document.getElementById(`section-content-${activeSection}`) as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    
    let formattedText = ''
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'underline':
        formattedText = `__${selectedText}__`
        break
      case 'bullet':
        formattedText = `\n• ${selectedText}`
        break
      case 'number':
        formattedText = `\n1. ${selectedText}`
        break
      default:
        formattedText = selectedText
    }

    const newContent = 
      textarea.value.substring(0, start) + 
      formattedText + 
      textarea.value.substring(end)
    
    updateSectionContent(activeSection, newContent)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Редактор мануала
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Версия {(manual?.version || 0) + 1}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Опубликовать</span>
            </label>
            
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Отмена
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить мануал'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-96">
        {/* Sidebar с разделами */}
        <div className="w-1/4 border-r border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Разделы</h3>
            <button
              onClick={addSection}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + Добавить
            </button>
          </div>
          
          <div className="space-y-2">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  activeSection === index 
                    ? 'bg-blue-100 border border-blue-300' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection(index)}
              >
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSectionTitle(index, e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                />
                {sections.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSection(index)
                    }}
                    className="text-red-500 hover:text-red-700 text-xs mt-1"
                  >
                    Удалить
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => insertFormatting('bold')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Жирный"
              >
                <BoldIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertFormatting('italic')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Курсив"
              >
                <ItalicIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertFormatting('underline')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Подчеркивание"
              >
                <UnderlineIcon className="h-4 w-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <button
                onClick={() => insertFormatting('bullet')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Маркированный список"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => insertFormatting('number')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                title="Нумерованный список"
              >
                <NumberedListIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content Editor */}
          <div className="flex-1 p-4">
            <h3 className="font-medium text-gray-900 mb-3">
              {sections[activeSection]?.title}
            </h3>
            
            <textarea
              id={`section-content-${activeSection}`}
              value={sections[activeSection]?.content || ''}
              onChange={(e) => updateSectionContent(activeSection, e.target.value)}
              className="w-full h-full border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите содержимое раздела..."
            />
          </div>
        </div>
      </div>

      {/* Footer с подсказками */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <strong>Форматирование:</strong> **жирный**, *курсив*, __подчеркивание__, • список, 1. нумерация
        </div>
      </div>
    </div>
  )
}
