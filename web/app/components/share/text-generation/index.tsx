'use client'
import type { FC } from 'react'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from 'classnames'
import { useBoolean, useClickAway } from 'ahooks'
import { XMarkIcon } from '@heroicons/react/24/outline'
import TabHeader from '../../base/tab-header'
import Button from '../../base/button'
import s from './style.module.css'
import RunBatch from './run-batch'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import ConfigScence from '@/app/components/share/text-generation/config-scence'
// import History from '@/app/components/share/text-generation/history'
import { fetchSavedMessage as doFetchSavedMessage, fetchAppInfo, fetchAppParams, removeMessage, saveMessage } from '@/service/share'
import type { SiteInfo } from '@/models/share'
import type { MoreLikeThisConfig, PromptConfig, SavedMessage } from '@/models/debug'
import AppIcon from '@/app/components/base/app-icon'
import { changeLanguage } from '@/i18n/i18next-config'
import Loading from '@/app/components/base/loading'
import { userInputsFormToPromptVariables } from '@/utils/model-config'
import Res from '@/app/components/share/text-generation/result'
import SavedItems from '@/app/components/app/text-generate/saved-items'
import type { InstalledApp } from '@/models/explore'
import { appDefaultIconBackground } from '@/config'
import Toast from '@/app/components/base/toast'

export type IMainProps = {
  isInstalledApp?: boolean
  installedAppInfo?: InstalledApp
}

