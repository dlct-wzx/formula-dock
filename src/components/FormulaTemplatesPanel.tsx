import { useMemo, useState } from 'react'
import { ArrowUpRight, CornerDownLeft, Search } from 'lucide-react'
import {
  countTemplatesByCategory,
  formulaCategories,
  formulaTemplateCount,
  formulaTemplates,
  type FormulaTemplate,
} from '../data/formulaTemplates'
import { DisplayMath } from './MathMarkup'

interface FormulaTemplatesPanelProps {
  onInsert: (latex: string, cursorBack?: number) => void
}

export function FormulaTemplatesPanel({ onInsert }: FormulaTemplatesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState(formulaCategories[0].id)
  const [query, setQuery] = useState('')

  const normalisedQuery = query.trim().toLowerCase()
  const visibleTemplates = useMemo(() => {
    if (!normalisedQuery) {
      return formulaTemplates.filter((template) => template.category === selectedCategory)
    }
    return formulaTemplates.filter((template) => {
      const category = formulaCategories.find((item) => item.id === template.category)?.title || ''
      const haystack = `${template.title} ${template.description} ${template.tags.join(' ')} ${category}`.toLowerCase()
      return haystack.includes(normalisedQuery)
    })
  }, [normalisedQuery, selectedCategory])

  const activeCategory =
    formulaCategories.find((category) => category.id === selectedCategory) || formulaCategories[0]

  const insertTemplate = (template: FormulaTemplate) => {
    onInsert(template.latex, template.cursorBack)
  }

  return (
    <div className="tool-panel templates-panel">
      <div className="panel-search-row">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">搜索公式模板</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索公式名称、标签或描述"
          />
          {query && <kbd>{visibleTemplates.length}</kbd>}
        </label>
        <span className="panel-count">{formulaTemplateCount} 个模板</span>
      </div>

      <div className="template-category-scroller" role="tablist" aria-label="公式模板分类">
        {formulaCategories.map((category) => (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={selectedCategory === category.id && !normalisedQuery}
            className={`template-category-chip ${
              selectedCategory === category.id && !normalisedQuery ? 'is-active' : ''
            }`}
            onClick={() => {
              setSelectedCategory(category.id)
              setQuery('')
            }}
          >
            <span>{category.symbol}</span>
            {category.title}
            <em>{countTemplatesByCategory(category.id)}</em>
          </button>
        ))}
      </div>

      <div className="section-heading template-heading">
        <div>
          <span className="section-kicker">
            {normalisedQuery ? '全分类搜索' : '当前分类'}
          </span>
          <h3>{normalisedQuery ? `“${query.trim()}”` : activeCategory.title}</h3>
        </div>
        <span className="section-note">{activeCategory.description}</span>
      </div>

      {visibleTemplates.length > 0 ? (
        <div className="template-grid">
          {visibleTemplates.map((template) => {
            const category = formulaCategories.find((item) => item.id === template.category)
            return (
              <button
                key={template.id}
                type="button"
                className="template-card"
                onClick={() => insertTemplate(template)}
                aria-label={`插入公式模板：${template.title}`}
              >
                <span className="template-card__top">
                  <span className="template-card__category">
                    {category?.symbol} {category?.title}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
                <strong className="template-card__title">{template.title}</strong>
                <span className="template-card__preview">
                  <DisplayMath latex={template.latex} />
                </span>
                <span className="template-card__footer">
                  <span>{template.description}</span>
                  <span className="template-insert-cue">
                    <CornerDownLeft size={13} aria-hidden="true" />
                    插入
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={28} aria-hidden="true" />
          <h3>没有找到公式模板</h3>
          <p>换一个关键词，或从上方分类中浏览。</p>
        </div>
      )}
    </div>
  )
}
