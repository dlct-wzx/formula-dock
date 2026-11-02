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
import { HoverPanel, useHoverFlyout } from './HoverPanel'
import { useI18n } from '../i18n/I18nContext'
import { localisedFormulaCategory, localisedFormulaTemplate } from '../i18n/content'

interface FormulaTemplatesPanelProps {
  onInsert: (latex: string, cursorBack?: number) => void
}

export function FormulaTemplatesPanel({ onInsert }: FormulaTemplatesPanelProps) {
  const { locale, t } = useI18n()
  const flyout = useHoverFlyout<HTMLButtonElement>()
  const [selectedCategory, setSelectedCategory] = useState(formulaCategories[0].id)
  const [query, setQuery] = useState('')

  const normalisedQuery = query.trim().toLowerCase()
  const visibleTemplates = useMemo(() => {
    if (!normalisedQuery) {
      return formulaTemplates.filter((template) => template.category === selectedCategory)
    }
    return formulaTemplates.filter((template) => {
      const category = formulaCategories.find((item) => item.id === template.category)
      const localisedCategory = category ? localisedFormulaCategory(category, locale) : null
      const localisedTemplate = localisedFormulaTemplate(template, locale)
      const haystack =
        `${template.title} ${template.description} ${template.tags.join(' ')} ${category?.title || ''} ${localisedTemplate.title} ${localisedTemplate.description} ${localisedCategory?.title || ''}`.toLowerCase()
      return haystack.includes(normalisedQuery)
    })
  }, [locale, normalisedQuery, selectedCategory])

  const activeCategory =
    formulaCategories.find((category) => category.id === selectedCategory) || formulaCategories[0]
  const localisedActiveCategory = localisedFormulaCategory(activeCategory, locale)
  const flyoutCategory = formulaCategories.find((category) => category.id === flyout.activeKey)
  const flyoutTemplates = flyoutCategory
    ? formulaTemplates.filter((template) => template.category === flyoutCategory.id)
    : []

  const insertTemplate = (template: FormulaTemplate) => {
    onInsert(template.latex, template.cursorBack)
  }

  return (
    <div className="tool-panel templates-panel">
      <div className="panel-search-row">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{t('templates.searchAria')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('templates.searchPlaceholder')}
          />
          {query && <kbd>{visibleTemplates.length}</kbd>}
        </label>
        <span className="panel-count">
          {t('templates.count', { count: formulaTemplateCount })}
        </span>
      </div>

      <div className="template-category-scroller" role="tablist" aria-label={t('templates.categoriesAria')}>
        {formulaCategories.map((category) => {
          const localisedCategory = localisedFormulaCategory(category, locale)
          return (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={selectedCategory === category.id && !normalisedQuery}
              className={`template-category-chip ${
                selectedCategory === category.id && !normalisedQuery ? 'is-active' : ''
              }`}
              onClick={() => {
                flyout.closeNow()
                setSelectedCategory(category.id)
                setQuery('')
              }}
              onMouseEnter={(event) => flyout.open(category.id, event.currentTarget)}
              onMouseLeave={() => flyout.scheduleClose()}
              aria-haspopup="dialog"
            >
              <span>{category.symbol}</span>
              {localisedCategory.title}
              <em>{countTemplatesByCategory(category.id)}</em>
            </button>
          )
        })}
      </div>

      <div className="section-heading template-heading">
        <div>
          <span className="section-kicker">
            {normalisedQuery ? t('templates.searchAll') : t('templates.current')}
          </span>
          <h3>{normalisedQuery ? `“${query.trim()}”` : localisedActiveCategory.title}</h3>
        </div>
        <span className="section-note">{localisedActiveCategory.description}</span>
      </div>

      {visibleTemplates.length > 0 ? (
        <div className="template-grid">
          {visibleTemplates.map((template) => {
            const category = formulaCategories.find((item) => item.id === template.category)
            const localisedCategory = category ? localisedFormulaCategory(category, locale) : null
            const localisedTemplate = localisedFormulaTemplate(template, locale)
            return (
              <button
                key={template.id}
                type="button"
                className="template-card"
                onClick={() => insertTemplate(template)}
                aria-label={t('templates.insertAria', { title: localisedTemplate.title })}
              >
                <span className="template-card__top">
                  <span className="template-card__category">
                    {category?.symbol} {localisedCategory?.title}
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
                <strong className="template-card__title">{localisedTemplate.title}</strong>
                <span className="template-card__preview">
                  <DisplayMath latex={template.latex} />
                </span>
                <span className="template-card__footer">
                  <span>{localisedTemplate.description}</span>
                  <span className="template-insert-cue">
                    <CornerDownLeft size={13} aria-hidden="true" />
                    {t('templates.insert')}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Search size={28} aria-hidden="true" />
          <h3>{t('templates.noResults')}</h3>
          <p>{t('templates.noResultsHint')}</p>
        </div>
      )}

      {flyoutCategory && (
        <HoverPanel
          open
          anchor={flyout.anchor}
          className="template-hover-panel"
          preferredWidth={680}
          onMouseEnter={flyout.cancelClose}
          onMouseLeave={flyout.scheduleClose}
          onClose={flyout.closeNow}
        >
          <header className="hover-panel__header">
            <span className="hover-panel__symbol" aria-hidden="true">
              {flyoutCategory.symbol}
            </span>
            <div>
              <span className="hover-panel__kicker">{t('tabs.templates')}</span>
              <h3>{localisedFormulaCategory(flyoutCategory, locale).title}</h3>
              <p>{localisedFormulaCategory(flyoutCategory, locale).description}</p>
            </div>
            <span className="hover-panel__count">{flyoutTemplates.length}</span>
          </header>
          <div className="hover-panel__body template-hover-panel__body">
            {flyoutTemplates.map((template) => {
              const localisedTemplate = localisedFormulaTemplate(template, locale)
              return (
                <button
                  key={template.id}
                  type="button"
                  className="template-hover-card"
                  onClick={() => {
                    insertTemplate(template)
                    flyout.closeNow()
                  }}
                  tabIndex={-1}
                >
                  <strong>{localisedTemplate.title}</strong>
                  <span className="template-hover-card__preview">
                    <DisplayMath latex={template.latex} />
                  </span>
                  <small>{localisedTemplate.description}</small>
                </button>
              )
            })}
          </div>
          <footer className="hover-panel__footer">
            <CornerDownLeft size={14} aria-hidden="true" />
            {t('templates.insert')}
          </footer>
        </HoverPanel>
      )}
    </div>
  )
}
