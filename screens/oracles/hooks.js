/* eslint-disable no-continue */

import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useQuery, useQueryClient} from 'react-query'
import useSyncing from '../../shared/hooks/use-syncing'
import {useFailToast} from '../../shared/hooks/use-toast'
import {useAuthState} from '../../shared/providers/auth-context'
import {isVercelProduction} from '../../shared/utils/utils'
import {DeferredVoteType} from './types'
import {
  addDeferredVote,
  callContract,
  createContractDataReader,
  deleteDeferredVote,
  estimateCallContract,
  getDeferredVotes,
  updateDeferredVote,
} from './utils'

const REFETCH_INTERVAL = isVercelProduction ? 5 * 60 * 1000 : 30 * 1000

export function useDeferredVotes() {
  const queryClient = useQueryClient()
  const {coinbase, privateKey} = useAuthState()
  const failToast = useFailToast()
  const {t} = useTranslation()
  const router = useRouter()

  const {data: deferredVotes, isFetched} = useQuery(
    'useDeferredVotes',
    () => getDeferredVotes(coinbase),
    {
      enabled: !!coinbase,
      initialData: [],
    }
  )

  const {
    data: {currentBlock},
    isFetched: isBlockFetched,
  } = useSyncing({
    refetchIntervalInBackground: true,
    refetchInterval: REFETCH_INTERVAL,
    enabled: deferredVotes.length > 0,
  })

  const addVote = async vote => {
    await addDeferredVote({coinbase, ...vote})
    queryClient.invalidateQueries('useDeferredVotes')
  }

  const deleteVote = async id => {
    await deleteDeferredVote(id)
    queryClient.invalidateQueries('useDeferredVotes')
  }

  const estimateSendVote = async vote => {
    const voteData = {
      method: 'sendVote',
      contractHash: vote.contractHash,
      amount: vote.amount,
      args: vote.args,
    }

    return estimateCallContract(privateKey, voteData)
  }

  const sendVote = async vote => {
    function showError(message) {
      failToast(
        `${t('Can not send scheduled transaction:', {
          nsSeparator: '|',
        })} ${message}`
      )
    }

    async function canProlong(contractHash) {
      try {
        await estimateCallContract(privateKey, {
          method: 'prolongVoting',
          contractHash,
        })
        return true
      } catch (e) {
        return false
      }
    }

    try {
      const voteData = {
        method: 'sendVote',
        contractHash: vote.contractHash,
        amount: vote.amount,
        args: vote.args,
      }

      console.log(`sending deferred vote, contract: ${vote.contractHash}`)

      const {
        receipt: {gasCost, txFee},
      } = await estimateCallContract(privateKey, voteData)

      const voteResponse = await callContract(privateKey, {
        ...voteData,
        gasCost: Number(gasCost),
        txFee: Number(txFee),
      })

      await updateDeferredVote(vote.id, {
        type: DeferredVoteType.Success,
        txHash: voteResponse,
      })
      queryClient.invalidateQueries('useDeferredVotes')
    } catch (e) {
      switch (e.message) {
        case 'too early to accept open vote': {
          try {
            const readContractData = createContractDataReader(vote.contractHash)

            const startBlock = await readContractData('startBlock', 'uint64')
            const votingDuration = await readContractData(
              'votingDuration',
              'uint64'
            )

            const nextVoteBlock = startBlock + votingDuration

            if (nextVoteBlock > vote.block) {
              await updateDeferredVote(vote.id, {
                block: nextVoteBlock,
              })
              queryClient.invalidateQueries('useDeferredVotes')
            }
          } catch (err) {
            console.error(err)
          } finally {
            showError(e.message)
          }
          break
        }
        case 'too late to accept open vote':
        case 'quorum is not reachable': {
          if (await canProlong(vote.contractHash)) {
            failToast({
              title: t('Can not cast public vote. Please, prolong voting'),
              onAction: () => {
                router.push(`/oracles/view?id=${vote.contractHash}`)
              },
              actionContent: t('Open voting'),
            })
          } else {
            showError(e.message)
            deleteVote(vote.id)
          }
          break
        }
        case 'insufficient funds': {
          showError(e.message)
          break
        }
        default: {
          showError(e.message)
          deleteVote(vote.id)
        }
      }
    }
  }

  const available = deferredVotes.filter(x => x.block < currentBlock)

  return [
    {
      votes: available,
      all: deferredVotes,
      isReady: isFetched && isBlockFetched,
    },
    {addVote, sendVote, estimateSendVote, deleteVote},
  ]
}