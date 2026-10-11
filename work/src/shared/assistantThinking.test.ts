import { describe, expect, it } from 'vitest'
import { assistantThinkingOptions, assistantThinkingSelection, openAiThinkingRequest } from './assistantThinking'
import { latestAssistantMenuModels } from './assistantModels'
import { admittedModelCatalogMenu, flatModelCatalogMenu, LATEST_TEXT_MODEL_MENU_POLICY } from './flatModelCatalogMenu'

describe('discovered thinking choices', () => {
  it('keeps every discovered effort and independently newest family, including future releases', () => {
    const catalog = ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna', 'gpt-6-astra', 'gpt-5.6-terra'].flatMap(id => assistantThinkingOptions({ id, label: id }, [{reasoningEffort:'low'}, {reasoningEffort:'medium'}, {reasoningEffort:'ultra'}]))
    const latest = latestAssistantMenuModels(catalog)
    expect(latest.map(option => assistantThinkingSelection(option.id).model)).toEqual(['gpt-6.1-sol','gpt-6.1-sol','gpt-6.1-sol','gpt-6-luna','gpt-6-luna','gpt-6-luna','gpt-6-astra','gpt-6-astra','gpt-6-astra'])
    expect(latest.filter(option => option.id.startsWith('gpt-6.1-sol')).map(option => assistantThinkingSelection(option.id).effort)).toEqual(['low','medium','ultra'])
    const future = assistantThinkingOptions({id:'gpt-7-sol',label:'GPT7Sol'},[{reasoningEffort:'new_level'}])
    const refreshed = latestAssistantMenuModels([...catalog,...future])
    expect(refreshed.some(option => option.id.includes('gpt-6.1-sol'))).toBe(false)
    expect(refreshed.some(option => option.id === 'gpt-7-sol::thinking=new_level')).toBe(true)
    const providers = admittedModelCatalogMenu([{label:'OpenAI',options:latest.map(option=>({value:`openai::${option.id}`,label:option.label}))}])
    expect(flatModelCatalogMenu(providers,'',5,LATEST_TEXT_MODEL_MENU_POLICY).rows).toHaveLength(latest.length)
  })
  it('preserves provider-supplied thinking IDs and de-duplicates only snapshots of the same effort', () => {
    const ids=['gpt-6.1-sol-low','gpt-6.1-sol-high','gpt-6-sol-high','gpt-6-astra-ultra']
    expect(latestAssistantMenuModels(ids.map(id=>({id,label:id}))).map(option=>option.id)).toEqual(['gpt-6.1-sol-high','gpt-6.1-sol-low','gpt-6-astra-ultra'])
  })
  it('routes a choice to exact model plus effort and keeps old saved base IDs valid', () => {
    expect(openAiThinkingRequest('gpt-6.1-sol::thinking=high','Fictional shot')).toEqual({model:'gpt-6.1-sol',input:'Fictional shot',reasoning:{effort:'high'}})
    expect(openAiThinkingRequest('gpt-6.1-sol','Fictional shot')).toEqual({model:'gpt-6.1-sol',input:'Fictional shot'})
    expect(() => openAiThinkingRequest('gpt-6.1-sol::thinking=ultra','Fictional shot')).toThrow('not supported')
    expect(() => assistantThinkingSelection('gpt-6.1-sol::thinking=bad level')).toThrow('Invalid thinking')
    expect(assistantThinkingOptions({id:'exact',label:'Exact'},undefined)).toHaveLength(1)
  })
})
