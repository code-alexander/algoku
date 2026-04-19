import { AlgorandClient } from "@algorandfoundation/algokit-utils"

import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from "@/utils/network/getAlgoClientConfigs"

export const algorand = AlgorandClient.fromConfig({
  algodConfig: getAlgodConfigFromViteEnvironment(),
  indexerConfig: getIndexerConfigFromViteEnvironment(),
})