const TextGeneration: FC<IMainProps> = ({
  isInstalledApp = false,
  installedAppInfo,
}) => {
  const { notify } = Toast

  const { t } = useTranslation()
  const media = useBreakpoints()
  const isPC = media === MediaType.pc
  const isTablet = media === MediaType.tablet
  const isMobile = media === MediaType.mobile

  const [currTab, setCurrTab] = useState<string>('batch')

  const [inputs, setInputs] = useState<Record<string, any>>({})
  const [query, setQuery] = useState('') // run once query content
  const [appId, setAppId] = useState<string>('')
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null)
  const [moreLikeThisConfig, setMoreLikeThisConfig] = useState<MoreLikeThisConfig | null>(null)

  const [savedMessages, setSavedMessages] = useState<SavedMessage[]>([])

  const fetchSavedMessage = async () => {
    const res: any = await doFetchSavedMessage(isInstalledApp, installedAppInfo?.id)
    setSavedMessages(res.data)
  }

  useEffect(() => {
    fetchSavedMessage()
  }, [])

  const handleSaveMessage = async (messageId: string) => {
    await saveMessage(messageId, isInstalledApp, installedAppInfo?.id)
    notify({ type: 'success', message: t('common.api.saved') })
    fetchSavedMessage()
  }

  const handleRemoveSavedMessage = async (messageId: string) => {
    await removeMessage(messageId, isInstalledApp, installedAppInfo?.id)
    notify({ type: 'success', message: t('common.api.remove') })
    fetchSavedMessage()
  }

  const logError = (message: string) => {
    notify({ type: 'error', message })
  }
  const [controlSend, setControlSend] = useState(0)
  const handleSend = () => {
    setControlSend(Date.now())
  }

  const handleRunBatch = () => {
    setControlSend(Date.now())
  }

  const fetchInitData = () => {
    return Promise.all([isInstalledApp
      ? {
        app_id: installedAppInfo?.id,
        site: {
          title: installedAppInfo?.app.name,
          prompt_public: false,
          copyright: '',
        },
        plan: 'basic',
      }
      : fetchAppInfo(), fetchAppParams(isInstalledApp, installedAppInfo?.id)])
  }

  useEffect(() => {
    (async () => {
      const [appData, appParams]: any = await fetchInitData()
      const { app_id: appId, site: siteInfo } = appData
      setAppId(appId)
      setSiteInfo(siteInfo as SiteInfo)
      changeLanguage(siteInfo.default_language)

      const { user_input_form, more_like_this }: any = appParams
      const prompt_variables = userInputsFormToPromptVariables(user_input_form)
      setPromptConfig({
        prompt_template: '', // placeholder for feture
        prompt_variables,
      } as PromptConfig)
      setMoreLikeThisConfig(more_like_this)
    })()
  }, [])

  // Can Use metadata(https://beta.nextjs.org/docs/api-reference/metadata) to set title. But it only works in server side client.
  useEffect(() => {
    if (siteInfo?.title)
      document.title = `${siteInfo.title} - Powered by Dify`
  }, [siteInfo?.title])

  const [isShowResSidebar, { setTrue: showResSidebar, setFalse: hideResSidebar }] = useBoolean(false)
  const resRef = useRef<HTMLDivElement>(null)
  useClickAway(() => {
    hideResSidebar()
  }, resRef)

  const renderRes = (
    <div
      ref={resRef}
      className={
        cn(
          'flex flex-col h-full shrink-0',
          isPC ? 'px-10 py-8' : 'bg-gray-50',
          isTablet && 'p-6', isMobile && 'p-4')
      }
    >
      <>
        <div className='shrink-0 flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className={s.starIcon}></div>
            <div className='text-lg text-gray-800 font-semibold'>{t('share.generation.title')}</div>
          </div>
          {!isPC && (
            <div
              className='flex items-center justify-center cursor-pointer'
              onClick={hideResSidebar}
            >
              <XMarkIcon className='w-4 h-4 text-gray-800' />
            </div>
          )}
        </div>

        <div className='grow overflow-y-auto'>
          <Res
            isBatch={currTab === 'batch'}
            isPC={isPC}
            isMobile={isMobile}
            isInstalledApp={!!isInstalledApp}
            installedAppInfo={installedAppInfo}
            promptConfig={promptConfig}
            moreLikeThisEnabled={!!moreLikeThisConfig?.enabled}
            inputs={inputs}
            query={query}
            controlSend={controlSend}
            onShowRes={showResSidebar}
            handleSaveMessage={handleSaveMessage}
          />
        </div>
      </>
    </div>
  )

  if (!appId || !siteInfo || !promptConfig)
    return <Loading type='app' />

  return (
    <>
      <div className={cn(
        isPC && 'flex',
        isInstalledApp ? s.installedApp : 'h-screen',
        'bg-gray-50',
      )}>
        {/* Left */}
        <div className={cn(
          isPC ? 'w-[600px] max-w-[50%] p-8' : 'p-4',
          isInstalledApp && 'rounded-l-2xl',
          'shrink-0 relative flex flex-col pb-10 h-full border-r border-gray-100 bg-white',
        )}>
          <div className='mb-6'>
            <div className='flex justify-between items-center'>
              <div className='flex items-center space-x-3'>
                <AppIcon size="small" icon={siteInfo.icon} background={siteInfo.icon_background || appDefaultIconBackground} />
                <div className='text-lg text-gray-800 font-semibold'>{siteInfo.title}</div>
              </div>
              {!isPC && (
                <Button
                  className='shrink-0 !h-8 !px-3 ml-2'
                  onClick={showResSidebar}
                >
                  <div className='flex items-center space-x-2 text-primary-600 text-[13px] font-medium'>
                    <div className={s.starIcon}></div>
                    <span>{t('share.generation.title')}</span>
                  </div>
                </Button>
              )}
            </div>
            {siteInfo.description && (
              <div className='mt-2 text-xs text-gray-500'>{siteInfo.description}</div>
            )}
          </div>
          <TabHeader
            items={[
              { id: 'create', name: t('share.generation.tabs.create') },
              { id: 'batch', name: t('share.generation.tabs.batch') },
              {
                id: 'saved',
                name: t('share.generation.tabs.saved'),
                isRight: true,
                extra: savedMessages.length > 0
                  ? (
                    <div className='ml-1 flext items-center h-5 px-1.5 rounded-md border border-gray-200 text-gray-500 text-xs font-medium'>
                      {savedMessages.length}
                    </div>
                  )
                  : null,
              },
            ]}
            value={currTab}
            onChange={setCurrTab}
          />
          <div className='grow h-20 overflow-y-auto'>
            {currTab === 'create' && (
              <ConfigScence
                siteInfo={siteInfo}
                inputs={inputs}
                onInputsChange={setInputs}
                promptConfig={promptConfig}
                query={query}
                onQueryChange={setQuery}
                onSend={handleSend}
              />
            )}
            {currTab === 'batch' && (
              <RunBatch
                vars={promptConfig.prompt_variables}
                onSend={handleRunBatch}
              />
            )}

            {currTab === 'saved' && (
              <SavedItems
                className='mt-4'
                list={savedMessages}
                onRemove={handleRemoveSavedMessage}
                onStartCreateContent={() => setCurrTab('create')}
              />
            )}
          </div>

          {/* copyright */}
          <div className={cn(
            isInstalledApp ? 'left-[248px]' : 'left-8',
            'fixed  bottom-4  flex space-x-2 text-gray-400 font-normal text-xs',
          )}>
            <div className="">© {siteInfo.copyright || siteInfo.title} {(new Date()).getFullYear()}</div>
            {siteInfo.privacy_policy && (
              <>
                <div>·</div>
                <div>{t('share.chat.privacyPolicyLeft')}
                  <a
                    className='text-gray-500'
                    href={siteInfo.privacy_policy}
                    target='_blank'>{t('share.chat.privacyPolicyMiddle')}</a>
                  {t('share.chat.privacyPolicyRight')}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Result */}
        {isPC && (
          <div className='grow h-full'>
            {renderRes}
          </div>
        )}

        {(!isPC && isShowResSidebar) && (
          <div
            className={cn('fixed z-50 inset-0', isTablet ? 'pl-[128px]' : 'pl-6')}
            style={{
              background: 'rgba(35, 56, 118, 0.2)',
            }}
          >
            {renderRes}
          </div>
        )}
      </div>
    </>
  )
}

export default TextGeneration
